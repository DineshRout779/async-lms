import { Button } from '@/components/ui/button';
import type { QuizModalProps } from '@/utils/types';
import { Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editData,
  unitTitle,
}) => {
  const [passingScore, setPassingScore] = useState(
    editData?.passing_score ?? 70,
  );
  const [maxScore, setMaxScore] = useState(editData?.max_score ?? 100);

  const handleSave = () => {
    if (passingScore <= 0 || maxScore <= 0) {
      toast.error('Scores must be greater than 0');
      return;
    }
    if (passingScore > maxScore) {
      toast.error('Passing score cannot exceed max score');
      return;
    }
    onSave({
      passing_score: passingScore,
      max_score: maxScore,
    });
    setPassingScore(70);
    setMaxScore(100);
  };

  useEffect(() => {
    if (isOpen) {
      setPassingScore(editData?.passing_score ?? 70);
      setMaxScore(editData?.max_score ?? 100);
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-xl'>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-bold text-slate-900'>
              {editData ? 'Update' : 'Create'} Quiz
            </h3>
            <p className='text-sm text-slate-500'>Unit: {unitTitle}</p>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-600'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Maximum Score
            </label>
            <input
              type='number'
              value={maxScore}
              onChange={(e) => setMaxScore(parseInt(e.target.value) || 0)}
              placeholder='100'
              min='1'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Passing Score
            </label>
            <input
              type='number'
              value={passingScore}
              onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
              placeholder='70'
              min='1'
              max={maxScore}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
            <p className='mt-1 text-xs text-slate-500'>
              Students must score at least {passingScore} out of {maxScore} to
              pass
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
            className='flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
          >
            <Save className='mr-2 h-4 w-4' />
            {editData ? 'Update' : 'Create'} Quiz
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizModal;
