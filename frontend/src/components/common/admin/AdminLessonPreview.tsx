import { X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const getYouTubeEmbedUrl = (url: string): string | null => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]+)/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : null;
};

const AdminLessonPreviewModal = ({
  isOpen,
  onClose,
  content,
  videoUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  videoUrl?: string;
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);

  if (!isOpen) return null;

  const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60'>
      <div className='w-full max-w-195 rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0'>
          <h3 className='text-base font-semibold text-slate-900'>
            {videoUrl ? 'Video Preview' : 'Lesson Preview'}
          </h3>
          <button
            onClick={() => {
              setIframeLoading(true);
              onClose();
            }}
            className='rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors'
          >
            <X className='h-4 w-4' />
          </button>
        </div>

        <div className='overflow-y-auto flex-1 p-6'>
          {videoUrl ? (
            embedUrl ? (
              /* YouTube embed */
              <div className='relative aspect-video w-full rounded-lg overflow-hidden bg-slate-900'>
                {iframeLoading && (
                  <div className='absolute inset-0 flex items-center justify-center bg-slate-900'>
                    <Loader2 className='h-8 w-8 animate-spin text-white/50' />
                  </div>
                )}
                <iframe
                  src={embedUrl}
                  className='h-full w-full'
                  allowFullScreen
                  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                  onLoad={() => setIframeLoading(false)}
                  title='Video preview'
                />
              </div>
            ) : (
              /* Direct video URL (mp4, etc.) */
              <video
                src={videoUrl}
                controls
                className='w-full rounded-lg bg-slate-900'
              />
            )
          ) : (
            <div className='prose prose-slate max-w-none lg:prose-base'>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLessonPreviewModal;
