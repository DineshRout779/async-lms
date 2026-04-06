import { useEffect, useRef, useState, useCallback, type JSX } from 'react';
import { io, type Socket } from 'socket.io-client';
import axios, { type AxiosInstance } from 'axios';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import Editor from '@monaco-editor/react';
import { Button } from '../components/ui/button';
import { Switch } from '@/components/ui/switch';
import FileTreeExplorer, { type FileNode } from '../components/common/FileTree';
import { useSearchParams } from 'react-router';
import apiClient from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectUser, selectAuth } from '@/features/auth/authSelectors';
import { loadUser } from '@/features/auth/authThunks';
import EditorTabs from '@/components/common/editor/EditorTabs';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { type ImperativePanelHandle } from 'react-resizable-panels';
import { buildWCFiles, readWCTree } from '@/lib/wcUtils';

// ── Types ──────────────────────────────────────────────────────────────────

type EditorEnvironment = {
  projectId: string;
  workspacePath: string;
  workerUrl: string | null;
  engine: 'webcontainer' | 'docker';
  profile: {
    name: string;
    entry: string;
    run: string;
    image: string;
    language: string;
  };
};

type Tab = {
  path: string;
  content: string;
  dirty: boolean;
  language: string;
};

type PortInfo = {
  port: number;
  url: string | null;
};

type WorkspaceStatus = 'idle' | 'provisioning' | 'starting' | 'ready' | 'error' | 'queued' | 'stopped';

// ── Helpers ────────────────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  py: 'python',
  html: 'html',
  css: 'css',
  scss: 'scss',
  md: 'markdown',
  sh: 'shell',
};

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return LANG_MAP[ext] ?? 'plaintext';
}

// ── Sub-components ─────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'active' | 'done';

type LoaderStep = {
  label: string;
  status: StepStatus;
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <svg className='w-4 h-4 text-slate-400 shrink-0' viewBox='0 0 16 16' fill='none'>
        <path d='M3 8l3.5 3.5L13 4.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
      </svg>
    );
  }
  if (status === 'active') {
    return (
      <div className='w-4 h-4 shrink-0 flex items-center justify-center'>
        <div className='w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }
  return <div className='w-4 h-4 shrink-0 rounded-full border border-slate-700' />;
}

function WorkspaceLoader({
  authReady,
  socketConnected,
  wsStatus,
  engine,
}: {
  authReady: boolean;
  socketConnected: boolean;
  wsStatus: WorkspaceStatus;
  engine: 'webcontainer' | 'docker' | null;
}) {
  const steps: LoaderStep[] = engine === 'webcontainer'
    ? [
        { label: 'Authenticating',           status: authReady ? 'done' : 'active' },
        { label: 'Loading workspace files',  status: !authReady ? 'pending' : wsStatus === 'starting' || wsStatus === 'ready' ? 'done' : 'active' },
        { label: 'Booting WebContainer',     status: wsStatus !== 'starting' && wsStatus !== 'ready' ? 'pending' : wsStatus === 'ready' ? 'done' : 'active' },
      ]
    : [
        { label: 'Authenticating',           status: authReady ? 'done' : 'active' },
        { label: 'Connecting to server',     status: !authReady ? 'pending' : socketConnected ? 'done' : 'active' },
        { label: 'Preparing your workspace', status: !socketConnected ? 'pending' : wsStatus === 'starting' || wsStatus === 'ready' ? 'done' : 'active' },
        { label: 'Starting container',       status: wsStatus === 'ready' ? 'done' : wsStatus === 'starting' ? 'active' : 'pending' },
      ];

  return (
    <div className='absolute inset-0 bg-[#0a0a0f] z-50 flex flex-col items-center justify-center gap-8'>
      <div className='flex flex-col gap-3 min-w-65'>
        {steps.map((step) => (
          <div
            key={step.label}
            className={`flex items-center gap-3 transition-opacity duration-300 ${
              step.status === 'pending' ? 'opacity-30' : 'opacity-100'
            }`}
          >
            <StepIcon status={step.status} />
            <span
              className={`text-sm ${
                step.status === 'active'
                  ? 'text-white font-medium'
                  : step.status === 'done'
                    ? 'text-slate-400'
                    : 'text-slate-600'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceQueued({ position, total }: { position: number; total: number }) {
  const estMinutes = Math.max(1, Math.ceil(position * 2));
  return (
    <div className='absolute inset-0 bg-[#0a0a0f] z-50 flex flex-col items-center justify-center gap-6'>
      <div className='flex flex-col items-center gap-3 text-center'>
        <div className='w-14 h-14 rounded-full border-2 border-slate-600 flex items-center justify-center text-2xl font-bold text-white'>
          {position}
        </div>
        <p className='text-white text-base font-semibold'>You're #{position} in queue</p>
        <p className='text-slate-400 text-sm'>Estimated wait: ~{estMinutes} min</p>
        <p className='text-slate-600 text-xs'>{total} workspace{total !== 1 ? 's' : ''} currently active</p>
      </div>
      <p className='text-slate-600 text-xs max-w-xs text-center'>
        Your workspace will start automatically when a slot opens up.
      </p>
    </div>
  );
}

function WorkspaceStopped({ onReconnect }: { onReconnect: () => void }) {
  return (
    <div className='absolute inset-0 bg-[#0a0a0f] z-50 flex flex-col items-center justify-center gap-4'>
      <div className='text-center'>
        <p className='text-slate-200 text-sm font-medium'>Workspace stopped</p>
        <p className='text-slate-500 text-xs mt-2 max-w-sm px-4'>
          Your workspace was stopped due to inactivity.
        </p>
      </div>
      <Button variant='outline' size='sm' onClick={onReconnect}>
        Reconnect
      </Button>
    </div>
  );
}

function WorkspaceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className='absolute inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center gap-4'>
      <div className='text-red-400 text-3xl'>⚠</div>
      <div className='text-center'>
        <p className='text-slate-200 text-sm font-medium'>Workspace failed to start</p>
        <p className='text-slate-500 text-xs mt-2 max-w-sm px-4'>{message}</p>
      </div>
      <Button variant='outline' size='sm' onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function FileTreeSkeleton() {
  return (
    <div className='p-3 flex flex-col gap-2 animate-pulse'>
      {[80, 55, 90, 65, 70].map((w, i) => (
        <div key={i} className='h-3.5 rounded bg-slate-800' style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

const CodeEditor = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const { status: authStatus, token } = useAppSelector(selectAuth);

  // Workspace lifecycle
  const [wsStatus, setWsStatus] = useState<WorkspaceStatus>('idle');
  const [wsError, setWsError] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [env, setEnv] = useState<EditorEnvironment | null>(null);

  // Editor state
  const [tree, setTree] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(true);

  // Preview
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [activePort, setActivePort] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  // For WebContainer, server-ready gives us a direct URL
  const [wcPreviewUrl, setWcPreviewUrl] = useState<string | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const bootedRef = useRef(false);
  const envRef = useRef<EditorEnvironment | null>(null);
  const workerClientRef = useRef<AxiosInstance>(apiClient);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const previewPanelRef = useRef<ImperativePanelHandle>(null);
  const fsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swappable terminal I/O handlers — set to Docker (socket) by default,
  // overridden to WebContainer shell when booting a WC workspace.
  const terminalInputRef = useRef<((data: string) => void) | null>(null);
  const terminalResizeRef = useRef<((cols: number, rows: number) => void) | null>(null);

  // WebContainer refs
  const wcRef = useRef<import('@webcontainer/api').WebContainer | null>(null);
  const wcShellProcessRef = useRef<import('@webcontainer/api').WebContainerProcess | null>(null);
  const wcShellWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(null);

  // Keep envRef in sync for use inside socket event closures
  useEffect(() => {
    envRef.current = env;
  }, [env]);

  /* ─────────────────────────────────────────────────────────────────────────
     File System API
  ───────────────────────────────────────────────────────────────────────── */

  const loadTree = useCallback(
    async (projectId: string) => {
      if (!user?.id) return;

      if (envRef.current?.engine === 'webcontainer') {
        if (!wcRef.current) return;
        const newTree = await readWCTree(wcRef.current);
        setTree(newTree);
        const files = new Set(flattenPaths(newTree));
        setTabs((prev) => prev.filter((t) => files.has(t.path)));
        setActiveTab((prev) => (prev && files.has(prev) ? prev : null));
        return;
      }

      const res = await workerClientRef.current.get('/workspace/tree', {
        params: { userId: user.id, projectId },
      });
      const newTree: FileNode[] = res.data;
      setTree(newTree);

      const files = new Set(flattenPaths(newTree));
      setTabs((prev) => prev.filter((t) => files.has(t.path)));
      setActiveTab((prev) => (prev && files.has(prev) ? prev : null));
    },
    [user],
  );

  /* ─────────────────────────────────────────────────────────────────────────
     Socket lifecycle — connect once on mount, subscribe to all events
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    // Default terminal I/O routes to this socket (Docker mode).
    // bootWebContainer() will override these refs for WC profiles.
    terminalInputRef.current = (data) => socket.emit('terminal:input', data);
    terminalResizeRef.current = (cols, rows) => socket.emit('terminal:resize', { cols, rows });

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    if (socket.connected) queueMicrotask(() => setSocketConnected(true));

    socket.on('workspace:ready', () => setWsStatus('ready'));

    socket.on('workspace:queued', ({ position, total }: { position: number; total: number }) => {
      setWsStatus('queued');
      setQueuePosition(position);
      setQueueTotal(total);
    });

    socket.on('workspace:stopped', () => setWsStatus('stopped'));

    socket.on('workspace:error', (msg: string) => {
      setWsStatus('error');
      setWsError(msg);
    });

    socket.on('workspace:ports:update', (updatedPorts: PortInfo[]) => {
      if (!updatedPorts.length) return;
      setPorts(updatedPorts);
      setActivePort((prev) => prev ?? updatedPorts[0].port);
    });

    socket.on('terminal:error', (msg: string) => {
      terminalRef.current?.write(`\r\n\x1b[31mError: ${msg}\x1b[0m\r\n`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     Auth — retry loadUser if token exists but user hasn't loaded yet
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!token) return;
    if (user?.id) return;
    if (authStatus === 'loading') return;
    dispatch(loadUser());
  }, [token, user?.id, authStatus, dispatch]);

  /* ─────────────────────────────────────────────────────────────────────────
     Terminal setup — runs once after mount
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!terminalContainerRef.current) return;

    const fitAddon = new FitAddon();
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      theme: {
        background: '#020617',
        foreground: '#e5e7eb',
        cursor: '#60a5fa',
        selectionBackground: '#1e40af55',
      },
    });

    terminal.loadAddon(fitAddon);
    terminal.open(terminalContainerRef.current);

    const safeFit = () => {
      const el = terminalContainerRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        try { fitAddon.fit(); } catch { /* ignore resize errors */ }
      }
    };

    safeFit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Route input through the swappable ref — set to socket by default,
    // overridden to WC shell writer by bootWebContainer().
    terminal.onData((data: string) => {
      terminalInputRef.current?.(data);
    });

    // Subscribe to Docker terminal output (no-op in WC mode since WC pipes
    // directly to terminalRef without going through the socket).
    const onOutput = (data: string) => terminalRef.current?.write(data);
    socketRef.current?.on('terminal:output', onOutput);

    const observer = new ResizeObserver(() => {
      safeFit();
      const dims = fitAddon.proposeDimensions();
      if (dims) terminalResizeRef.current?.(dims.cols, dims.rows);
    });
    observer.observe(terminalContainerRef.current);

    return () => {
      observer.disconnect();
      socketRef.current?.off('terminal:output', onOutput);
      terminal.dispose();
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     FS watcher — Docker only (WC uses wc.fs.watch inside bootWebContainer)
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!socketRef.current || !env || env.engine === 'webcontainer') return;

    const handler = () => {
      if (fsRefreshTimerRef.current) clearTimeout(fsRefreshTimerRef.current);
      fsRefreshTimerRef.current = setTimeout(() => loadTree(env.projectId), 500);
    };

    socketRef.current.on('workspace:fs:update', handler);
    return () => {
      socketRef.current?.off('workspace:fs:update', handler);
    };
  }, [env, loadTree]);

  /* ─────────────────────────────────────────────────────────────────────────
     Workspace bootstrap — runs once when user is available
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!user?.id || !socketRef.current) return;
    if (bootedRef.current) return;
    bootedRef.current = true;

    const pid = searchParams.get('pid');
    const cp = searchParams.get('cp');
    if (!pid || !cp) return;

    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setWsStatus('error');
        setWsError('Workspace startup timed out. Please retry.');
      }
    }, 90_000);

    const boot = async () => {
      setWsStatus('provisioning');

      const res = await apiClient.post('/editor/start', {
        profile: cp,
        projectId: pid,
      });

      const envData = res.data as EditorEnvironment;
      setEnv(envData);
      envRef.current = envData;

      if (envData.engine === 'webcontainer') {
        clearTimeout(timeoutId);
        // Do NOT check `cancelled` here — bootedRef.current already prevents
        // double-boot. Checking `cancelled` breaks React StrictMode in local dev:
        // StrictMode's cleanup sets cancelled=true between the two effect
        // invocations, so the post resolves after cleanup and the early-return
        // fires, leaving wsStatus stuck at 'provisioning' forever.
        await bootWebContainer(envData, pid);
        return;
      }

      // ── Docker path — check cancelled before setting up persistent state ──
      if (cancelled) return;

      const { workerUrl } = envData;
      const targetUrl = workerUrl ?? import.meta.env.VITE_API_URL;

      if (workerUrl && workerUrl !== import.meta.env.VITE_API_URL) {
        socketRef.current?.disconnect();
        const workerSocket = io(workerUrl, {
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
        });
        socketRef.current = workerSocket;
        terminalInputRef.current = (data) => workerSocket.emit('terminal:input', data);
        terminalResizeRef.current = (cols, rows) => workerSocket.emit('terminal:resize', { cols, rows });

        workerSocket.on('connect', () => setSocketConnected(true));
        workerSocket.on('disconnect', () => setSocketConnected(false));
        workerSocket.on('workspace:ready', () => setWsStatus('ready'));
        workerSocket.on('workspace:queued', ({ position, total }: { position: number; total: number }) => {
          setWsStatus('queued');
          setQueuePosition(position);
          setQueueTotal(total);
        });
        workerSocket.on('workspace:stopped', () => setWsStatus('stopped'));
        workerSocket.on('workspace:error', (msg: string) => {
          setWsStatus('error');
          setWsError(msg);
        });
        workerSocket.on('workspace:ports:update', (updatedPorts: PortInfo[]) => {
          if (!updatedPorts.length) return;
          setPorts(updatedPorts);
          setActivePort((prev) => prev ?? updatedPorts[0].port);
        });
        workerSocket.on('terminal:error', (msg: string) => {
          terminalRef.current?.write(`\r\n\x1b[31mError: ${msg}\x1b[0m\r\n`);
        });
        workerSocket.on('terminal:output', (data: string) =>
          terminalRef.current?.write(data)
        );
        workerSocket.on('workspace:fs:update', () => {
          if (fsRefreshTimerRef.current) clearTimeout(fsRefreshTimerRef.current);
          fsRefreshTimerRef.current = setTimeout(() => loadTree(res.data.projectId), 500);
        });
      }

      const client = axios.create({ baseURL: `${targetUrl}/api/v1` });
      client.interceptors.request.use((config) => {
        const t = localStorage.getItem('token');
        if (t) config.headers.Authorization = `Bearer ${t}`;
        return config;
      });
      workerClientRef.current = client;

      setWsStatus('starting');
      terminalRef.current?.clear();

      socketRef.current!.once('workspace:ready', async () => {
        clearTimeout(timeoutId);
        const dims = fitAddonRef.current?.proposeDimensions();
        socketRef.current!.emit('terminal:start', {
          cols: dims?.cols ?? 80,
          rows: dims?.rows ?? 24,
        });
        await loadTree(res.data.projectId);
      });

      socketRef.current!.emit('workspace:start', {
        userId: user.id,
        projectId: res.data.projectId,
        image: res.data.profile.image,
        profile: cp,
      });
    };

    boot().catch((err) => {
      if (!cancelled) {
        setWsStatus('error');
        setWsError(err?.message ?? 'Failed to start workspace');
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      // Tear down the WebContainer instance so the next boot() call succeeds.
      // WebContainers only allows one instance per page — without this, navigating
      // away and back throws "Unable to create more instances".
      try { wcShellWriterRef.current?.releaseLock(); } catch { /* already released */ }
      wcShellProcessRef.current?.kill();
      wcRef.current?.teardown();
      wcRef.current = null;
      wcShellProcessRef.current = null;
      wcShellWriterRef.current = null;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────────────────────────────────────────────────────────────────────
     WebContainer boot
  ───────────────────────────────────────────────────────────────────────── */

  const bootWebContainer = async (
    _envData: EditorEnvironment,
    projectId: string,
  ) => {
    setWsStatus('starting');
    terminalRef.current?.clear();
    terminalRef.current?.write('\r\nLoading workspace files...\r\n');

    // 1. Load existing files from server (persisted across sessions via S3/disk)
    const treeRes = await apiClient.get('/workspace/tree', {
      params: { userId: user!.id, projectId },
    });
    const fileEntries: { path: string; content: string }[] = [];
    await walkAndLoad(treeRes.data, projectId, fileEntries);

    // 2. Boot WebContainer (dynamic import — only loaded for WC profiles)
    terminalRef.current?.write('\r\nBooting WebContainer...\r\n');
    if (!self.crossOriginIsolated) {
      throw new Error(
        'WebContainers require cross-origin isolation. ' +
        'Please hard-reload this page (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac) and try again.',
      );
    }
    const { WebContainer } = await import('@webcontainer/api');
    const wc = await WebContainer.boot();
    wcRef.current = wc;

    // 3. Mount files
    await wc.mount(buildWCFiles(fileEntries));

    // 4. Install dependencies if package.json is present
    try {
      await wc.fs.readFile('/package.json', 'utf-8');
      terminalRef.current?.write('\r\nInstalling dependencies...\r\n');
      const install = await wc.spawn('npm', ['install']);
      install.output.pipeTo(
        new WritableStream({ write(data) { terminalRef.current?.write(data); } })
      );
      const installExit = await install.exit;
      if (installExit !== 0) {
        terminalRef.current?.write('\r\n\x1b[33mWarning: npm install exited with code ' + installExit + '\x1b[0m\r\n');
      }
    } catch {
      // No package.json — plain Node.js script, skip install
    }

    // 5. Start interactive shell (jsh is WebContainer's built-in shell)
    const dims = fitAddonRef.current?.proposeDimensions();
    const shellProcess = await wc.spawn('jsh', {
      terminal: { cols: dims?.cols ?? 80, rows: dims?.rows ?? 24 },
    });
    wcShellProcessRef.current = shellProcess;

    shellProcess.output.pipeTo(
      new WritableStream({ write(data) { terminalRef.current?.write(data); } })
    );

    const writer = shellProcess.input.getWriter();
    wcShellWriterRef.current = writer;

    // Override terminal I/O to go to the WC shell instead of the Docker socket
    terminalInputRef.current = (data) => writer.write(data);
    terminalResizeRef.current = (cols, rows) => shellProcess.resize({ cols, rows });

    // 6. Listen for dev server (Vite, etc.)
    wc.on('server-ready', (port, url) => {
      setPorts([{ port, url }]);
      setActivePort(port);
      setWcPreviewUrl(url);
    });

    // 7. Watch FS for tree updates (debounced)
    wc.fs.watch('/', { recursive: true }, () => {
      if (fsRefreshTimerRef.current) clearTimeout(fsRefreshTimerRef.current);
      fsRefreshTimerRef.current = setTimeout(async () => {
        if (wcRef.current) {
          const newTree = await readWCTree(wcRef.current);
          setTree(newTree);
        }
      }, 500);
    });

    // 8. Load initial file tree from WC FS
    const initialTree = await readWCTree(wc);
    setTree(initialTree);

    setWsStatus('ready');
  };

  // Recursively walk the server file tree and fetch each file's content
  const walkAndLoad = async (
    nodes: FileNode[],
    projectId: string,
    out: { path: string; content: string }[],
  ) => {
    for (const node of nodes) {
      if (node.type === 'file') {
        const res = await apiClient.get('/workspace/file', {
          params: { userId: user!.id, projectId, filePath: node.path },
        });
        out.push({ path: node.path, content: res.data.content });
      }
      if (node.children) await walkAndLoad(node.children, projectId, out);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Auto-open preview when a port is first detected
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!activePort) return;
    previewPanelRef.current?.expand();
  }, [activePort]);

  /* ─────────────────────────────────────────────────────────────────────────
     Autosave (debounced 800 ms)
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!autoSave || !env) return;

    const tab = tabs.find((t) => t.path === activeTab);
    if (!tab?.dirty) return;

    const snapshot = { ...tab };

    const timer = setTimeout(async () => {
      // For WC: also write to the in-memory WC FS so the dev server hot-reloads
      if (env.engine === 'webcontainer' && wcRef.current) {
        await wcRef.current.fs.writeFile(snapshot.path, snapshot.content);
      }

      // Always persist to server (survives page reloads)
      await workerClientRef.current.post('/workspace/file', {
        userId: user!.id,
        projectId: env.projectId,
        filePath: snapshot.path,
        content: snapshot.content,
      });

      setTabs((prev) =>
        prev.map((t) => (t.path === snapshot.path ? { ...t, dirty: false } : t)),
      );

      if (env.engine === 'docker' && activePort) setPreviewKey((k) => k + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [tabs, activeTab, autoSave, activePort, env, user]);

  /* ─────────────────────────────────────────────────────────────────────────
     Ctrl+S — force-save immediately
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!activeTab || !env || !user) return;
        const tab = tabs.find((t) => t.path === activeTab);
        if (!tab?.dirty) return;

        if (env.engine === 'webcontainer' && wcRef.current) {
          await wcRef.current.fs.writeFile(tab.path, tab.content);
        }

        workerClientRef.current
          .post('/workspace/file', {
            userId: user.id,
            projectId: env.projectId,
            filePath: tab.path,
            content: tab.content,
          })
          .then(() => {
            setTabs((prev) =>
              prev.map((t) => (t.path === activeTab ? { ...t, dirty: false } : t)),
            );
            if (env.engine === 'docker' && activePort) setPreviewKey((k) => k + 1);
          })
          .catch(() => {
            // auto-save silently fails — file marked dirty stays dirty
          });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, tabs, env, activePort, user]);

  /* ─────────────────────────────────────────────────────────────────────────
     File operations
  ───────────────────────────────────────────────────────────────────────── */

  const openFile = async (filePath: string) => {
    if (!env) return;

    const existing = tabs.find((t) => t.path === filePath);
    if (existing) return setActiveTab(filePath);

    let content: string;
    if (env.engine === 'webcontainer' && wcRef.current) {
      content = await wcRef.current.fs.readFile(filePath, 'utf-8');
    } else {
      const res = await workerClientRef.current.get('/workspace/file', {
        params: { userId: user!.id, projectId: env.projectId, filePath },
      });
      content = res.data.content;
    }

    setTabs((prev) => [
      ...prev,
      { path: filePath, content, dirty: false, language: getLanguageFromPath(filePath) },
    ]);
    setActiveTab(filePath);
  };

  const updateActiveTab = (content: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.path === activeTab ? { ...t, content, dirty: true } : t)),
    );
  };

  const createEntry = async (p: string, type: 'file' | 'folder') => {
    if (!env) return;
    if (env.engine === 'webcontainer' && wcRef.current) {
      if (type === 'folder') {
        await wcRef.current.fs.mkdir(p, { recursive: true });
      } else {
        const dir = p.split('/').slice(0, -1).join('/');
        if (dir) await wcRef.current.fs.mkdir(dir, { recursive: true });
        await wcRef.current.fs.writeFile(p, '');
      }
    }
    await workerClientRef.current.post('/workspace/create', {
      userId: user!.id, projectId: env.projectId, path: p, type,
    });
    loadTree(env.projectId);
  };

  const deleteEntry = async (p: string) => {
    if (!env) return;
    if (env.engine === 'webcontainer' && wcRef.current) {
      await wcRef.current.fs.rm(p, { recursive: true });
    }
    await workerClientRef.current.post('/workspace/delete', {
      userId: user!.id, projectId: env.projectId, path: p,
    });
    loadTree(env.projectId);
  };

  const renameEntry = async (oldPath: string, newPath: string) => {
    if (!env) return;
    if (env.engine === 'webcontainer' && wcRef.current) {
      // WC doesn't have rename — copy + delete
      const content = await wcRef.current.fs.readFile(oldPath, 'utf-8');
      await wcRef.current.fs.writeFile(newPath, content);
      await wcRef.current.fs.rm(oldPath);
    }
    await workerClientRef.current.post('/workspace/rename', {
      userId: user!.id, projectId: env.projectId, oldPath, newPath,
    });
    loadTree(env.projectId);
  };

  const runCode = () => {
    if (!env) return;
    terminalRef.current?.clear();
    if (env.engine === 'webcontainer') {
      wcShellWriterRef.current?.write(env.profile.run + '\n');
    } else {
      socketRef.current?.emit('terminal:input', env.profile.run + '\n');
    }
  };

  const retryBoot = () => {
    bootedRef.current = false;
    setWsStatus('idle');
    setWsError(null);
    window.location.reload();
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Derived values
  ───────────────────────────────────────────────────────────────────────── */

  const active = tabs.find((t) => t.path === activeTab);
  const activePortInfo = ports.find((p) => p.port === activePort);
  const previewBase = env?.workerUrl ?? import.meta.env.VITE_API_URL;

  // WC provides a direct URL from server-ready; Docker uses the proxy route
  const iframeSrc = env?.engine === 'webcontainer'
    ? (wcPreviewUrl ?? null)
    : (env && activePort
        ? (activePortInfo?.url ?? `${previewBase}/api/v1/preview/${user!.id}/${env.projectId}/${activePort}`)
        : null);

  const togglePreview = () => {
    if (showPreview) previewPanelRef.current?.collapse();
    else previewPanelRef.current?.expand();
  };

  const authReady = !!user?.id;
  const isLoading =
    !authReady ||
    wsStatus === 'idle' ||
    wsStatus === 'provisioning' ||
    wsStatus === 'starting';
  const isQueued = wsStatus === 'queued';

  /* ─────────────────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────────────────── */

  return (
    <div className='code-editor h-screen bg-slate-950 text-white flex flex-col relative'>
      {/* Loading overlay */}
      {isLoading && (
        <WorkspaceLoader
          authReady={authReady}
          socketConnected={socketConnected}
          wsStatus={wsStatus}
          engine={env?.engine ?? null}
        />
      )}

      {/* Queue overlay */}
      {isQueued && (
        <WorkspaceQueued position={queuePosition} total={queueTotal} />
      )}

      {/* Stopped overlay */}
      {wsStatus === 'stopped' && (
        <WorkspaceStopped onReconnect={retryBoot} />
      )}

      {/* Error overlay */}
      {wsStatus === 'error' && wsError && (
        <WorkspaceError message={wsError} onRetry={retryBoot} />
      )}

      {/* ── Header ── */}
      <div className='flex px-3 py-2 justify-between items-center border-b border-slate-800 shrink-0'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-slate-100'>
            {env?.profile.name ?? 'Editor'}
          </span>
          {wsStatus === 'ready' && (
            <span className='flex items-center gap-1 text-xs text-green-400'>
              <span className='w-1.5 h-1.5 rounded-full bg-green-400 inline-block' />
              ready
            </span>
          )}
          {env?.engine === 'webcontainer' && wsStatus === 'ready' && (
            <span className='text-xs text-slate-600'>· in-browser</span>
          )}
        </div>

        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-1.5'>
            <span className='text-xs text-slate-500'>Autosave</span>
            <Switch checked={autoSave} onCheckedChange={setAutoSave} />
          </div>

          {ports.length > 0 && (
            <Button
              variant={showPreview ? 'default' : 'outline'}
              size='sm'
              onClick={togglePreview}
            >
              Preview
              {ports.length > 1 && (
                <span className='ml-1 text-xs opacity-60'>({ports.length})</span>
              )}
            </Button>
          )}

          <Button size='sm' onClick={runCode} disabled={wsStatus !== 'ready'}>
            Run
          </Button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <ResizablePanelGroup direction='horizontal' className='flex-1 overflow-hidden'>
        {/* File tree */}
        <ResizablePanel defaultSize={15} minSize={8} maxSize={35}>
          {wsStatus === 'ready' ? (
            <FileTreeExplorer
              nodes={tree}
              activePath={activeTab}
              onSelect={openFile}
              onCreate={async (p, type) => createEntry(p, type)}
              onDelete={async (p) => deleteEntry(p)}
              onRename={async (o, n) => renameEntry(o, n)}
              onRefresh={() => loadTree(env!.projectId)}
            />
          ) : (
            <FileTreeSkeleton />
          )}
        </ResizablePanel>

        <ResizableHandle />

        {/* Editor + Terminal */}
        <ResizablePanel defaultSize={showPreview ? 55 : 85}>
          <ResizablePanelGroup direction='vertical'>
            {/* Monaco editor */}
            <ResizablePanel defaultSize={65}>
              <EditorTabs
                tabs={tabs.map((t) => ({ path: t.path, dirty: t.dirty }))}
                active={activeTab}
                onSelect={setActiveTab}
                onClose={(p) => {
                  const tab = tabs.find((t) => t.path === p);
                  if (tab?.dirty && !confirm(`Discard unsaved changes to ${p}?`)) return;
                  setTabs((prev) => prev.filter((t) => t.path !== p));
                  if (activeTab === p) setActiveTab(null);
                }}
              />

              {active ? (
                <Editor
                  height='100%'
                  language={active.language}
                  value={active.content}
                  onChange={(v) => updateActiveTab(v ?? '')}
                  theme='vs-dark'
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: 'on',
                    bracketPairColorization: { enabled: true },
                    formatOnPaste: true,
                  }}
                />
              ) : (
                <div className='h-full flex items-center justify-center text-slate-600 text-sm select-none'>
                  {wsStatus === 'ready' ? 'Select a file to open' : 'Loading…'}
                </div>
              )}
            </ResizablePanel>

            <ResizableHandle />

            {/* Terminal */}
            <ResizablePanel defaultSize={35} minSize={10}>
              <div ref={terminalContainerRef} className='h-full bg-[#020617]' />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle />

        {/* Preview — starts collapsed, auto-expands on port/server-ready detection */}
        <ResizablePanel
          ref={previewPanelRef}
          defaultSize={0}
          minSize={20}
          collapsible
          collapsedSize={0}
          onCollapse={() => setShowPreview(false)}
          onExpand={() => setShowPreview(true)}
        >
          <div className='flex flex-col h-full'>
            {/* Preview toolbar */}
            <div className='flex items-center justify-between px-2 py-1 bg-slate-900 border-b border-slate-800 shrink-0'>
              <div className='flex items-center gap-2'>
                <span className='text-xs text-slate-400'>Preview</span>

                {ports.length > 1 ? (
                  <select
                    value={activePort ?? ''}
                    onChange={(e) => {
                      setActivePort(Number(e.target.value));
                      setPreviewKey((k) => k + 1);
                    }}
                    className='text-xs bg-slate-800 text-slate-300 rounded px-1.5 py-0.5 border border-slate-700 outline-none cursor-pointer'
                  >
                    {ports.map((p) => (
                      <option key={p.port} value={p.port}>
                        :{p.port}
                      </option>
                    ))}
                  </select>
                ) : activePort ? (
                  <span className='text-xs text-slate-500'>:{activePort}</span>
                ) : null}

                {(activePortInfo?.url || wcPreviewUrl) && (
                  <span className='flex items-center gap-1 text-xs text-green-400'>
                    <span className='w-1.5 h-1.5 rounded-full bg-green-400 inline-block' />
                    live
                  </span>
                )}
              </div>

              {iframeSrc && (
                <div className='flex gap-0.5'>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-6 w-6 p-0 text-slate-400 hover:text-white'
                    title='Reload preview'
                    onClick={() => setPreviewKey((k) => k + 1)}
                  >
                    ↻
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-6 w-6 p-0 text-slate-400 hover:text-white'
                    title='Open in new tab'
                    onClick={() => window.open(iframeSrc, '_blank')}
                  >
                    ↗
                  </Button>
                </div>
              )}
            </div>

            {/* Preview iframe or placeholder */}
            {iframeSrc ? (
              <iframe
                key={previewKey}
                src={iframeSrc}
                className='w-full flex-1 border-none bg-white'
                title='App preview'
              />
            ) : (
              <div className='flex items-center justify-center flex-1 text-slate-500 text-sm bg-slate-950 select-none'>
                {wsStatus === 'ready' ? 'Run your app to see the preview' : 'Starting…'}
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CodeEditor;

// ── Helpers ────────────────────────────────────────────────────────────────

function flattenPaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  const walk = (ns: FileNode[]) => {
    for (const n of ns) {
      if (n.type === 'file') paths.push(n.path);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return paths;
}
