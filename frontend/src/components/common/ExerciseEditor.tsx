import { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Code2,
} from 'lucide-react';
import apiClient from '@/services/api';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import type { Exercise } from '@/utils/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceFile {
  name: string;
  content: string;
}

interface TestResult {
  description: string;
  passed: boolean;
  error?: string;
}

interface TestRunResult {
  passed: number;
  failed: number;
  total: number;
  results: TestResult[];
}

interface ExerciseEditorProps {
  exercise: Exercise;
  submitting: boolean;
  onSubmit: (exerciseId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXT_TO_LANG: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  json: 'json',
  html: 'html',
  css: 'css',
  md: 'markdown',
};

function monacoLang(filename: string): string {
  const ext = filename.split('.').pop() ?? '';
  return EXT_TO_LANG[ext] ?? 'plaintext';
}

// ─── Component ────────────────────────────────────────────────────────────────

const ExerciseEditor = ({ exercise, submitting, onSubmit }: ExerciseEditorProps) => {
  const user = useAppSelector(selectUser);

  const [activeTab, setActiveTab] = useState<'instructions' | 'code'>('instructions');

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeFile, setActiveFile] = useState<string>('');
  const [language, setLanguage] = useState('javascript');
  const [projectId, setProjectId] = useState('');

  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputOpen, setOutputOpen] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);

  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestRunResult | null>(null);
  const [testPanelOpen, setTestPanelOpen] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monacoRef = useRef<any>(null);

  const hasTestCases = (exercise.test_cases?.length ?? 0) > 0;

  // ── Bootstrap workspace on mount ────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const res = await apiClient.post<{
          success: boolean;
          data: { language: string; files: WorkspaceFile[]; projectId: string };
        }>(`/students/exercise/${exercise.id}/workspace/init`);

        if (cancelled) return;

        const { language: lang, files: initialFiles, projectId: pid } = res.data.data;
        setLanguage(lang);
        setFiles(initialFiles);
        setProjectId(pid);
        setActiveFile(initialFiles[0]?.name ?? '');
      } catch (err) {
        console.error('Failed to init exercise workspace:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [exercise.id]);

  // ── Re-layout Monaco when code tab becomes visible ───────────────────────────

  useEffect(() => {
    if (activeTab === 'code' && monacoRef.current) {
      setTimeout(() => monacoRef.current?.layout(), 0);
    }
  }, [activeTab]);

  // ── Auto-save on content change (debounced 800ms) ───────────────────────────

  const handleContentChange = useCallback(
    (content: string | undefined) => {
      if (!content === undefined || !activeFile || !user || !projectId) return;

      setFiles((prev) =>
        prev.map((f) => (f.name === activeFile ? { ...f, content: content ?? '' } : f)),
      );

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        apiClient.post('/workspace/file', {
          userId: user.id,
          projectId,
          filePath: activeFile,
          content: content ?? '',
        }).catch(console.error);
      }, 800);
    },
    [activeFile, user, projectId],
  );

  // ── Run code ────────────────────────────────────────────────────────────────

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    setOutputOpen(true);
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: { output: string; exitCode: number };
      }>(`/students/exercise/${exercise.id}/run`);
      setOutput(res.data.data.output || '(no output)');
      setExitCode(res.data.data.exitCode);
    } catch (err: any) {
      setOutput(err?.response?.data?.message ?? 'Failed to run code');
      setExitCode(-1);
    } finally {
      setRunning(false);
    }
  };

  // ── Run tests ────────────────────────────────────────────────────────────────

  const handleRunTests = async () => {
    setTestRunning(true);
    setTestResults(null);
    setTestPanelOpen(true);
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: TestRunResult;
      }>(`/students/exercise/${exercise.id}/run-tests`);
      setTestResults(res.data.data);
    } catch (err: any) {
      setTestResults({
        passed: 0,
        failed: 1,
        total: 1,
        results: [{ description: 'Test runner', passed: false, error: err?.response?.data?.message ?? 'Failed to run tests' }],
      });
    } finally {
      setTestRunning(false);
    }
  };

  // ── Active file content ──────────────────────────────────────────────────────

  const activeContent = files.find((f) => f.name === activeFile)?.content ?? '';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className='rounded-xl border border-slate-200 overflow-hidden'>

      {/* ── Top-level tab bar ── */}
      <div className='flex items-center border-b border-slate-200 bg-white'>
        <button
          onClick={() => setActiveTab('instructions')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'instructions'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className='w-3.5 h-3.5' />
          Instructions
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'code'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Code2 className='w-3.5 h-3.5' />
          Code
        </button>

        <div className='ml-auto px-4'>
          <Badge variant='secondary' className='text-[10px]'>
            {exercise.max_score} pts
          </Badge>
        </div>
      </div>

      {/* ── Instructions panel ── */}
      <div className={`${activeTab !== 'instructions' ? 'hidden' : ''} p-6 bg-white`}>
        <h3 className='text-lg font-semibold text-slate-900 mb-3'>{exercise.title}</h3>
        <div className='prose prose-sm max-w-none text-slate-600 mb-6'>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {exercise.instructions ?? ''}
          </ReactMarkdown>
        </div>
        <Button
          size='sm'
          onClick={() => setActiveTab('code')}
          className='bg-indigo-600 hover:bg-indigo-700 text-white'
        >
          <Code2 className='w-3.5 h-3.5 mr-1.5' />
          Start Coding
        </Button>
      </div>

      {/* ── Code panel ── */}
      <div className={`${activeTab !== 'code' ? 'hidden' : ''} bg-[#1e1e1e]`}>

        {loading ? (
          <div className='flex items-center gap-2 text-slate-400 text-sm px-4 py-8'>
            <Loader2 className='w-4 h-4 animate-spin' />
            Setting up editor…
          </div>
        ) : (
          <>
            {/* ── File tabs ── */}
            <div className='flex items-center gap-0 border-b border-slate-700 bg-[#252526] overflow-x-auto'>
              {files.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setActiveFile(f.name)}
                  className={`px-4 py-2 text-xs font-mono whitespace-nowrap transition-colors border-r border-slate-700 ${
                    activeFile === f.name
                      ? 'bg-[#1e1e1e] text-white border-t-2 border-t-indigo-500'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#2d2d2d]'
                  }`}
                >
                  {f.name}
                </button>
              ))}

              <div className='ml-auto px-3 flex items-center'>
                <Badge variant='secondary' className='text-[10px] uppercase font-medium bg-slate-700 text-slate-300 border-0'>
                  {language}
                </Badge>
              </div>
            </div>

            {/* ── Monaco editor ── */}
            <Editor
              height='320px'
              language={monacoLang(activeFile)}
              value={activeContent}
              onChange={handleContentChange}
              onMount={(editor) => { monacoRef.current = editor; }}
              theme='vs-dark'
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 },
                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                fontLigatures: true,
              }}
            />

            {/* ── Output panel ── */}
            {output !== null && (
              <div className='border-t border-slate-700'>
                <button
                  onClick={() => setOutputOpen((o) => !o)}
                  className='w-full flex items-center justify-between px-4 py-2 bg-[#252526] text-xs text-slate-300 hover:bg-[#2d2d2d] transition-colors'
                >
                  <span className='font-semibold uppercase tracking-wider flex items-center gap-2'>
                    Output
                    {exitCode !== null && (
                      <span className={`font-mono ${exitCode === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        (exit {exitCode})
                      </span>
                    )}
                  </span>
                  {outputOpen ? <ChevronUp className='w-3 h-3' /> : <ChevronDown className='w-3 h-3' />}
                </button>
                {outputOpen && (
                  <pre className='px-4 py-3 text-xs font-mono text-slate-200 bg-[#1e1e1e] whitespace-pre-wrap max-h-48 overflow-y-auto'>
                    {output}
                  </pre>
                )}
              </div>
            )}

            {/* ── Test results panel ── */}
            {(testResults !== null || testRunning) && (
              <div className='border-t border-slate-700'>
                <button
                  onClick={() => setTestPanelOpen((o) => !o)}
                  className='w-full flex items-center justify-between px-4 py-2 bg-[#252526] text-xs text-slate-300 hover:bg-[#2d2d2d] transition-colors'
                >
                  <span className='font-semibold uppercase tracking-wider flex items-center gap-2'>
                    Test Results
                    {testResults && (
                      <span className={testResults.failed === 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {testResults.passed}/{testResults.total} passed
                      </span>
                    )}
                    {testRunning && <Loader2 className='w-3 h-3 animate-spin text-indigo-400' />}
                  </span>
                  {testPanelOpen ? <ChevronUp className='w-3 h-3' /> : <ChevronDown className='w-3 h-3' />}
                </button>
                {testPanelOpen && testResults && (
                  <div className='bg-[#1e1e1e] max-h-64 overflow-y-auto divide-y divide-slate-800'>
                    {testResults.results.map((r, i) => (
                      <div key={i} className='flex items-start gap-3 px-4 py-2.5'>
                        {r.passed
                          ? <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5' />
                          : <XCircle className='w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5' />
                        }
                        <div className='min-w-0'>
                          <p className='text-xs text-slate-200'>{r.description}</p>
                          {r.error && (
                            <p className='text-xs font-mono text-red-400 mt-0.5 break-all'>{r.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Action bar ── */}
            <div className='flex items-center gap-3 px-4 py-3 bg-[#252526] border-t border-slate-700'>
              <Button
                size='sm'
                variant='outline'
                onClick={handleRun}
                disabled={running || testRunning}
                className='border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700 hover:text-white'
              >
                {running
                  ? <><Loader2 className='w-3.5 h-3.5 mr-1.5 animate-spin' />Running…</>
                  : <><Play className='w-3.5 h-3.5 mr-1.5' />Run</>
                }
              </Button>

              {hasTestCases && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleRunTests}
                  disabled={running || testRunning}
                  className='border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700 hover:text-white'
                >
                  {testRunning
                    ? <><Loader2 className='w-3.5 h-3.5 mr-1.5 animate-spin' />Testing…</>
                    : <><FlaskConical className='w-3.5 h-3.5 mr-1.5' />Run Tests</>
                  }
                </Button>
              )}

              <Button
                size='sm'
                onClick={() => onSubmit(exercise.id)}
                disabled={submitting}
                className='bg-indigo-600 hover:bg-indigo-700 text-white'
              >
                {submitting
                  ? <><Loader2 className='w-3.5 h-3.5 mr-1.5 animate-spin' />Submitting…</>
                  : <><CheckCircle2 className='w-3.5 h-3.5 mr-1.5' />Submit</>
                }
              </Button>

              <span className='ml-auto text-[10px] text-slate-500 font-mono'>
                Auto-save enabled
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExerciseEditor;
