import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
} from 'lucide-react';
import ExerciseEditor from '@/components/common/ExerciseEditor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  fetchLesson,
  submitQuiz,
  submitExercise,
  completeLesson,
  fetchExercise,
  fetchQuiz,
  setQuizAnswer,
  resetQuiz,
  resetLessonState,
} from '@/features/lesson/lessonSlice';
import type { Quiz, Topic, SubjectDetailResponse } from '@/utils/types';
import apiClient from '@/services/api';

/* =======================
   Types
======================= */

type FlattenedItem = {
  type: 'subtopic' | 'assignment' | 'quiz';
  id: string;
  quiz_id?: string;
  slug?: string;
  title?: string;
};

/* =======================
   Component
======================= */

const Lesson = () => {
  const { subtopicSlug, exerciseId, quizId, slug } = useParams<{
    subtopicSlug?: string;
    exerciseId?: string;
    quizId?: string;
    slug?: string;
  }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [courseStructure, setCourseStructure] = useState<Topic[]>([]);
  const {
    data,
    status,
    quizAnswers,
    quizSubmitted,
    quizResults,
    submittingQuiz,
    submittingExercise,
    lessonCompleted,
  } = useAppSelector((state) => state.lesson);

  const [isNavigating, setIsNavigating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const loading = status === 'loading';

  useEffect(() => {
    if (subtopicSlug) {
      dispatch(fetchLesson(subtopicSlug));
    } else if (exerciseId) {
      dispatch(fetchExercise(exerciseId));
    } else if (quizId) {
      dispatch(fetchQuiz(quizId));
    }
    return () => {
      dispatch(resetLessonState());
    };
  }, [subtopicSlug, exerciseId, quizId, dispatch]);

  useEffect(() => {
    const fetchStructure = async () => {
      if (!slug) return;
      try {
        const response = await apiClient.get<SubjectDetailResponse>(
          `/subjects/${slug}`,
        );
        setCourseStructure(response.data?.data || []);
      } catch (error) {
        console.error('Failed to load course structure:', error);
      }
    };

    fetchStructure();
  }, [slug]);

  const getEmbedUrl = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) {
        const v = u.searchParams.get('v');
        if (v) return `https://www.youtube.com/embed/${v}`;
      }
      if (u.hostname === 'youtu.be') {
        const id = u.pathname.replace('/', '');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    } catch {
      console.log('Error embedding video');
    }
    return url;
  };

  /* =======================
     Data Processing
  ======================= */

  const { lessonIndex, totalLessons, nextItem } = useMemo<{
    lessonIndex: number | null;
    totalLessons: number | null;
    nextItem: {
      type: 'subtopic' | 'exercise' | 'quiz' | 'assignment';
      slug?: string;
      id?: string;
    } | null;
  }>(() => {
    const flattened: FlattenedItem[] = [];
    courseStructure.forEach((topic) => {
      (topic.units || []).forEach((unit) => {
        (unit.subtopics || []).forEach((sub) => {
          flattened.push({ ...sub, type: 'subtopic' });
        });
        (unit.assignments || []).forEach((assignment) => {
          flattened.push({ ...assignment, type: 'assignment' });
        });
        (unit.quizzes || []).forEach((quiz) => {
          flattened.push({
            ...quiz,
            type: 'quiz',
            title: `Unit Quiz: ${unit.title}`,
          });
        });
      });
    });

    const total = flattened.length;

    const currentIndex = flattened.findIndex((item) => {
      if (subtopicSlug && item.type === 'subtopic')
        return item.slug === subtopicSlug;
      if (quizId && item.type === 'quiz')
        return (item.id || item.quiz_id) === quizId;
      return false;
    });

    const next = currentIndex >= 0 ? flattened[currentIndex + 1] : null;

    return {
      lessonIndex: currentIndex >= 0 ? currentIndex + 1 : null,
      totalLessons: total || null,
      nextItem: next
        ? {
            type: next.type,
            slug: next.slug,
            id: next.id || next.quiz_id,
          }
        : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseStructure, subtopicSlug, exerciseId, quizId]);

  /* =======================
     Lesson Completion
  ======================= */

  const handleCompleteLesson = async () => {
    const lessonId = data?.lesson?.id;
    setIsCompleting(true);
    console.log('[Lesson] handleCompleteLesson called', {
      lessonId,
      nextItem,
      slug,
    });

    if (!lessonId) {
      toast.success('Lesson completed! 🎉');
      return;
    }

    try {
      await dispatch(completeLesson(lessonId)).unwrap();
      toast.success('Lesson completed! +10 points 🎉');
      setIsNavigating(true);
    } catch (error) {
      console.error('Error completing lesson:', error);
      toast.error('Failed to mark lesson complete');
    } finally {
      setIsCompleting(false);
    }
  };

  useEffect(() => {
    if (lessonCompleted && isNavigating && nextItem && slug) {
      const nextUrl =
        nextItem.type === 'subtopic'
          ? `/dashboard/student/courses/${slug}/lesson/${nextItem.slug}`
          : nextItem.type === 'exercise'
            ? `/dashboard/student/courses/${slug}/exercise/${nextItem.id}`
            : `/dashboard/student/courses/${slug}/quiz/${nextItem.id}`;

      console.log('[Lesson] Auto-navigating to', nextUrl);
      const timer = setTimeout(() => {
        navigate(nextUrl);
        setIsNavigating(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lessonCompleted, isNavigating, nextItem, slug, navigate]);

  /* =======================
     Quiz Submission
  ======================= */

  const handleQuizAnswerChange = (questionId: string, value: string) => {
    dispatch(setQuizAnswer({ questionId, value }));
  };

  const handleSubmitQuiz = async (quiz: Quiz) => {
    const unanswered = quiz.questions.filter((q) => !quizAnswers[q.id]);
    if (unanswered.length > 0) {
      toast.error(
        `Please answer all questions. ${unanswered.length} remaining.`,
      );
      return;
    }

    try {
      const result = await dispatch(
        submitQuiz({ quizId: quiz.id, answers: quizAnswers }),
      ).unwrap();
      const score = result.attempt.score;
      const isPassed = result.attempt.is_passed;
      if (isPassed) {
        toast.success(`Quiz passed! Score: ${score}/${quiz.max_score} 🎉`);
      } else {
        toast.error(
          `Quiz failed. Score: ${score}/${quiz.max_score}. Try again!`,
        );
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    }
  };

  const handleRetakeQuiz = () => {
    dispatch(resetQuiz());
  };

  /* =======================
     Exercise Submission
  ======================= */

  const handleSubmitExercise = async (exerciseId: string) => {
    try {
      const result = await dispatch(submitExercise({ exerciseId })).unwrap();
      const score = result?.score ?? null;
      toast.success(
        score !== null
          ? `Exercise submitted! Score: ${score} 🎉`
          : 'Exercise submitted! 🎉',
      );
      if (!lessonCompleted) {
        setIsNavigating(true);
      }
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error('Failed to submit exercise');
    }
  };

  /* =======================
     Rendering
  ======================= */

  if (loading) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='h-10 w-10 animate-spin text-indigo-600' />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className='flex h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center'>
        <XCircle className='h-12 w-12 text-red-400' />
        <p className='text-lg font-semibold text-slate-700'>
          Failed to load content
        </p>
        <p className='text-sm text-slate-500'>
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className='p-10 text-center text-slate-500'>
        Lesson not found or locked
      </div>
    );
  }

  const { subtopic, lesson, quizzes, exercises } = data;
  const hasMarkdown = Boolean(lesson.markdown_content);

  return (
    <div className='mx-auto max-w-4xl space-y-10 p-6 md:p-10'>
      {/* Header */}
      <header className='space-y-4'>
        <div className='flex flex-wrap items-center gap-3'>
          <h1 className='text-4xl font-extrabold tracking-tight text-slate-900'>
            {subtopic.title}
          </h1>
          {lessonCompleted && (
            <Badge className='bg-emerald-50 text-emerald-700 border border-emerald-200'>
              Completed
            </Badge>
          )}
        </div>

        {subtopic.description && (
          <p className='text-base text-slate-600'>{subtopic.description}</p>
        )}

        <div className='flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400'>
          {lessonIndex && totalLessons && (
            <Badge className='bg-blue-50 text-blue-700 border border-blue-200'>
              Lesson {lessonIndex} of {totalLessons}
            </Badge>
          )}
          <Badge className='bg-slate-100 text-slate-600 border border-slate-200'>
            {lesson.content_type || 'Lesson'}
          </Badge>
          {lesson.read_time && (
            <span className='text-slate-500 normal-case font-medium'>
              {lesson.read_time} min read
            </span>
          )}
          {lesson.video_url && (
            <span className='text-slate-500 normal-case font-medium'>
              Video included
            </span>
          )}
        </div>
      </header>

      {/* Lesson Content — hidden on pure quiz pages */}
      {lesson.content_type !== 'quiz' && (
        <Card className='overflow-hidden rounded-3xl border border-slate-200 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-6 py-4'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-widest text-slate-400'>
                Lesson Content
              </p>
              <p className='text-sm text-slate-600'>
                Follow the material, then complete to unlock the next lesson
              </p>
            </div>
          </div>

          <div className='bg-white px-6 py-8'>
            {lesson.video_url && (
              <div className='not-prose mb-6'>
                <div className='aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-black'>
                  <iframe
                    className='h-full w-full'
                    src={getEmbedUrl(lesson.video_url)}
                    title='Lesson video'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            <div className='prose prose-slate max-w-none lg:prose-lg'>
              {hasMarkdown ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {lesson.markdown_content}
                </ReactMarkdown>
              ) : !lesson.video_url ? (
                <p className='italic text-slate-400'>
                  Lesson content is empty.
                </p>
              ) : null}
            </div>

            {!lessonCompleted && (
              <div className='mt-10 flex justify-center border-t border-slate-100 pt-8'>
                <Button
                  onClick={handleCompleteLesson}
                  loading={isCompleting || isNavigating}
                  size='lg'
                  className='bg-emerald-600 px-8 py-6 text-lg font-bold shadow-lg hover:bg-emerald-700 transition-all'
                >
                  <CheckCircle2 className='mr-2 h-6 w-6' />
                  Mark as Read & Next
                </Button>
              </div>
            )}

            {lessonCompleted && (
              <div className='not-prose mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center'>
                <CheckCircle2 className='mx-auto mb-2 h-7 w-7 text-emerald-600' />
                <p className='font-semibold text-emerald-800'>
                  {lesson.content_type === 'exercise'
                    ? 'Exercise Completed!'
                    : 'Lesson Completed!'}
                </p>
                {nextItem && slug && (
                  <Button
                    variant='outline'
                    className='mt-4 border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700'
                    onClick={() => {
                      const nextUrl =
                        nextItem.type === 'subtopic'
                          ? `/dashboard/student/courses/${slug}/lesson/${nextItem.slug}`
                          : nextItem.type === 'exercise'
                            ? `/dashboard/student/courses/${slug}/exercise/${nextItem.id}`
                            : `/dashboard/student/courses/${slug}/quiz/${nextItem.id}`;
                      navigate(nextUrl);
                    }}
                  >
                    Next{' '}
                    {nextItem.type === 'subtopic'
                      ? 'Lesson'
                      : nextItem.type === 'exercise'
                        ? 'Exercise'
                        : 'Quiz'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Quizzes */}
      {quizId && quizzes && quizzes.length > 0 && (
        <section className='space-y-6'>
          <div className='flex items-center gap-2'>
            <Award className='h-6 w-6 text-indigo-600' />
            <h2 className='text-2xl font-bold text-slate-900'>Quiz</h2>
          </div>

          {quizzes.map((quiz) => {
            const effectiveMax = quiz.questions.reduce(
              (sum, q) => sum + q.points,
              0,
            );
            const answeredCount = quiz.questions.filter(
              (q) => quizAnswers[q.id],
            ).length;
            const isPassed =
              quizSubmitted &&
              quizResults &&
              quizResults.attempt.score >= quiz.passing_score;

            return (
              <Card key={quiz.id} className='p-6'>
                {/* Quiz Header */}
                <div className='mb-6 flex items-start justify-between gap-4'>
                  <div>
                    <p className='text-lg font-bold text-slate-800'>
                      {quiz.title || 'Unit Quiz'}
                    </p>
                    <p className='text-xs text-slate-500 mt-0.5'>
                      {quiz.questions.length} questions &bull; Pass at{' '}
                      {quiz.passing_score}/{effectiveMax} pts
                    </p>
                  </div>
                  {!quizSubmitted && (
                    <span className='shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-600'>
                      {answeredCount}/{quiz.questions.length} answered
                    </span>
                  )}
                </div>

                {/* Questions */}
                <div className='space-y-6'>
                  {quiz.questions.map((question, idx) => (
                    <div key={question.id} className='space-y-3'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='font-medium flex items-start gap-1 flex-1 prose prose-sm max-w-none'>
                          <span className='shrink-0'>{idx + 1}.</span>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {question.question_text}
                          </ReactMarkdown>
                        </div>
                        <span className='shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600'>
                          {question.points} pt{question.points !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Multiple Choice */}
                      {question.question_type === 'multiple_choice' && (
                        <div className='space-y-2'>
                          {question.options.map((option) => {
                            const isSelected =
                              quizAnswers[question.id] === option.id;
                            const qResult =
                              quizResults?.question_results?.[question.id];
                            const isCorrect =
                              quizSubmitted &&
                              qResult?.correct_option_id === option.id;
                            const isWrong =
                              quizSubmitted &&
                              isSelected &&
                              !qResult?.is_correct;
                            return (
                              <label
                                key={option.id}
                                className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${
                                  !quizSubmitted
                                    ? isSelected
                                      ? 'border-indigo-500 bg-indigo-50'
                                      : 'border-slate-200 hover:bg-slate-50'
                                    : isCorrect
                                      ? 'border-green-500 bg-green-50'
                                      : isWrong
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-slate-200'
                                }`}
                              >
                                <input
                                  type='radio'
                                  name={question.id}
                                  checked={isSelected}
                                  onChange={() =>
                                    !quizSubmitted &&
                                    handleQuizAnswerChange(
                                      question.id,
                                      option.id,
                                    )
                                  }
                                  disabled={quizSubmitted}
                                  className='text-indigo-600'
                                />
                                <span className='flex-1'>
                                  {option.option_text}
                                </span>
                                {isCorrect && (
                                  <CheckCircle2 className='h-4 w-4 text-green-600' />
                                )}
                                {isWrong && (
                                  <XCircle className='h-4 w-4 text-red-600' />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* True / False */}
                      {question.question_type === 'true_false' && (
                        <div className='flex gap-4'>
                          {['True', 'False'].map((value) => {
                            const isSelected =
                              quizAnswers[question.id] === value;
                            const qResult =
                              quizResults?.question_results?.[question.id];
                            const isCorrect =
                              quizSubmitted &&
                              qResult?.correct_option_text === value;
                            const isWrong =
                              quizSubmitted &&
                              isSelected &&
                              !qResult?.is_correct;
                            return (
                              <label
                                key={value}
                                className={`flex items-center gap-2 rounded-lg border px-6 py-3 cursor-pointer transition-colors ${
                                  !quizSubmitted
                                    ? isSelected
                                      ? 'border-indigo-500 bg-indigo-50'
                                      : 'border-slate-200 hover:bg-slate-50'
                                    : isCorrect
                                      ? 'border-green-500 bg-green-50'
                                      : isWrong
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-slate-200'
                                }`}
                              >
                                <input
                                  type='radio'
                                  name={question.id}
                                  checked={isSelected}
                                  onChange={() =>
                                    !quizSubmitted &&
                                    handleQuizAnswerChange(question.id, value)
                                  }
                                  disabled={quizSubmitted}
                                />
                                {value}
                                {isCorrect && (
                                  <CheckCircle2 className='ml-1 h-4 w-4 text-green-600' />
                                )}
                                {isWrong && (
                                  <XCircle className='ml-1 h-4 w-4 text-red-600' />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* Short Answer */}
                      {question.question_type === 'short_answer' && (
                        <div>
                          <textarea
                            value={quizAnswers[question.id] || ''}
                            onChange={(e) =>
                              !quizSubmitted &&
                              handleQuizAnswerChange(
                                question.id,
                                e.target.value,
                              )
                            }
                            disabled={quizSubmitted}
                            rows={3}
                            placeholder='Write your answer here...'
                            className='w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200'
                          />
                          {quizSubmitted && (
                            <p className='mt-1 text-xs italic text-slate-400'>
                              Short answers are reviewed manually.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Explanation after submission */}
                      {quizSubmitted && question.explanation && (
                        <div className='rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm'>
                          <p className='font-semibold text-blue-900 mb-1'>
                            Explanation:
                          </p>
                          <div className='text-blue-800 prose prose-sm max-w-none prose-p:my-0'>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {question.explanation}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Submit Button */}
                {!quizSubmitted && (
                  <div className='mt-8 border-t border-slate-100 pt-6'>
                    <Button
                      onClick={() => handleSubmitQuiz(quiz)}
                      loading={submittingQuiz}
                      className='w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-semibold'
                    >
                      Submit Quiz
                    </Button>
                  </div>
                )}

                {/* Results Panel */}
                {quizSubmitted && quizResults && (
                  <div
                    className={`mt-8 rounded-2xl border p-6 text-center ${
                      isPassed
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className='mx-auto mb-3 h-10 w-10 text-emerald-600' />
                    ) : (
                      <XCircle className='mx-auto mb-3 h-10 w-10 text-orange-500' />
                    )}
                    <p
                      className={`text-lg font-bold ${
                        isPassed ? 'text-emerald-800' : 'text-orange-800'
                      }`}
                    >
                      {isPassed ? 'Quiz Passed! 🎉' : 'Not quite — try again!'}
                    </p>
                    <p className='mt-2 text-4xl font-extrabold text-slate-900'>
                      {quizResults.attempt.score}
                      <span className='text-xl font-semibold text-slate-400'>
                        /{effectiveMax}
                      </span>
                    </p>
                    <p className='mt-1 text-sm text-slate-500'>
                      Passing score: {quiz.passing_score} pts
                      {quizResults.points_awarded > 0 &&
                        ` • +${quizResults.points_awarded} XP earned`}
                    </p>

                    <div className='mt-6 flex gap-3'>
                      <Button
                        variant='outline'
                        onClick={handleRetakeQuiz}
                        className={`flex-1 ${
                          isPassed
                            ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700'
                            : 'border-orange-300 text-orange-700 hover:bg-orange-100 hover:text-orange-700'
                        }`}
                      >
                        Retake Quiz
                      </Button>
                      {isPassed && slug && (
                        <Button
                          className='flex-1 bg-emerald-600 hover:bg-emerald-700'
                          onClick={() => {
                            const nextUrl = nextItem
                              ? nextItem.type === 'subtopic'
                                ? `/dashboard/student/courses/${slug}/lesson/${nextItem.slug}`
                                : nextItem.type === 'exercise'
                                  ? `/dashboard/student/courses/${slug}/exercise/${nextItem.id}`
                                  : nextItem.type === 'quiz'
                                    ? `/dashboard/student/courses/${slug}/quiz/${nextItem.id}`
                                    : `/dashboard/student/courses/${slug}`
                              : `/dashboard/student/courses/${slug}`;
                            navigate(nextUrl);
                          }}
                        >
                          {nextItem ? 'Continue →' : 'Back to Course'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </section>
      )}

      {/* Exercises */}
      {exercises && exercises.length > 0 && (
        <section className='space-y-6'>
          <div className='flex items-center gap-2'>
            <TrendingUp className='h-6 w-6 text-indigo-600' />
            <h2 className='text-2xl font-bold text-slate-900'>Exercises</h2>
          </div>

          {exercises.length === 1 ? (
            <ExerciseEditor
              exercise={exercises[0]}
              submitting={!!submittingExercise[exercises[0].id]}
              onSubmit={handleSubmitExercise}
            />
          ) : (
            <Tabs defaultValue={exercises[0].id}>
              <TabsList className='mb-4'>
                {exercises.map((ex) => (
                  <TabsTrigger
                    key={ex.id}
                    value={ex.id}
                    className='max-w-40 truncate'
                  >
                    {ex.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {exercises.map((ex) => (
                <TabsContent key={ex.id} value={ex.id}>
                  <ExerciseEditor
                    exercise={ex}
                    submitting={!!submittingExercise[ex.id]}
                    onSubmit={handleSubmitExercise}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </section>
      )}
    </div>
  );
};

export default Lesson;
