import { useEffect, useRef, useState, type JSX } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import Editor from '@monaco-editor/react';
import { Button } from '../components/ui/button';
import { Switch } from '@/components/ui/switch';
import FileTreeExplorer, { type FileNode } from '../components/common/FileTree';
import { createPath, deletePath, renamePath } from '@/services/files';
import { useSearchParams } from 'react-router';
import apiClient from '@/services/api';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import EditorTabs from '@/components/common/editor/EditorTabs';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

type EditorEnvironment = {
  projectId: string;
  workspacePath: string;
  profile: {
    name: string;
    entry: string;
    run: string;
    image: string;
  };
};

type Tab = {
  path: string;
  content: string;
  dirty: boolean;
  language: string;
};

const getLanguageFromPath = (path: string): string => {
  const parts = path.split('.');
  if (parts.length < 2) return 'plaintext';
  return (
    {
      js: 'javascript',
      ts: 'typescript',
      json: 'json',
      py: 'python',
      html: 'html',
      css: 'css',
    }[parts.pop()!] ?? 'plaintext'
  );
};

const CodeEditor = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const user = useAppSelector(selectUser);

  const [env, setEnv] = useState<EditorEnvironment | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(true);

  const socketRef = useRef<Socket | null>(null);

  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [ports, setPorts] = useState<number[]>([]);
  const [activePort, setActivePort] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const fsRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* =========================
     Socket lifecycle
  ========================= */

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_URL);
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* =========================
     Workspace Bootstrap
  ========================= */

  useEffect(() => {
    if (!user || !socketRef.current) return;

    const pid = searchParams.get('pid');
    const cp = searchParams.get('cp');
    if (!pid || !cp) return;

    let cancelled = false;

    const boot = async () => {
      const res = await apiClient.post('/editor/start', {
        profile: cp,
        projectId: pid,
      });

      if (cancelled) return;

      setEnv(res.data);
      terminalRef.current?.clear();

      socketRef.current!.emit('workspace:start', {
        userId: user.id,
        projectId: res.data.projectId,
        image: res.data.profile.image,
      });

      const onReady = async () => {
        socketRef.current!.emit('terminal:start');
        await loadTree(res.data.projectId);
      };

      socketRef.current!.on('workspace:ready', onReady);

      return () => {
        socketRef.current?.off('workspace:ready', onReady);
      };
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, [user]);

  /* =========================
     FS Watcher
  ========================= */

  useEffect(() => {
    if (!socketRef.current || !env) return;

    const handler = () => {
      if (fsRefreshTimer.current) {
        clearTimeout(fsRefreshTimer.current);
      }
      fsRefreshTimer.current = setTimeout(() => {
        loadTree(env.projectId);
      }, 500);
    };

    socketRef.current.on('workspace:fs:update', handler);
    return () => {
      socketRef.current?.off('workspace:fs:update', handler);
    };
  }, [env]);

  /* =========================
     Terminal Setup
  ========================= */

  useEffect(() => {
    if (!terminalContainerRef.current || !socketRef.current) return;

    const fitAddon = new FitAddon();
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      theme: { background: '#020617', foreground: '#e5e7eb' },
    });

    terminal.loadAddon(fitAddon);
    terminal.open(terminalContainerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const onData = (data: string) => {
      socketRef.current!.emit('terminal:input', data);
    };

    terminal.onData(onData);

    const onOutput = (data: string) => terminal.write(data);
    socketRef.current.on('terminal:output', onOutput);

    const observer = new ResizeObserver(() => fitAddon.fit());
    observer.observe(terminalContainerRef.current);

    return () => {
      observer.disconnect();
      socketRef.current?.off('terminal:output', onOutput);
      terminal.dispose();
    };
  }, []);

  /* =========================
     File System API
  ========================= */

  const loadTree = async (projectId: string) => {
    const res = await apiClient.get('/workspace/tree', {
      params: { userId: user!.id, projectId },
    });

    const newTree = res.data;
    setTree(newTree);

    const files = new Set<string>();
    const walk = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.type === 'file') files.add(n.path);
        if (n.children) walk(n.children);
      }
    };
    walk(newTree);

    setTabs((prev) => prev.filter((t) => files.has(t.path)));
    if (activeTab && !files.has(activeTab)) setActiveTab(null);
  };

  const openFile = async (filePath: string) => {
    if (!env) return;

    const existing = tabs.find((t) => t.path === filePath);
    if (existing) return setActiveTab(filePath);

    const res = await apiClient.get('/workspace/file', {
      params: { userId: user!.id, projectId: env.projectId, filePath },
    });

    setTabs((prev) => [
      ...prev,
      {
        path: filePath,
        content: res.data.content,
        dirty: false,
        language: getLanguageFromPath(filePath),
      },
    ]);
    setActiveTab(filePath);
  };

  const updateActiveTab = (content: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.path === activeTab ? { ...t, content, dirty: true } : t
      )
    );
  };

  /* =========================
     Autosave (SAFE)
  ========================= */

  useEffect(() => {
    if (!autoSave || !env) return;

    const tab = tabs.find((t) => t.path === activeTab);
    if (!tab || !tab.dirty) return;

    const snapshot = { ...tab };

    const timer = setTimeout(async () => {
      await apiClient.post('/workspace/file', {
        userId: user!.id,
        projectId: env.projectId,
        filePath: snapshot.path,
        content: snapshot.content,
      });

      setTabs((prev) =>
        prev.map((t) => (t.path === snapshot.path ? { ...t, dirty: false } : t))
      );
    }, 800);

    return () => clearTimeout(timer);
  }, [tabs, activeTab, autoSave]);

  /* =========================
     Run Button
  ========================= */

  const runCode = () => {
    if (!env) return;
    terminalRef.current?.clear();
    socketRef.current?.emit('terminal:input', env.profile.run + '\n');
  };

  /* ========================
    PORT DETECTION
  ========================= */

  useEffect(() => {
    if (!socketRef.current) return;

    const handler = (ports: any) => {
      if (!ports.length) return;
      console.log('found ports', ports);
      setPorts(ports.map((p: any) => p.port));
      setActivePort((prev) => prev ?? ports[0].port);
    };

    socketRef.current.on('workspace:ports:update', handler);
    return () => {
      socketRef.current?.off('workspace:ports:update', handler);
    };
  }, []);

  const active = tabs.find((t) => t.path === activeTab);

  /* =========================
     UI
  ========================= */

  return (
    <div className='h-screen bg-slate-950 text-white flex flex-col'>
      <div className='flex p-2 justify-between items-center border-b border-slate-800'>
        <h1>Editor</h1>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-slate-400'>Autosave</span>
            <Switch checked={autoSave} onCheckedChange={setAutoSave} />
          </div>
          <Button onClick={runCode}>Run</Button>
        </div>
      </div>

      <ResizablePanelGroup
        direction='horizontal'
        className='flex-1 overflow-hidden'
      >
        <ResizablePanel defaultSize={20} minSize={15}>
          <FileTreeExplorer
            nodes={tree}
            activePath={activeTab}
            onSelect={openFile}
            onCreate={async (path, type) => {
              await createPath({
                userId: user!.id,
                projectId: env!.projectId,
                path,
                type,
              });
              loadTree(env!.projectId);
            }}
            onDelete={async (path) => {
              await deletePath({
                userId: user!.id,
                projectId: env!.projectId,
                path,
              });
              loadTree(env!.projectId);
            }}
            onRename={async (o, n) => {
              await renamePath({
                userId: user!.id,
                projectId: env!.projectId,
                oldPath: o,
                newPath: n,
              });
              loadTree(env!.projectId);
            }}
            onRefresh={() => loadTree(env!.projectId)}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={80}>
          <ResizablePanelGroup direction='vertical'>
            <ResizablePanel defaultSize={65}>
              <EditorTabs
                tabs={tabs.map((t) => ({ path: t.path, dirty: t.dirty }))}
                active={activeTab}
                onSelect={setActiveTab}
                onClose={(path) => {
                  const tab = tabs.find((t) => t.path === path);
                  if (tab?.dirty && !confirm(`Discard changes to ${path}?`))
                    return;
                  setTabs((prev) => prev.filter((t) => t.path !== path));
                  if (activeTab === path) setActiveTab(null);
                }}
              />

              <Editor
                height='100%'
                language={active?.language}
                value={active?.content ?? ''}
                onChange={(v) => updateActiveTab(v ?? '')}
                theme='vs-dark'
              />

              {activePort && showPreview && (
                <div className='h-75 border-t border-slate-800 bg-black'>
                  <div className='flex items-center justify-between px-2 py-1 bg-slate-900'>
                    <span className='text-xs text-slate-400'>
                      Preview :{activePort}
                    </span>

                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() =>
                          window.open(
                            `/preview/${user!.id}/${
                              env!.projectId
                            }/${activePort}`,
                            '_blank'
                          )
                        }
                      >
                        Open
                      </Button>

                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => setShowPreview(false)}
                      >
                        Hide
                      </Button>
                    </div>
                  </div>

                  <iframe
                    src={`http://localhost:3001/api/v1/preview/${user!.id}/${
                      env!.projectId
                    }/${activePort}`}
                    className='w-full h-full border-none'
                  />
                </div>
              )}
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={35} minSize={15}>
              <div ref={terminalContainerRef} className='h-full bg-[#020617]' />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CodeEditor;
