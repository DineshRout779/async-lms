import { useEffect, useRef, useState, type JSX } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import Editor from '@monaco-editor/react';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import type { Language } from '../utils/languages';
import { languages } from '../utils/languages';
import FileTree, { buildFileTree } from '../components/common/FileTree';
import { BOILERPLATES } from '../utils/boilerplates';

type ProgramStatus = 'running' | 'finished' | 'failed';

const socket: Socket = io('http://localhost:3001');

/* ---------- terminal helpers ---------- */

const normalize = (data: string) => data.replace(/\n/g, '\r\n');

const writeStdout = (term: Terminal, data: string) => {
  term.write(normalize(data));
};

const writeStderr = (term: Terminal, data: string) => {
  term.write(`\x1b[31m${normalize(data)}\x1b[0m`);
};

type PlaygroundFile = {
  path: string; // e.g. "index.js", "src/app.py"
  content: string;
};

/* ---------- component ---------- */

const CodeEditor = (): JSX.Element => {
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [language, setLanguage] = useState<Language>(languages[0]);

  const [files, setFiles] = useState<PlaygroundFile[]>(
    BOILERPLATES[languages[0].value]
  );

  const [activeFilePath, setActiveFilePath] = useState<string>(
    BOILERPLATES[languages[0].value][0].path
  );
  const activeFile = files.find((f) => f.path === activeFilePath);

  const [running, setRunning] = useState<boolean>(false);

  /* ---------- terminal setup ---------- */

  useEffect(() => {
    if (!terminalContainerRef.current) return;

    const fitAddon = new FitAddon();

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      lineHeight: 1.4,
      letterSpacing: 0.4,
      theme: {
        background: '#020617',
        foreground: '#e5e7eb',
        cursor: '#e5e7eb',
        selectionBackground: '#334155',
      },
    });

    terminal.loadAddon(fitAddon);
    terminal.open(terminalContainerRef.current);
    fitAddon.fit();

    terminal.writeln('Playground ready.\n');

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    /* ----- socket listeners ----- */

    socket.on('program:stdout', (data: string) => {
      writeStdout(terminal, data);
    });

    socket.on('program:stderr', (data: string) => {
      writeStderr(terminal, data);
    });

    socket.on(
      'program:meta',
      (meta: { durationMs: number; reason: string }) => {
        terminal.writeln(
          `[${meta.reason.replace('_', ' ')} in ${meta.durationMs} ms]`
        );
      }
    );

    socket.on('program:status', (status: ProgramStatus) => {
      terminal.writeln(`\n[status: ${status}]`);

      if (status === 'finished' || status === 'failed') {
        setRunning(false);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('program:stdout');
      socket.off('program:stderr');
      socket.off('program:meta');
      socket.off('program:status');
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

  const runCode = (): void => {
    if (!terminalRef.current || running) return;

    setRunning(true);

    terminalRef.current.clear();
    terminalRef.current.writeln('Running...\n');

    socket.emit('program:run', {
      language: language.value,
      files,
    });
  };

  const handleLanguageChange = (val: string) => {
    const lang = languages.find((l) => l.value === val);
    if (!lang) return;

    setLanguage(lang);

    const nextFiles = BOILERPLATES[lang.value];
    if (nextFiles) {
      setFiles(nextFiles);
      setActiveFilePath(nextFiles[0].path);
    }
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
      }}
    >
      {/* Controls */}
      <div className='flex p-2 justify-between items-center'>
        {/* header */}
        <h1 className='capitalize'>{language.label} Editor</h1>
        <div className='flex items-center gap-4'>
          <Select value={language.value} onValueChange={handleLanguageChange}>
            <SelectTrigger className='w-45'>
              <SelectValue placeholder='Select Language' />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            language={language.monaco}
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
