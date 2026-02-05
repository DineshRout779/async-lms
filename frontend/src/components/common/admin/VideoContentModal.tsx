import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type VideoContentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    content_type: 'video';
    markdown_path: string;
    estimated_read_time?: number;
    video_url: string;
  }) => void;
  subtopicTitle: string;
  editData?: { video_url: string; estimated_read_time?: number };
};

const VideoContentModal: React.FC<VideoContentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subtopicTitle,
  editData,
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [readTime, setReadTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;
    setVideoUrl(editData?.video_url ?? '');
    setReadTime(editData?.estimated_read_time);
  }, [editData, isOpen]);

  const handleSave = () => {
    if (!videoUrl.trim()) {
      toast.error('Video URL is required');
      return;
    }
    onSave({
      content_type: 'video',
      markdown_path: '',
      estimated_read_time: readTime,
      video_url: videoUrl.trim(),
    });
    setVideoUrl('');
    setReadTime(undefined);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-xl'>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-bold text-slate-900'>
              {editData ? 'Update Video Content' : 'Add Video Content'}
            </h3>
            <p className='text-sm text-slate-500'>Subtopic: {subtopicTitle}</p>
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
              YouTube / Video URL
            </label>
            <input
              type='text'
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder='https://youtube.com/...'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Estimated Read Time (minutes)
            </label>
            <input
              type='number'
              value={readTime || ''}
              onChange={(e) =>
                setReadTime(
                  e.target.value ? parseInt(e.target.value, 10) : undefined
                )
              }
              placeholder='10'
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
            className='flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
          >
            <Save className='mr-2 h-4 w-4' />
            {editData ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoContentModal;
