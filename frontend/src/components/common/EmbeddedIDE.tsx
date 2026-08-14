import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Play, Send, BookOpen, Files, Search, Code2, Trash2, Maximize, Minimize, CheckCircle2, Save } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import FileTreeExplorer from '@/components/common/FileTree';
import type { FileNode } from '@/components/common/FileTree';
import type { Exercise } from '@/utils/types';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';

// Module level cache for Pyodide instance
let cachedPyodide: any = null;

const getLanguageFromPath = (p: string) => {
  const ext = p.split('.').pop() || '';
  if (ext === 'py') return 'python';
  if (ext === 'js') return 'javascript';
  if (ext === 'html') return 'html';
  if (ext === 'css') return 'css';
  return 'plaintext';
};

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

  const [saving, setSaving] = useState(false);

  // Initialize from backend workspace if available, otherwise fallback to exercise initial_files
  useEffect(() => {
    let active = true;
    
    const initWorkspace = async () => {
      let filesToLoad = [];
      try {
        const res = await apiClient.post(`/students/exercise/${exercise.id}/workspace/init`, {
          taskId: exercise.tasks?.[0]?.id
        });
        if (res.data?.success && res.data.data?.files && res.data.data.files.length > 0) {
          // Map backend response 'name' to the expected tab shape
          filesToLoad = res.data.data.files.map((f: any) => ({ name: f.name, content: f.content }));
        }
      } catch (err) {
        console.error('Failed to init workspace from backend, falling back to initial_files', err);
      }
      
      if (!active) return;

      if (filesToLoad.length === 0) {
        filesToLoad = exercise.tasks?.[0]?.initial_files || [];
      }
      
      // Ensure Instructions.md is present
      const hasInstructions = filesToLoad.some((f: any) => f.name === 'Instructions.md');
      const initialFiles = hasInstructions 
        ? filesToLoad 
        : [
            { 
              name: 'Instructions.md', 
              content: exercise.instructions || exercise.tasks?.[0]?.instructions || '# Instructions\n\nNo instructions provided.' 
            },
            ...filesToLoad
          ];

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
      
      const newTabs = initialFiles.map((f: any) => ({
        path: f.name,
        content: f.content,
        language: f.name === 'Instructions.md' ? 'markdown' : f.name.endsWith('.py') ? 'python' : f.name.endsWith('.js') ? 'javascript' : f.name.endsWith('.html') ? 'html' : f.name.endsWith('.css') ? 'css' : 'plaintext'
      }));
      setTabs(newTabs);
      if (newTabs.length > 0) setActiveTab(newTabs[0].path);
    };

    initWorkspace();

    return () => {
      active = false;
    };
  }, [exercise]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Map tabs (path/content) to files shape expected by backend (name/content)
      const filesPayload = tabs.map(t => ({
        name: t.path,
        content: t.content
      }));

      await apiClient.post(`/students/exercise/${exercise.id}/workspace/save`, {
        files: filesPayload,
        taskId: exercise.tasks?.[0]?.id
      });
      toast.success('Progress saved successfully!');
    } catch (err) {
      console.error('Failed to save progress', err);
      toast.error('Failed to save progress. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
      if (t.path === oldPath) return { ...t, path: newPath, language: getLanguageFromPath(newPath) };
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

    let combined = html;
    if (combined.includes('</head>')) {
      combined = combined.replace('</head>', `<style>${css}</style></head>`);
    } else {
      combined = `<style>${css}</style>` + combined;
    }

    if (combined.includes('</body>')) {
      combined = combined.replace('</body>', `<script>${js}</script></body>`);
    } else {
      combined = combined + `<script>${js}</script>`;
    }

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

    // 4. Backend fallback for Java and SQL
    if (exercise.language === 'java' || exercise.language === 'sql') {
      try {
        setTerminalOutput('Executing on backend runner...\n----------------\n');
        // Save current progress first so runner sees the latest file modifications
        const filesPayload = tabs.map(t => ({
          name: t.path,
          content: t.content
        }));
        await apiClient.post(`/students/exercise/${exercise.id}/workspace/save`, {
          files: filesPayload,
          taskId: exercise.tasks?.[0]?.id
        });

        const res = await apiClient.post(`/students/exercise/${exercise.id}/run`, {
          taskId: exercise.tasks?.[0]?.id,
          activeFile: activeTab
        });

        if (res.data?.success && res.data.data) {
          const { output } = res.data.data;
          setTerminalOutput(output || '(no output)');
        }
      } catch (err: any) {
        setTerminalOutput('Error executing on backend: ' + (err.response?.data?.message || err.message));
      } finally {
        setIsRunning(false);
      }
      return;
    }
    
    // 5. Python execution (cached Pyodide)
    if (activeTab?.endsWith('.py') || exercise.language === 'python') {
      try {
        let pyodide = cachedPyodide;
        if (!pyodide) {
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
          
          pyodide = await (window as any).loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
          });
          cachedPyodide = pyodide;
        }
        
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

    // 6. JavaScript execution (isolated iframe to support async logs & prevent global pollution)
    if (activeTab?.endsWith('.js') || exercise.language === 'javascript') {
      try {
        setTerminalOutput('Running...\n----------------\n');
        let jsCode = activeTabContent;
        if (!activeTab?.endsWith('.js')) {
            jsCode = tabs.find(t => t.path === 'index.js' || t.path.endsWith('.js'))?.content || '';
        }

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        if (iframe.contentWindow) {
          (iframe.contentWindow as any).console.log = (...args: any[]) => {
            setTerminalOutput(prev => prev + args.map(a => String(a)).join(' ') + '\n');
          };
          (iframe.contentWindow as any).console.error = (...args: any[]) => {
            setTerminalOutput(prev => prev + '[Error]: ' + args.map(a => String(a)).join(' ') + '\n');
          };

          try {
            const script = iframe.contentDocument?.createElement('script');
            if (script) {
              script.textContent = jsCode;
              iframe.contentDocument?.body.appendChild(script);
            }
          } catch (e: any) {
            setTerminalOutput(prev => prev + '[Error]: ' + e.message + '\n');
          }
        }

        // Keep the iframe alive for 2 seconds to allow async operations (like setTimeout) to complete
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
          setTerminalOutput(prev => prev + '\n[Execution completed]');
          setIsRunning(false);
        }, 2000);

      } catch (err: any) {
        setTerminalOutput(prev => prev + '\n[Error]: ' + err.message);
        setIsRunning(false);
      }
      return;
    }
  };

  const handleRunTests = async () => {
    const testCases = exercise.tasks?.[0]?.test_cases || [];
    if (testCases.length === 0) {
      alert("No test cases are defined for this exercise.");
      return;
    }

    setIsRunning(true);
    setTerminalOutput('Running tests...\n----------------\n');
    setShowPreview(false);

    // 1. Backend fallback for Java (SQL tests not supported)
    if (exercise.language === 'java') {
      try {
        setTerminalOutput('Running tests on backend runner...\n----------------\n');
        // Save first so backend runs latest code
        const filesPayload = tabs.map(t => ({
          name: t.path,
          content: t.content
        }));
        await apiClient.post(`/students/exercise/${exercise.id}/workspace/save`, {
          files: filesPayload,
          taskId: exercise.tasks?.[0]?.id
        });

        const res = await apiClient.post(`/students/exercise/${exercise.id}/run-tests`, {
          taskId: exercise.tasks?.[0]?.id
        });

        if (res.data?.success && res.data.data) {
          const { results, passed, failed } = res.data.data;
          let out = 'Test Results:\n';
          results.forEach((r: any) => {
            if (r.passed) {
              out += `✅ ${r.description}\n`;
            } else {
              out += `❌ ${r.description} - ${r.error}\n`;
            }
          });
          out += `\nPassed ${passed} / ${passed + failed} tests.`;
          setTerminalOutput(out);
        }
      } catch (err: any) {
        setTerminalOutput('Error executing tests on backend: ' + (err.response?.data?.message || err.message));
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // 2. Python execution (cached Pyodide)
    if (activeTab?.endsWith('.py') || exercise.language === 'python') {
      try {
        let pyodide = cachedPyodide;
        if (!pyodide) {
          setTerminalOutput('Loading Python environment for testing...\n');
          if (!(window as any).loadPyodide) {
             await new Promise((resolve, reject) => {
               const script = document.createElement('script');
               script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
               script.onload = resolve;
               script.onerror = reject;
               document.head.appendChild(script);
             });
          }
          
          pyodide = await (window as any).loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
          });
          cachedPyodide = pyodide;
        }
        
        const combinedTestCode = testCases.map(tc => tc.test_code).join('\n\n');
        
        const pyHeader = `
import json,sys,builtins,asyncio
_p,_f,_r=0,0,[]
__logs=[]
_original_print = builtins.print
def _custom_print(*args, **kwargs):
    sep = kwargs.get('sep', ' ')
    if len(args) == 1:
        __logs.append(args[0])
    else:
        __logs.append(sep.join(str(a) for a in args))
    _original_print(*args, **kwargs)
builtins.print = _custom_print

__testQueue = []
def __test(d,fn):
  __testQueue.append((d,fn))
class _E:
  def __init__(self,a):self._a=a
  def to_be(self,e):
    assert self._a==e,f"Expected {repr(e)}, got {repr(self._a)}"
  def to_equal(self,e):
    assert self._a==e,f"Expected {repr(e)}, got {repr(self._a)}"
  def to_be_truthy(self):
    assert self._a,"Expected truthy"
  def to_be_falsy(self):
    assert not self._a,"Expected falsy"
def __expect(a): return _E(a)
`;

        const pythonCode = tabs.find(t => t.path === 'main.py' || t.path.endsWith('.py'))?.content || '';
        const pyFooter = `
async def __run_tests():
  global _p, _f
  for d, fn in __testQueue:
    try:
      if asyncio.iscoroutinefunction(fn):
        await fn()
      else:
        fn()
      _r.append({"description":d,"passed":True});_p+=1
    except Exception as e:
      _r.append({"description":d,"passed":False,"error":str(e)});_f+=1
await __run_tests()
json.dumps(_r)
`;
        const fullScript = `${pyHeader}\n${pythonCode}\n${combinedTestCode}\n${pyFooter}`;

        const resultJson = await pyodide.runPythonAsync(fullScript);
        const results = JSON.parse(resultJson);
        
        let out = 'Test Results:\n';
        let passedCount = 0;
        results.forEach((r: any) => {
          if (r.passed) {
            out += `✅ ${r.description}\n`;
            passedCount++;
          } else {
            out += `❌ ${r.description} - ${r.error}\n`;
          }
        });
        out += `\nPassed ${passedCount} / ${results.length} tests.`;
        setTerminalOutput(out);
      } catch (err: any) {
        setTerminalOutput('[Error executing tests]: ' + err.message);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // 3. JavaScript execution (cleanup original Log & Error functions in try-finally)
    if (activeTab?.endsWith('.js') || exercise.language === 'javascript') {
      try {
        const combinedTestCode = testCases.map(tc => tc.test_code).join('\n\n');
        
        const jsHeader = `
const __r=[],__p=0,__f=0;
const __logs=[];
const _originalLog = console.log;
const _originalError = console.error;
console.log = (...args) => {
  __logs.push(args.length === 1 ? args[0] : args.join(' '));
  _originalLog(...args);
};
console.error = (...args) => {
  __logs.push('[Error]: ' + (args.length === 1 ? args[0] : args.join(' ')));
  _originalError(...args);
};
const __testQueue = [];
const __test = (d, fn) => {
  __testQueue.push(async () => {
    try {
      await fn();
      __r.push({description:d, passed:true});
    } catch(e) {
      __r.push({description:d, passed:false, error:e.message});
    }
  });
};
class _E{constructor(a){this._a=a;}
toBe(e){if(this._a!==e)throw new Error('Expected '+e+', got '+this._a);}
toEqual(e){if(JSON.stringify(this._a)!==JSON.stringify(e))throw new Error('Expected '+JSON.stringify(e)+', got '+JSON.stringify(this._a));}
toBeTruthy(){if(!this._a)throw new Error('Expected truthy');}
toBeFalsy(){if(this._a)throw new Error('Expected falsy');}}
const __expect=(a)=>new _E(a);
`;
        
        const jsCode = tabs.find(t => t.path === 'index.js' || t.path.endsWith('.js'))?.content || '';
        const fullScript = `
${jsHeader}
try {
  ${jsCode}
  ${combinedTestCode}
  for (const t of __testQueue) await t();
} finally {
  console.log = _originalLog;
  console.error = _originalError;
}
return __r;
`;
        
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction(fullScript);
        const results = await fn();
        
        let out = 'Test Results:\n';
        let passedCount = 0;
        results.forEach((r: any) => {
          if (r.passed) {
            out += `✅ ${r.description}\n`;
            passedCount++;
          } else {
            out += `❌ ${r.description} - ${r.error}\n`;
          }
        });
        out += `\nPassed ${passedCount} / ${results.length} tests.`;
        setTerminalOutput(out);
      } catch (err: any) {
        setTerminalOutput('[Error executing tests]: ' + err.message);
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
          onClick={() => {
            if (!tabs.find(t => t.path === 'Instructions.md')) {
              setTabs(prev => [{ path: 'Instructions.md', content: exercise.instructions || exercise.tasks?.[0]?.instructions || '', language: 'markdown' }, ...prev]);
            }
            setActiveTab('Instructions.md');
          }}
          className={`p-2 rounded-lg transition-colors ${activeTab === 'Instructions.md' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
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
              {exercise.tasks?.[0]?.test_cases && exercise.tasks[0].test_cases.length > 0 && exercise.language !== 'dom' && (
                <Button 
                  size='sm' 
                  variant='secondary'
                  className='h-8 bg-amber-600 hover:bg-amber-500 text-white border-none'
                  onClick={handleRunTests}
                  disabled={isRunning}
                >
                  <CheckCircle2 className='w-4 h-4 mr-1' /> {isRunning ? 'Testing...' : 'Run Tests'}
                </Button>
              )}
              <Button 
                size='sm' 
                variant='outline'
                className='h-8 bg-[#2d2d2d] hover:bg-[#333] text-slate-300 border-slate-600'
                onClick={handleSave}
                disabled={saving}
              >
                <Save className='w-4 h-4 mr-1 text-blue-400' /> {saving ? 'Saving...' : 'Save'}
              </Button>
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
              <div className='flex-1 relative bg-[#1e1e1e]'>
                {activeTab ? (
                  activeTab === 'Instructions.md' ? (
                    <div className='absolute inset-0 p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden'>
                      <div className='
                        prose prose-invert prose-slate max-w-3xl mx-auto
                        prose-headings:text-white prose-headings:font-bold
                        prose-h1:text-2xl prose-h1:border-b prose-h1:border-slate-700 prose-h1:pb-3
                        prose-h2:text-xl prose-h2:text-indigo-300
                        prose-h3:text-base prose-h3:text-slate-200
                        prose-p:text-slate-300 prose-p:leading-relaxed
                        prose-code:bg-slate-800 prose-code:text-emerald-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                        prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-lg
                        prose-strong:text-white
                        prose-li:text-slate-300
                        prose-hr:border-slate-700
                      '>
                        <ReactMarkdown>
                          {exercise.instructions || exercise.tasks?.[0]?.instructions || '*No instructions provided.*'}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <Editor
                      height='100%'
                      language={activeTabLanguage}
                      theme='vs-dark'
                      value={activeTabContent}
                      onChange={handleEditorChange}
                      path={activeTab || undefined}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbersMinChars: 3,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 16 },
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        renderLineHighlight: 'all',
                        bracketPairColorization: { enabled: true },
                      }}
                    />
                  )
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
