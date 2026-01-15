import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import apiClient from '@/services/api';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LessonData {
  title: string;
  description: string;
  markdown_content: string;
  read_time: number;
}

const Lesson = () => {
  const { subtopicSlug } = useParams<{ subtopicSlug: string }>();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        setLoading(true);
        // Single API call now returns the metadata AND the text content
        const response = await apiClient.get(
          `/subjects/content/${subtopicSlug}`
        );
        setLesson(response.data.data);
      } catch (err) {
        console.error('Failed to load lesson:', err);
        setLesson(null);
      } finally {
        setLoading(false);
      }
    };

    if (subtopicSlug) fetchLesson();
  }, [subtopicSlug]);

  if (loading) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='w-10 h-10 animate-spin text-blue-600' />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className='p-10 text-center text-slate-500'>Lesson not found.</div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-500'>
      <div className='space-y-2'>
        <h1 className='text-4xl font-extrabold text-slate-900 tracking-tight'>
          {lesson.title}
        </h1>
        <div className='flex items-center gap-4 text-sm text-slate-500'>
          <p>{lesson.description}</p>
          <span>•</span>
          <p>{lesson.read_time} min read</p>
        </div>
      </div>

      <article className='prose prose-slate lg:prose-lg max-w-none bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-sm'>
        {lesson.markdown_content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {lesson.markdown_content}
          </ReactMarkdown>
        ) : (
          <p className='text-red-500 text-center italic'>
            Markdown content is empty.
          </p>
        )}
      </article>
    </div>
  );
};

export default Lesson;
