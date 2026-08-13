import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Play, Send, BookOpen, Files, Search, Code2, Trash2, Maximize, Minimize } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import FileTreeExplorer from '@/components/common/FileTree';
import type { FileNode } from '@/components/common/FileTree';
import type { Exercise } from '@/utils/types';

// Mock types
type Tab = { path: string; content: string; language: string };

interface EmbeddedIDEProps {
  exercise: Exercise;
  submitting: boolean;
  onSubmit: (exerciseId: string, files?: any[]) => void;
}

export default function EmbeddedIDE({ exercise, submitting, onSubmit }: EmbeddedIDEProps) {
  const [activeSidebar, setActiveSidebar] = useState<'instructions' | 'explorer' | 'search'>('instructions');
  const [tree, setTree] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  
  // Layout states
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>('Ready.');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize from exercise tasks/initial_files
  useEffect(() => {
    if (exercise.tasks && exercise.tasks.length > 0) {
      // Load initial files of first task for now
      const initialFiles = exercise.tasks[0].initial_files || [];
      const buildTree = (files: {name: string}[]): FileNode[] => {
        const root: FileNode[] = [];
        files.forEach(f => {
          const parts = f.name.split('/');
          let currentLevel = root;
          let currentPath = '';
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            let existing = currentLevel.find(n => n.name === part);
            if (!existing) {
              const isFile = i === parts.length - 1;
              existing = { name: part, path: currentPath, type: isFile ? 'file' : 'folder', children: isFile ? undefined : [] };
              currentLevel.push(existing);
            }
            if (!existing.children) existing.children = [];
            currentLevel = existing.children;
          }
        });
        return root;
      };
      setTree(buildTree(initialFiles));
      
      const newTabs = initialFiles.map(f => ({
        path: f.name,
        content: f.content,
        language: f.name.endsWith('.py') ? 'python' : f.name.endsWith('.js') ? 'javascript' : f.name.endsWith('.html') ? 'html' : f.name.endsWith('.css') ? 'css' : 'plaintext'
      }));
      setTabs(newTabs);
      if (newTabs.length > 0) setActiveTab(newTabs[0].path);
    }
  }, [exercise]);

  const activeTabContent = tabs.find(t => t.path === activeTab)?.content ?? '';
  const activeTabLanguage = tabs.find(t => t.path === activeTab)?.language ?? 'plaintext';

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || !activeTab) return;
    setTabs(prev => prev.map(t => t.path === activeTab ? { ...t, content: value } : t));
    
    // Auto-update preview if open
    if (showPreview && exercise.language === 'dom') {
      updatePreview();
    }
  };

  const handleCreate = (path: string, type: 'file' | 'folder') => {
    setTree(prevTree => {
      const insert = (nodes: FileNode[], parts: string[], currentPath: string): FileNode[] => {
        if (parts.length === 1) {
          if (nodes.find(n => n.name === parts[0])) return nodes;
          return [...nodes, { name: parts[0], path: currentPath, type, children: type === 'folder' ? [] : undefined }];
        }
        const [head, ...rest] = parts;
        return nodes.map(n => {
          if (n.name === head && n.type === 'folder') {
            return { ...n, children: insert(n.children || [], rest, currentPath) };
          }
          return n;
        });
      };
      return insert(prevTree, path.split('/'), path);
    });

    if (type === 'file') {
      const language = path.endsWith('.py') ? 'python' : path.endsWith('.js') ? 'javascript' : path.endsWith('.html') ? 'html' : path.endsWith('.css') ? 'css' : 'plaintext';
      setTabs(prev => [...prev, { path, content: '', language }]);
      setActiveTab(path);
    }
  };

  const handleDelete = (path: string) => {
    setTree(prevTree => {
      const remove = (nodes: FileNode[]): FileNode[] => {
        return nodes.filter(n => n.path !== path).map(n => ({
          ...n,
          children: n.children ? remove(n.children) : undefined
        }));
      };
      return remove(prevTree);
    });

    setTabs(prev => prev.filter(t => t.path !== path && !t.path.startsWith(path + '/')));
    if (activeTab === path || activeTab?.startsWith(path + '/')) {
      setActiveTab(null);
    }
  };

  const handleRename = (oldPath: string, newPath: string) => {
    const newName = newPath.split('/').pop() || '';
    
    setTree(prevTree => {
      const rename = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(n => {
          if (n.path === oldPath) {
            return { ...n, name: newName, path: newPath };
          }
          if (n.path.startsWith(oldPath + '/')) {
            const updatedPath = n.path.replace(oldPath, newPath);
            return { ...n, path: updatedPath, children: n.children ? rename(n.children) : undefined };
          }
          if (n.children) {
            return { ...n, children: rename(n.children) };
          }
          return n;
        });
      };
      return rename(prevTree);
    });
    
    setTabs(prev => prev.map(t => {
      if (t.path === oldPath) return { ...t, path: newPath, language: newPath.split('.').pop() || 'plaintext' };
      if (t.path.startsWith(oldPath + '/')) {
         return { ...t, path: t.path.replace(oldPath, newPath) };
      }
      return t;
    }));
    
    if (activeTab === oldPath) {
      setActiveTab(newPath);
    } else if (activeTab?.startsWith(oldPath + '/')) {
      setActiveTab(activeTab.replace(oldPath, newPath));
    }
  };

  const updatePreview = () => {
    const html = tabs.find(t => t.path === 'index.html')?.content || '';
    const css = tabs.find(t => t.path === 'style.css')?.content || '';
    const js = tabs.find(t => t.path === 'script.js')?.content || '';

    const combined = html
      .replace('</head>', `<style>${css}</style></head>`)
      .replace('</body>', `<script>${js}</script></body>`);

    const blob = new Blob([combined], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  };

  const handleRun = async () => {
    // 1. If active tab is HTML, ALWAYS run the DOM preview
    if (activeTab?.endsWith('.html')) {
      setShowPreview(true);
      updatePreview();
      return;
    }

    // 2. If it is a DOM exercise and they try to run CSS or JS, alert them
    if (exercise.language === 'dom' && (activeTab?.endsWith('.css') || activeTab?.endsWith('.js'))) {
      alert("You're not in an HTML file. Please select an HTML file to run the preview.");
      return;
    }

    // 3. If CSS in any other exercise, also alert them (CSS cannot be 'run' on its own)
    if (activeTab?.endsWith('.css')) {
      alert("Please select an HTML file to run.");
      return;
    }

    setIsRunning(true);
    setTerminalOutput('Executing...\n');
    setShowPreview(false);
    
    // 4. Python execution
    if (activeTab?.endsWith('.py') || exercise.language === 'python') {
      try {
        setTerminalOutput('Loading Python environment...\n');
        if (!(window as any).loadPyodide) {
           await new Promise((resolve, reject) => {
             const script = document.createElement('script');
             script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
             script.onload = resolve;
             script.onerror = reject;
             document.head.appendChild(script);
           });
        }
        
        const pyodide = await (window as any).loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
        });
        
        // Setup stdout/stderr redirection
        pyodide.setStdout({ batched: (text: string) => setTerminalOutput(prev => prev + text + '\n') });
        pyodide.setStderr({ batched: (text: string) => setTerminalOutput(prev => prev + text + '\n') });
        
        setTerminalOutput('Running...\n----------------\n');
        let pythonCode = activeTabContent;
        if (!activeTab?.endsWith('.py')) {
            pythonCode = tabs.find(t => t.path === 'main.py' || t.path.endsWith('.py'))?.content || '';
        }
        await pyodide.runPythonAsync(pythonCode);
        setTerminalOutput(prev => prev + '\n[Execution completed successfully]');
      } catch (err: any) {
        setTerminalOutput(prev => prev + '\n[Error]: ' + err.message);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // 5. JavaScript execution
    if (activeTab?.endsWith('.js') || exercise.language === 'javascript') {
      try {
        setTerminalOutput('Running...\n----------------\n');
        let jsCode = activeTabContent;
        if (!activeTab?.endsWith('.js')) {
            jsCode = tabs.find(t => t.path === 'index.js' || t.path.endsWith('.js'))?.content || '';
        }

        let output = '';
        const originalLog = console.log;
        const originalError = console.error;

        console.log = (...args) => {
          output += args.map(a => String(a)).join(' ') + '\n';
          originalLog(...args);
        };
        console.error = (...args) => {
          output += '[Error]: ' + args.map(a => String(a)).join(' ') + '\n';
          originalError(...args);
        };

        try {
          // Use new Function to create a clean scope
          const fn = new Function(jsCode);
          fn();
        } catch (e: any) {
          output += '[Error]: ' + e.message + '\n';
        } finally {
          console.log = originalLog;
          console.error = originalError;
        }

        setTerminalOutput(prev => prev + output + '\n[Execution completed successfully]');
      } catch (err: any) {
        setTerminalOutput(prev => prev + '\n[Error]: ' + err.message);
      } finally {
        setIsRunning(false);
      }
      return;
    }
  };

  return (
    <div className={`flex w-full bg-[#1e1e1e] text-slate-300 shadow-2xl overflow-hidden transition-all duration-200 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 rounded-none' 
        : 'h-[800px] border border-slate-700 rounded-xl relative'
    }`}>
      
      {/* Activity Bar */}
      <div className='w-12 flex flex-col items-center py-4 bg-[#252526] border-r border-slate-800 shrink-0 gap-4'>
        <button 
          onClick={() => setActiveSidebar('instructions')}
          className={`p-2 rounded-lg transition-colors ${activeSidebar === 'instructions' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          title="Instructions"
        >
          <BookOpen className='w-6 h-6' />
        </button>
        <button 
          onClick={() => setActiveSidebar('explorer')}
          className={`p-2 rounded-lg transition-colors ${activeSidebar === 'explorer' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          title="Explorer"
        >
          <Files className='w-6 h-6' />
        </button>
        <button 
          onClick={() => setActiveSidebar('search')}
          className={`p-2 rounded-lg transition-colors ${activeSidebar === 'search' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          title="Search"
        >
          <Search className='w-6 h-6' />
        </button>
      </div>

      <PanelGroup direction='horizontal' className='flex-1 w-full overflow-hidden'>
        {/* Sidebar Panel */}
        <Panel defaultSize={20} minSize={15} maxSize={40} className='bg-[#252526] border-r border-slate-800 flex flex-col h-full overflow-hidden'>
          {activeSidebar === 'instructions' && (
            <div className='p-4 h-full overflow-y-auto prose prose-invert prose-sm [&::-webkit-scrollbar]:hidden'>
              <h2 className='text-lg font-semibold text-white mb-4'>Instructions</h2>
              <div dangerouslySetInnerHTML={{ __html: exercise.instructions || 'No instructions provided.' }} />
            </div>
          )}
          {activeSidebar === 'explorer' && (
            <div className='h-full flex flex-col'>
              <div className='px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500'>
                Explorer
              </div>
              <div className='flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden'>
                <FileTreeExplorer
                  nodes={tree}
                  activePath={activeTab}
                  onSelect={(path) => setActiveTab(path)}
                  onCreate={handleCreate}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onRefresh={() => {}}
                />
              </div>
            </div>
          )}
          {activeSidebar === 'search' && (
            <div className='p-4 h-full text-sm text-slate-500'>
              Search panel coming soon...
            </div>
          )}
        </Panel>

        <PanelResizeHandle className='w-1 bg-slate-800 hover:bg-indigo-500 active:bg-indigo-600 transition-colors cursor-col-resize z-10' />

        {/* Main Editor & Terminal Area */}
        <Panel defaultSize={80} className='flex flex-col bg-[#1e1e1e] min-w-0 overflow-hidden'>
          
          {/* Top Bar */}
          <div className='flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-slate-800 shrink-0'>
            <div className='flex items-center gap-2'>
              <Code2 className='w-4 h-4 text-indigo-400' />
              <span className='text-sm font-medium text-slate-300'>{exercise.title}</span>
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className='p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors mr-2'
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize className='w-4 h-4' /> : <Maximize className='w-4 h-4' />}
              </button>
              {exercise.language === 'dom' && showPreview && (!activeTab || !activeTab.endsWith('.py')) ? (
                <Button 
                  size='sm' 
                  variant='outline' 
                  className='h-8 bg-[#2d2d2d] hover:bg-[#333] text-slate-300 border-slate-600'
                  onClick={() => setShowPreview(false)}
                >
                  <Play className='w-4 h-4 mr-1 text-emerald-400' /> Close Preview
                </Button>
              ) : (
                <Button 
                  size='sm' 
                  variant={exercise.language === 'dom' ? 'outline' : 'secondary'}
                  className={`h-8 ${exercise.language === 'dom' ? 'bg-[#2d2d2d] hover:bg-[#333] text-slate-300 border-slate-600' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-none'}`}
                  onClick={handleRun}
                  disabled={isRunning}
                >
                  <Play className={`w-4 h-4 mr-1 ${exercise.language === 'dom' ? 'text-emerald-400' : ''}`} /> {isRunning ? 'Running...' : 'Run'}
                </Button>
              )}
              <Button 
                size='sm' 
                className='h-8 bg-indigo-600 hover:bg-indigo-500 text-white border-none'
                disabled={submitting}
                onClick={() => onSubmit(exercise.id, tabs)}
              >
                <Send className='w-4 h-4 mr-1' /> {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>

          <PanelGroup direction='vertical' className='flex-1 overflow-hidden'>
            {/* Editor Pane */}
            <Panel defaultSize={70} className='flex flex-col min-h-0 border-b border-slate-800'>
              {/* File Tabs */}
              <div className='flex bg-[#2d2d2d] overflow-x-auto shrink-0 [&::-webkit-scrollbar]:hidden'>
                {tabs.map(t => (
                  <button
                    key={t.path}
                    onClick={() => setActiveTab(t.path)}
                    className={`px-4 py-2 text-xs font-mono border-r border-slate-700 transition-colors ${
                      activeTab === t.path ? 'bg-[#1e1e1e] text-white border-t-2 border-t-indigo-500' : 'text-slate-400 hover:bg-[#333]'
                    }`}
                  >
                    {t.path}
                  </button>
                ))}
              </div>
              <div className='flex-1 relative'>
                {activeTab ? (
                  <Editor
                    language={activeTabLanguage}
                    theme='vs-dark'
                    value={activeTabContent}
                    onChange={handleEditorChange}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: 'on',
                      automaticLayout: true,
                      scrollbar: {
                        vertical: 'hidden',
                        horizontal: 'hidden'
                      }
                    }}
                  />
                ) : (
                  <div className='flex items-center justify-center h-full text-slate-600'>
                    Select a file to edit
                  </div>
                )}
              </div>
            </Panel>

            <PanelResizeHandle className='h-1 bg-slate-800 hover:bg-indigo-500 active:bg-indigo-600 transition-colors cursor-row-resize z-10' />

            {/* Terminal Pane */}
            <Panel defaultSize={30} className='bg-[#1e1e1e] flex flex-col min-h-0'>
              <div className='flex items-center justify-between px-4 py-1 bg-[#252526] border-b border-slate-800'>
                <div className='flex gap-4'>
                  <button 
                    className={`text-xs font-semibold uppercase tracking-wider ${!showPreview ? 'text-slate-300' : 'text-slate-500'}`}
                    onClick={() => setShowPreview(false)}
                  >
                    Terminal
                  </button>
                  {exercise.language === 'dom' && (
                    <button 
                      className={`text-xs font-semibold uppercase tracking-wider ${showPreview ? 'text-slate-300' : 'text-slate-500'}`}
                      onClick={() => setShowPreview(true)}
                    >
                      Live Preview
                    </button>
                  )}
                </div>
                <button className='text-slate-500 hover:text-red-400' onClick={() => setTerminalOutput('')}>
                  <Trash2 className='w-3.5 h-3.5' />
                </button>
              </div>
              <div className='flex-1 overflow-y-auto font-mono text-sm bg-[#1e1e1e] [&::-webkit-scrollbar]:hidden'>
                {showPreview && previewUrl ? (
                  <iframe src={previewUrl} className='w-full h-full border-none bg-white' sandbox="allow-scripts" title="Preview" />
                ) : (
                  <div className='p-2 text-slate-300 whitespace-pre-wrap'>
                    {terminalOutput}
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
