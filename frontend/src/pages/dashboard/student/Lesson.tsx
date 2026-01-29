import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import apiClient from '@/services/api';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* =======================
   Types
======================= */

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  points: number;
  options: QuizOption[];
}

interface Quiz {
  id: string;
  passing_score: number;
  max_score: number;
  questions: QuizQuestion[];
}

interface Exercise {
  id: string;
  title: string;
  instructions: string;
  max_score: number;
}

interface LessonResponse {
  subtopic: {
    id: string;
    title: string;
    description: string;
  };
  lesson: {
    markdown_content: string;
    read_time: number | null;
  };
  quizzes: Quiz[];
  exercises: Exercise[];
}

/* =======================
   Component
======================= */

const Lesson = () => {
  const { subtopicSlug } = useParams<{ subtopicSlug: string }>();
  const [data, setData] = useState<LessonResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/subjects/content/${subtopicSlug}`);
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to load lesson:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (subtopicSlug) fetchLesson();
  }, [subtopicSlug]);

  /* =======================
     States
  ======================= */

  if (loading) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='h-10 w-10 animate-spin text-indigo-600' />
      </div>
    );
  }

  if (!data) {
    return (
      <div className='p-10 text-center text-slate-500'>Lesson not found.</div>
    );
  }

  const { subtopic, lesson, quizzes, exercises } = data;

  /* =======================
     Render
  ======================= */

  return (
    <div className='mx-auto max-w-4xl space-y-10 p-6 md:p-10'>
      {/* Header */}
      <header className='space-y-2'>
        <h1 className='text-4xl font-extrabold tracking-tight text-slate-900'>
          {subtopic.title}
        </h1>
        <div className='flex flex-wrap items-center gap-3 text-sm text-slate-500'>
          {subtopic.description && <p>{subtopic.description}</p>}
          {lesson.read_time && (
            <>
              <span>•</span>
              <p>{lesson.read_time} min read</p>
            </>
          )}
        </div>
      </header>

      {/* Lesson Content */}
      <article className='prose prose-slate max-w-none rounded-3xl border border-slate-100 bg-white p-8 shadow-sm lg:prose-lg'>
        {lesson.markdown_content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {lesson.markdown_content}
          </ReactMarkdown>
        ) : (
          <p className='italic text-slate-400'>Lesson content is empty.</p>
        )}
      </article>

      {/* Quizzes */}
      {quizzes.length > 0 && (
        <section className='space-y-6'>
          <h2 className='text-2xl font-bold text-slate-900'>Quiz</h2>

          {quizzes.map((quiz, qIndex) => (
            <div
              key={quiz.id}
              className='rounded-2xl border border-slate-200 bg-white p-6'
            >
              <p className='mb-2 text-sm font-semibold text-slate-700'>
                Quiz {qIndex + 1} • Pass {quiz.passing_score}/{quiz.max_score}
              </p>

              <div className='space-y-6'>
                {quiz.questions.map((question, idx) => (
                  <div key={question.id} className='space-y-3'>
                    <p className='font-medium'>
                      {idx + 1}. {question.text}
                    </p>

                    {/* Multiple Choice */}
                    {question.type === 'multiple_choice' && (
                      <div className='space-y-2'>
                        {question.options.map((option) => (
                          <label
                            key={option.id}
                            className='flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm'
                          >
                            <input type='radio' disabled />
                            {option.text}
                          </label>
                        ))}
                      </div>
                    )}

                    {/* True / False */}
                    {question.type === 'true_false' && (
                      <div className='flex gap-4'>
                        <label className='flex items-center gap-2'>
                          <input type='radio' disabled /> True
                        </label>
                        <label className='flex items-center gap-2'>
                          <input type='radio' disabled /> False
                        </label>
                      </div>
                    )}

                    {/* Short Answer */}
                    {question.type === 'short_answer' && (
                      <textarea
                        disabled
                        rows={3}
                        placeholder='Your answer...'
                        className='w-full rounded-lg border border-slate-200 p-2 text-sm'
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Exercises */}
      {exercises.length > 0 && (
        <section className='space-y-6'>
          <h2 className='text-2xl font-bold text-slate-900'>Exercises</h2>

          {exercises.map((ex) => (
            <div
              key={ex.id}
              className='rounded-2xl border border-slate-200 bg-white p-6'
            >
              <h3 className='text-lg font-semibold'>{ex.title}</h3>
              <p className='mt-2 text-sm text-slate-600'>{ex.instructions}</p>
              <p className='mt-2 text-xs text-slate-400'>
                Max Score: {ex.max_score}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default Lesson;
