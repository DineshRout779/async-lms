import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import RichTextEditor from '@/components/common/RichTextEditor';
import MarkdownEditor from '@/components/common/MarkdownEditor';
import toast from 'react-hot-toast';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; instructions: string }) => void;
  editData?: {
    title: string;
    instructions?: string;
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
  const [instructions, setInstructions] = useState(editData?.instructions ?? '');
  const [editorType, setEditorType] = useState<'rich' | 'markdown'>('rich');

  useEffect(() => {
    if (isOpen) {
      setTitle(editData?.title ?? '');
      setInstructions(editData?.instructions ?? '');
    }
  }, [isOpen, editData]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Assignment title is required');
      return;
    }
    onSave({
      title: title.trim(),
      instructions: instructions.trim(),
    });
    setTitle('');
    setInstructions('');
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl'>
        <div className='flex items-center justify-between p-6 pb-4'>
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

        <div className='flex-1 overflow-y-auto px-6'>
        <div className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Assignment Title
            </label>
            <input
              type='text'
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g., Build a REST API'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          <div>
            <div className='mb-2 flex items-center justify-between'>
              <label className='text-sm font-medium text-slate-700'>Instructions</label>
              <div className='flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50'>
                <button
                  type='button'
                  onClick={() => setEditorType('rich')}
                  className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${editorType === 'rich' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Rich Text
                </button>
                <button
                  type='button'
                  onClick={() => setEditorType('markdown')}
                  className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${editorType === 'markdown' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Markdown
                </button>
              </div>
            </div>
            {editorType === 'rich' ? (
              <RichTextEditor
                value={instructions}
                onChange={setInstructions}
                placeholder='Detailed instructions for the assignment...'
                minHeight='140px'
              />
            ) : (
              <MarkdownEditor
                value={instructions}
                onChange={setInstructions}
                placeholder='Detailed instructions for the assignment...'
                minHeight='140px'
              />
            )}
          </div>
        </div>
        </div>

        <div className='flex gap-3 border-t border-slate-100 p-6 pt-4'>
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
