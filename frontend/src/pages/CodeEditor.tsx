import { useEffect, useRef, useState, type JSX } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import Editor from '@monaco-editor/react';
import { Button } from '../components/ui/button';
import FileTree, { buildFileTree } from '../components/common/FileTree';
import { useSearchParams } from 'react-router';
import apiClient from '@/services/api';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

type EditorEnvironment = {
  projectId: string;
  workspacePath: string;
  profile: {
    name: string;
    language: string;
    entry: string;
    run: string;
    image: string;
  };
};

// type ProgramStatus = 'running' | 'finished' | 'failed';

// const normalize = (data: string) => data.replace(/\n/g, '\r\n');

// const writeStdout = (term: Terminal, data: string) => {
//   term.write(normalize(data));
// };

// const writeStderr = (term: Terminal, data: string) => {
//   term.write(`\x1b[31m${normalize(data)}\x1b[0m`);
// };

const socket: Socket = io(import.meta.env.VITE_API_URL);

/* ---------- terminal helpers ---------- */

type PlaygroundFile = {
  path: string; // e.g. "index.js", "src/app.py"
  content: string;
};

/* ---------- component ---------- */

const CodeEditor = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const [env, setEnv] = useState<EditorEnvironment | null>(null);
  const user = useAppSelector(selectUser);

  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [language, setLanguage] = useState<string>('javascript');
  const [files, setFiles] = useState<PlaygroundFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const activeFile = files.find((f) => f.path === activeFilePath);

  const [running, setRunning] = useState<boolean>(false);

  /* ---------- terminal setup ---------- */

  useEffect(() => {
    const fetchEnvironment = async () => {
      const pid = searchParams.get('pid');
      const cp = searchParams.get('cp');

      if (!pid || !cp) {
        return;
      }

      try {
        const res = await apiClient.post(`/editor/start`, {
          profile: cp,
          projectId: pid,
        });

        console.log('res: ', res);
        // below is the API response
        /**
         *{
            "projectId": "123",
            "workspacePath": "/workspaces/5/123",
            "profile": {
              "name": "JavaScript",
              "language": "javascript",
              "entry": "index.js",
              "run": "node index.js",
              "image": "playground-node-runner",
              "template": ["index.js"]
            }
          }
         */
        setEnv(res.data);
        setFiles(res.data.profile.files);
        setActiveFilePath(res.data.profile.files[0]?.path);
        setLanguage(res.data.profile.language);
        const runConfig = {
          userId: user?.id,
          projectId: res.data.projectId,
          image: res.data.profile.image,
        };
        console.log('runConfig:', runConfig);
        socket.emit('workspace:start', runConfig);

        socket.once('workspace:ready', () => {
          socket.emit('terminal:start');
        });
      } catch (error) {
        console.log('Error fetching env data:', error);
      }
    };
    user && fetchEnvironment();
  }, [user]);

  useEffect(() => {
    if (!terminalContainerRef.current) return;

    const fitAddon = new FitAddon();

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      theme: {
        background: '#020617',
        foreground: '#e5e7eb',
      },
    });

    terminal.loadAddon(fitAddon);
    terminal.open(terminalContainerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.writeln('Playground ready.\r\n');

    // SEND keystrokes to backend
    terminal.onData((data) => {
      socket.emit('terminal:input', data);
    });

    // RECEIVE output from backend
    socket.on('terminal:output', (data: string) => {
      terminal.write(data);
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('terminal:output');
      terminal.dispose();
    };
  }, []);

  /* ---------- actions ---------- */

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isRunShortcut = (e.ctrlKey || e.metaKey) && e.key === 'Enter';

      if (isRunShortcut) {
        e.preventDefault();
        if (!running) {
          runCode();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [running]);

  const runCode = () => {
    if (!env || !user) return;

    terminalRef.current?.clear();

    const runCommand = env.profile.run + '\n';

    socket.emit('terminal:input', runCommand);
  };

  /* ---------- UI ---------- */

  return (
    <div
      style={{
        height: '100vh',
        background: '#0f172a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
      }}
    >
      {/* Controls */}
      <div className='flex p-2 justify-between items-center'>
        {/* header */}
        <h1 className='capitalize'>{language} Editor</h1>
        <div className='flex items-center gap-4'>
          <Button onClick={runCode} disabled={running}>
            {running ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className='flex flex-1 overflow-hidden'>
        {/* File Explorer */}
        <div className='w-64 bg-slate-900 p-2 overflow-auto border-r border-slate-700'>
          <FileTree
            nodes={buildFileTree(files)}
            activePath={activeFilePath}
            onSelect={setActiveFilePath}
          />
        </div>

        {/* Editor */}
        <div className='flex-1 p-2'>
          <Editor
            height='100%'
            language={language}
            value={activeFile?.content ?? ''}
            onChange={(value) => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.path === activeFilePath ? { ...f, content: value ?? '' } : f
                )
              );
            }}
            theme='vs-dark'
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
          />
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={terminalContainerRef}
        style={{
          height: '60%',
          background: '#020617',
          padding: '8px',
          borderTop: '1px solid #1e293b',
        }}
      />
    </div>
  );
};

export default CodeEditor;
