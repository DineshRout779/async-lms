import { Button } from '@/components/ui/button';
import type { ExerciseModalProps, ExerciseTask, TestCase } from '@/utils/types';
import { Save, X, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';
import toast from 'react-hot-toast';

const LANGUAGE_DEFAULTS: Record<string, { name: string; content: string }> = {
  javascript: { name: 'index.js', content: '// Write your solution here\n' },
  python: { name: 'main.py', content: '# Write your solution here\n' },
};

function makeTask(language: string): ExerciseTask {
  return {
    id: crypto.randomUUID(),
    title: 'Task 1',
    instructions: '',
    initial_files: [{ ...LANGUAGE_DEFAULTS[language] }],
    test_cases: [],
  };
}

// ─── Task Editor ──────────────────────────────────────────────────────────────

interface TaskEditorProps {
  task: ExerciseTask;
  index: number;
  canRemove: boolean;
  onChange: (updated: ExerciseTask) => void;
  onRemove: () => void;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ task, index, canRemove, onChange, onRemove }) => {
  const [expanded, setExpanded] = useState(index === 0);

  const updateFile = (fileIdx: number, field: 'name' | 'content', value: string) => {
    onChange({
      ...task,
      initial_files: task.initial_files.map((f, i) => i === fileIdx ? { ...f, [field]: value } : f),
    });
  };

  const addFile = () => {
    onChange({ ...task, initial_files: [...task.initial_files, { name: '', content: '' }] });
  };

  const removeFile = (fileIdx: number) => {
    onChange({ ...task, initial_files: task.initial_files.filter((_, i) => i !== fileIdx) });
  };

  const addTestCase = () => {
    onChange({
      ...task,
      test_cases: [...(task.test_cases ?? []), { id: crypto.randomUUID(), description: '', test_code: '', is_hidden: false }],
    });
  };

  const removeTestCase = (tcId: string) => {
    onChange({ ...task, test_cases: (task.test_cases ?? []).filter(tc => tc.id !== tcId) });
  };

  const updateTestCase = (tcId: string, field: keyof TestCase, value: string | boolean) => {
    onChange({
      ...task,
      test_cases: (task.test_cases ?? []).map(tc => tc.id === tcId ? { ...tc, [field]: value } : tc),
    });
  };

  const [generating, setGenerating] = useState(false);

  const generateTests = async () => {
    const taskInstructions = task.instructions || '';
    if (!taskInstructions.trim()) {
      toast.error('Please provide task instructions first so the AI knows what to test.');
      return;
    }

    setGenerating(true);
    try {
      const res = await aiCurriculumApi.generateTaskTests({
        instructions: taskInstructions,
        language: task.initial_files[0]?.name.endsWith('.py') ? 'python' : 'javascript',
      });
      
      const newTests = (res.data.data || []).map((tc: any) => ({
        ...tc,
        id: crypto.randomUUID()
      }));

      onChange({
        ...task,
        test_cases: [...(task.test_cases ?? []), ...newTests],
      });
      toast.success(`Generated ${newTests.length} test cases!`);
    } catch (err) {
      toast.error('Failed to generate tests');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className='rounded-lg border border-slate-200 overflow-hidden'>
      {/* Task header */}
      <div className='flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200'>
        <span className='w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0'>
          {index + 1}
        </span>
        <input
          type='text'
          value={task.title}
          onChange={e => onChange({ ...task, title: e.target.value })}
          placeholder='Task title'
          className='flex-1 text-sm font-medium bg-transparent outline-none text-slate-800'
        />
        <button
          type='button'
          onClick={() => setExpanded(v => !v)}
          className='text-slate-400 hover:text-slate-600 p-0.5'
        >
          {expanded ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
        </button>
        {canRemove && (
          <button type='button' onClick={onRemove} className='text-slate-400 hover:text-red-500 p-0.5'>
            <Trash2 className='w-4 h-4' />
          </button>
        )}
      </div>

      {expanded && (
        <div className='p-3 space-y-4 bg-white'>
          {/* Task instructions */}
          <div>
            <label className='mb-1 block text-xs font-medium text-slate-600'>
              Task Instructions
              <span className='ml-1 text-slate-400 font-normal'>optional, markdown</span>
            </label>
            <textarea
              value={task.instructions ?? ''}
              onChange={e => onChange({ ...task, instructions: e.target.value })}
              placeholder='Describe what the student should do in this task…'
              rows={3}
              className='w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'
            />
          </div>

          {/* Starter files */}
          <div>
            <div className='flex items-center justify-between mb-1.5'>
              <label className='text-xs font-medium text-slate-600'>Starter Files</label>
              <Button onClick={addFile} size='sm' variant='outline' className='text-xs h-6 px-2'>
                <Plus className='w-3 h-3 mr-1' /> Add File
              </Button>
            </div>
            <div className='space-y-2'>
              {task.initial_files.map((file, fileIdx) => (
                <div key={fileIdx} className='rounded-lg border border-slate-200 overflow-hidden'>
                  <div className='flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200'>
                    <input
                      type='text'
                      value={file.name}
                      onChange={e => updateFile(fileIdx, 'name', e.target.value)}
                      placeholder='filename.js'
                      className='flex-1 text-xs font-mono bg-transparent outline-none text-slate-700'
                    />
                    {task.initial_files.length > 1 && (
                      <button type='button' onClick={() => removeFile(fileIdx)} className='text-slate-400 hover:text-red-500'>
                        <Trash2 className='w-3 h-3' />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={file.content}
                    onChange={e => updateFile(fileIdx, 'content', e.target.value)}
                    placeholder='// Starter code…'
                    rows={4}
                    className='w-full px-3 py-2 font-mono text-xs text-slate-700 bg-white outline-none resize-y'
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Test cases */}
          <div>
            <div className='flex items-center justify-between mb-1.5'>
              <label className='text-xs font-medium text-slate-600'>
                Test Cases
                <span className='ml-1 text-slate-400 font-normal'>auto-grade this task</span>
              </label>
              <div className='flex items-center gap-2'>
                <Button 
                  onClick={generateTests} 
                  disabled={generating}
                  size='sm' 
                  variant='outline' 
                  className='text-xs h-6 px-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                >
                  {generating ? (
                    <Loader2 className='w-3 h-3 mr-1 animate-spin' />
                  ) : (
                    <Sparkles className='w-3 h-3 mr-1' />
                  )}
                  Generate AI Tests
                </Button>
                <Button onClick={addTestCase} size='sm' variant='outline' className='text-xs h-6 px-2'>
                  <Plus className='w-3 h-3 mr-1' /> Add Test
                </Button>
              </div>
            </div>
            {(task.test_cases ?? []).length === 0 ? (
              <p className='text-xs text-slate-400 italic'>No test cases — task will not be auto-graded.</p>
            ) : (
              <div className='space-y-2'>
                {(task.test_cases ?? []).map((tc, tcIdx) => (
                  <div key={tc.id} className='rounded-lg border border-slate-200 overflow-hidden'>
                    <div className='flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200'>
                      <span className='text-xs text-slate-400 font-mono shrink-0'>#{tcIdx + 1}</span>
                      <input
                        type='text'
                        value={tc.description}
                        onChange={e => updateTestCase(tc.id, 'description', e.target.value)}
                        placeholder='e.g., returns correct output'
                        className='flex-1 text-xs bg-transparent outline-none text-slate-700'
                      />
                      <label className='flex items-center gap-1 text-xs text-slate-500 shrink-0 cursor-pointer'>
                        <input
                          type='checkbox'
                          checked={tc.is_hidden}
                          onChange={e => updateTestCase(tc.id, 'is_hidden', e.target.checked)}
                          className='rounded'
                        />
                        Hidden
                      </label>
                      <button type='button' onClick={() => removeTestCase(tc.id)} className='text-slate-400 hover:text-red-500 shrink-0'>
                        <Trash2 className='w-3 h-3' />
                      </button>
                    </div>
                    <textarea
                      value={tc.test_code}
                      onChange={e => updateTestCase(tc.id, 'test_code', e.target.value)}
                      placeholder={`__test('${tc.description || 'description'}', () => {\n  __expect(fn()).toBe(expected);\n});`}
                      rows={4}
                      className='w-full px-3 py-2 font-mono text-xs text-slate-700 bg-white outline-none resize-y'
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

const ExerciseModal: React.FC<ExerciseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editData,
  subtopicTitle,
  loading = false,
}) => {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [language, setLanguage] = useState('javascript');
  const [tasks, setTasks] = useState<ExerciseTask[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setTitle(editData?.title ?? '');
    setInstructions(editData?.instructions ?? '');
    setMaxScore(editData?.max_score ?? 100);
    const lang = editData?.language ?? 'javascript';
    setLanguage(lang);

    // If editData has tasks, use them.
    // If it has legacy initial_files/test_cases (no tasks), convert to 1 task.
    // For new exercises, start with 1 default task.
    if (editData?.tasks && editData.tasks.length > 0) {
      setTasks(editData.tasks);
    } else if (editData?.initial_files?.length) {
      setTasks([{
        id: crypto.randomUUID(),
        title: 'Task 1',
        instructions: '',
        initial_files: editData.initial_files,
        test_cases: editData.test_cases ?? [],
      }]);
    } else {
      setTasks([makeTask(lang)]);
    }
  }, [isOpen, editData]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    // Update the first task's default file only if it still matches the old default
    setTasks(prev => prev.map((task, i) => {
      if (i !== 0) return task;
      const isDefault = task.initial_files.length === 1 &&
        Object.values(LANGUAGE_DEFAULTS).some(d => d.name === task.initial_files[0].name);
      return isDefault ? { ...task, initial_files: [{ ...LANGUAGE_DEFAULTS[lang] }] } : task;
    }));
  };

  const addTask = () => {
    setTasks(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: `Task ${prev.length + 1}`,
        instructions: '',
        initial_files: [{ ...LANGUAGE_DEFAULTS[language] }],
        test_cases: [],
      },
    ]);
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTask = (updated: ExerciseTask) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Exercise title is required');
      return;
    }
    if (maxScore <= 0) {
      toast.error('Max score must be greater than 0');
      return;
    }
    if (tasks.length === 0) {
      toast.error('At least one task is required');
      return;
    }
    for (const task of tasks) {
      if (!task.title.trim()) {
        toast.error('All tasks must have a title');
        return;
      }
      if (task.initial_files.some(f => !f.name.trim())) {
        toast.error(`Task "${task.title}": all files must have a name`);
        return;
      }
      if ((task.test_cases ?? []).some(tc => !tc.description.trim() || !tc.test_code.trim())) {
        toast.error(`Task "${task.title}": all test cases must have a description and test code`);
        return;
      }
    }

    // For backward compat, derive exercise-level initial_files/test_cases from first task
    const firstTask = tasks[0];
    onSave({
      title: title.trim(),
      instructions: instructions.trim(),
      max_score: maxScore,
      language,
      initial_files: firstTask.initial_files,
      test_cases: firstTask.test_cases ?? [],
      tasks,
    });

    // Reset
    setTitle('');
    setInstructions('');
    setMaxScore(100);
    setLanguage('javascript');
    setTasks([makeTask('javascript')]);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto'>
      <div className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto'>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-bold text-slate-900'>
              {editData ? 'Edit Exercise' : 'Create Exercise'}
            </h3>
            <p className='text-sm text-slate-500'>Context: {subtopicTitle}</p>
          </div>
          <button onClick={onClose} className='text-slate-400 hover:text-slate-600'>
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-4'>
          {/* Title */}
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>Exercise Title</label>
            <input
              type='text'
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='e.g., Implement Binary Search'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          {/* Overview instructions (optional) */}
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Overview Instructions
              <span className='ml-2 text-xs text-slate-400 font-normal'>shown above all tasks, markdown supported</span>
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder='Describe the overall goal of this exercise…'
              rows={3}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          {/* Max Score + Language row */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='mb-2 block text-sm font-medium text-slate-700'>Maximum Score</label>
              <input
                type='number'
                value={maxScore}
                onChange={e => setMaxScore(parseInt(e.target.value) || 0)}
                placeholder='100'
                min='1'
                className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
              />
            </div>
            <div>
              <label className='mb-2 block text-sm font-medium text-slate-700'>Language</label>
              <select
                value={language}
                onChange={e => handleLanguageChange(e.target.value)}
                className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
              >
                <option value='javascript'>JavaScript (Node.js)</option>
                <option value='python'>Python</option>
              </select>
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div className='flex items-center justify-between mb-2'>
              <label className='text-sm font-medium text-slate-700'>
                Tasks
                <span className='ml-2 text-xs text-slate-400 font-normal'>
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''} — each has its own editor
                </span>
              </label>
              <Button onClick={addTask} size='sm' variant='outline' className='text-xs'>
                <Plus className='w-3 h-3 mr-1' /> Add Task
              </Button>
            </div>

            <div className='space-y-3'>
              {tasks.map((task, idx) => (
                <TaskEditor
                  key={task.id}
                  task={task}
                  index={idx}
                  canRemove={tasks.length > 1}
                  onChange={updateTask}
                  onRemove={() => removeTask(task.id)}
                />
              ))}
            </div>

            <p className='mt-2 text-xs text-slate-400'>
              Use <code className='bg-slate-100 px-1 rounded'>__test(description, fn)</code> and{' '}
              <code className='bg-slate-100 px-1 rounded'>__expect(value).toBe(expected)</code> in test cases.
              Score is aggregated across all tasks with test cases.
            </p>
          </div>
        </div>

        <div className='mt-6 flex gap-3'>
          <Button
            onClick={onClose}
            className='flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            className='flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
          >
            {!loading && <Save className='mr-2 h-4 w-4' />}
            {editData ? 'Update' : 'Create'} Exercise
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExerciseModal;
