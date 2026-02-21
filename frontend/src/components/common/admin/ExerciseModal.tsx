import { Button } from '@/components/ui/button';
import type { ExerciseModalProps } from '@/utils/types';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const LANGUAGE_DEFAULTS: Record<string, { name: string; content: string }> = {
  javascript: { name: 'index.js', content: '// Write your solution here\n' },
  python: { name: 'main.py', content: '# Write your solution here\n' },
};

const ExerciseModal: React.FC<ExerciseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editData,
  subtopicTitle,
  loading = false,
}) => {
  const [title, setTitle] = useState(editData?.title ?? '');
  const [instructions, setInstructions] = useState(editData?.instructions ?? '');
  const [maxScore, setMaxScore] = useState(editData?.max_score ?? 100);
  const [language, setLanguage] = useState(editData?.language ?? 'javascript');
  const [initialFiles, setInitialFiles] = useState<{ name: string; content: string }[]>(
    editData?.initial_files?.length
      ? editData.initial_files
      : [{ ...LANGUAGE_DEFAULTS['javascript'] }],
  );

  useEffect(() => {
    if (isOpen) {
      setTitle(editData?.title ?? '');
      setInstructions(editData?.instructions ?? '');
      setMaxScore(editData?.max_score ?? 100);
      const lang = editData?.language ?? 'javascript';
      setLanguage(lang);
      setInitialFiles(
        editData?.initial_files?.length
          ? editData.initial_files
          : [{ ...LANGUAGE_DEFAULTS[lang] }],
      );
    }
  }, [isOpen, editData]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    // Only reset files if they still look like defaults (user hasn't edited yet)
    setInitialFiles((prev) => {
      const isDefault = prev.length === 1 && Object.values(LANGUAGE_DEFAULTS).some(
        (d) => d.name === prev[0].name && prev[0].content.trim() === d.content.trim(),
      );
      return isDefault ? [{ ...LANGUAGE_DEFAULTS[lang] }] : prev;
    });
  };

  const addFile = () => {
    setInitialFiles((prev) => [...prev, { name: '', content: '' }]);
  };

  const removeFile = (index: number) => {
    setInitialFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFile = (index: number, field: 'name' | 'content', value: string) => {
    setInitialFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    );
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
    if (initialFiles.some((f) => !f.name.trim())) {
      toast.error('All files must have a name');
      return;
    }
    onSave({
      title: title.trim(),
      instructions: instructions.trim(),
      max_score: maxScore,
      language,
      initial_files: initialFiles,
    });
    setTitle('');
    setInstructions('');
    setMaxScore(100);
    setLanguage('javascript');
    setInitialFiles([{ ...LANGUAGE_DEFAULTS['javascript'] }]);
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g., Implement Binary Search'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          {/* Instructions */}
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Instructions
              <span className='ml-2 text-xs text-slate-400 font-normal'>Markdown supported</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={'Write instructions in markdown...\n\nExample:\n## Task\nImplement a function that...\n\n```js\nfunction solution() {}\n```'}
              rows={5}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          {/* Max Score */}
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>Maximum Score</label>
            <input
              type='number'
              value={maxScore}
              onChange={(e) => setMaxScore(parseInt(e.target.value) || 0)}
              placeholder='100'
              min='1'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          {/* Language */}
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>Language</label>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            >
              <option value='javascript'>JavaScript (Node.js)</option>
              <option value='python'>Python</option>
            </select>
          </div>

          {/* Initial Files */}
          <div>
            <div className='flex items-center justify-between mb-2'>
              <label className='text-sm font-medium text-slate-700'>
                Starter Files
                <span className='ml-2 text-xs text-slate-400 font-normal'>shown to students when they open the exercise</span>
              </label>
              <Button onClick={addFile} size='sm' variant='outline' className='text-xs'>
                <Plus className='w-3 h-3 mr-1' /> Add File
              </Button>
            </div>

            <div className='space-y-3'>
              {initialFiles.map((file, index) => (
                <div key={index} className='rounded-lg border border-slate-200 overflow-hidden'>
                  <div className='flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200'>
                    <input
                      type='text'
                      value={file.name}
                      onChange={(e) => updateFile(index, 'name', e.target.value)}
                      placeholder='filename.js'
                      className='flex-1 text-xs font-mono bg-transparent outline-none text-slate-700'
                    />
                    {initialFiles.length > 1 && (
                      <button onClick={() => removeFile(index)} className='text-slate-400 hover:text-red-500'>
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={file.content}
                    onChange={(e) => updateFile(index, 'content', e.target.value)}
                    placeholder='// Starter code...'
                    rows={5}
                    className='w-full px-3 py-2 font-mono text-xs text-slate-700 bg-white outline-none resize-y'
                  />
                </div>
              ))}
            </div>
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
