import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import RichTextEditor from '@/components/common/RichTextEditor';
import toast from 'react-hot-toast';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    instructions: string;
    max_score: number;
  }) => void;
  editData?: {
    title: string;
    instructions?: string;
    max_score: number;
  };
  unitTitle: string;
  loading?: boolean;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editData,
  unitTitle,
  loading = false,
}) => {
  const [title, setTitle] = useState(editData?.title ?? '');
  const [instructions, setInstructions] = useState(
    editData?.instructions ?? '',
  );
  const [maxScore, setMaxScore] = useState(editData?.max_score ?? 100);

  useEffect(() => {
    if (isOpen) {
      setTitle(editData?.title ?? '');
      setInstructions(editData?.instructions ?? '');
      setMaxScore(editData?.max_score ?? 100);
    }
  }, [isOpen, editData]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Assignment title is required');
      return;
    }
    if (maxScore <= 0) {
      toast.error('Max score must be greater than 0');
      return;
    }
    onSave({
      title: title.trim(),
      instructions: instructions.trim(),
      max_score: maxScore,
    });
    setTitle('');
    setInstructions('');
    setMaxScore(100);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl'>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-bold text-slate-900'>
              {editData ? 'Edit Assignment' : 'Create Assignment'}
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
              Assignment Title
            </label>
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g., Build a REST API'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Instructions
            </label>
            <RichTextEditor
              value={instructions}
              onChange={setInstructions}
              placeholder='Detailed instructions for the assignment...'
              minHeight='140px'
            />
          </div>

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
            {editData ? 'Update' : 'Create'} Assignment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentModal;
