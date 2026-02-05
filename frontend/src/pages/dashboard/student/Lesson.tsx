import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  fetchLesson,
  submitQuiz,
  submitExercise,
  completeLesson,
  setQuizAnswer,
  resetQuiz,
  setExerciseCode,
  resetLessonState,
} from '@/features/lesson/lessonSlice';
import type {
  Quiz,
  Exercise,
  Topic,
  Subtopic,
  SubjectDetailResponse,
} from '@/utils/types';
import apiClient from '@/services/api';

/* =======================
   Component
======================= */

const Lesson = () => {
  const { subtopicSlug, slug } = useParams<{
    subtopicSlug?: string;
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
    exerciseCode,
    submittingExercise,
    lessonCompleted,
  } = useAppSelector((state) => state.lesson);

  const loading = status === 'loading';

  useEffect(() => {
    if (subtopicSlug) {
      dispatch(fetchLesson(subtopicSlug));
    }
    return () => {
      dispatch(resetLessonState());
    };
  }, [subtopicSlug, dispatch]);

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
     Lesson Completion
  ======================= */

  const handleCompleteLesson = async () => {
    const lessonId = data?.lesson?.id;
    if (!lessonId) {
      toast.success('Lesson completed! 🎉');
      return;
    }

    try {
      await dispatch(completeLesson(lessonId)).unwrap();
      toast.success('Lesson completed! +10 points 🎉');
    } catch (error) {
      console.error('Error completing lesson:', error);
      toast.error('Failed to mark lesson complete');
    }
  };

  /* =======================
     Quiz Submission
  ======================= */

  const handleQuizAnswerChange = (questionId: string, value: string) => {
    dispatch(setQuizAnswer({ questionId, value }));
  };

  const calculateQuizScore = (quiz: Quiz): number => {
    let score = 0;
    quiz.questions.forEach((question) => {
      const userAnswer = quizAnswers[question.id];
      if (question.question_type === 'multiple_choice') {
        const correctOption = question.options.find((o) => o.is_correct);
        if (correctOption && userAnswer === correctOption.id) {
          score += question.points;
        }
      } else if (question.question_type === 'true_false') {
        const correctOption = question.options.find((o) => o.is_correct);
        if (correctOption && userAnswer === correctOption.option_text) {
          score += question.points;
        }
      }
    });
    return score;
  };

  const handleSubmitQuiz = async (quiz: Quiz) => {
    const unanswered = quiz.questions.filter((q) => !quizAnswers[q.id]);
    if (unanswered.length > 0) {
      toast.error(
        `Please answer all questions. ${unanswered.length} remaining.`,
      );
      return;
    }

    const score = calculateQuizScore(quiz);
    try {
      await dispatch(submitQuiz({ quizId: quiz.id, score })).unwrap();
      const isPassed = score >= quiz.passing_score;
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

  const handleExerciseCodeChange = (exerciseId: string, code: string) => {
    dispatch(setExerciseCode({ exerciseId, code }));
  };

  const handleSubmitExercise = async (exercise: Exercise) => {
    if (!exerciseCode[exercise.id]?.trim()) {
      toast.error('Please write some code before submitting');
      return;
    }

    try {
      const mockScore = Math.floor(
        Math.random() * (exercise.max_score - 50) + 50,
      );

      await dispatch(
        submitExercise({ exerciseId: exercise.id, score: mockScore }),
      ).unwrap();

      toast.success(
        `Exercise submitted! Score: ${mockScore}/${exercise.max_score} 🎉`,
      );
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error('Failed to submit exercise');
    }
  };

  /* =======================
     Rendering
  ======================= */

  const { lessonIndex, totalLessons, nextLesson } = useMemo<{
    lessonIndex: number | null;
    totalLessons: number | null;
    nextLesson: Subtopic | null;
  }>(() => {
    const flattened = courseStructure.flatMap((topic) =>
      Array.isArray(topic.subtopics) ? topic.subtopics : [],
    );
    const total = flattened.length;
    const currentIndex = flattened.findIndex(
      (item) => item.slug === data?.subtopic?.slug,
    );
    const next = currentIndex >= 0 ? flattened[currentIndex + 1] : null;
    return {
      lessonIndex: currentIndex >= 0 ? currentIndex + 1 : null,
      totalLessons: total || null,
      nextLesson: next || null,
    };
  }, [courseStructure, data?.subtopic?.slug]);

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

      {/* Lesson Content */}
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
          {!lessonCompleted && (
            <Button
              onClick={handleCompleteLesson}
              className='bg-emerald-600 hover:bg-emerald-700'
            >
              <CheckCircle2 className='mr-2 h-4 w-4' />
              Mark as Complete
            </Button>
          )}
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
              <p className='italic text-slate-400'>Lesson content is empty.</p>
            ) : null}
          </div>

          {lessonCompleted && (
            <div className='not-prose mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center'>
              <CheckCircle2 className='mx-auto mb-2 h-7 w-7 text-emerald-600' />
              <p className='font-semibold text-emerald-800'>
                Lesson Completed!
              </p>
              {nextLesson?.slug && slug && (
                <Button
                  variant='outline'
                  className='mt-4 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  onClick={() =>
                    navigate(
                      `/dashboard/student/courses/${slug}/lesson/${nextLesson.slug}`,
                    )
                  }
                >
                  Next Lesson
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Quizzes */}
      {quizzes && quizzes.length > 0 && (
        <section className='space-y-6'>
          <div className='flex items-center gap-2'>
            <Award className='h-6 w-6 text-indigo-600' />
            <h2 className='text-2xl font-bold text-slate-900'>Quiz</h2>
          </div>

          {quizzes.map((quiz, qIndex) => (
            <Card key={quiz.id} className='p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <div>
                  <p className='text-sm font-semibold text-slate-700'>
                    Quiz {qIndex + 1}
                  </p>
                  <p className='text-xs text-slate-500'>
                    Passing Score: {quiz.passing_score}/{quiz.max_score}
                  </p>
                </div>

                {quizSubmitted && quizResults && (
                  <div className='text-right'>
                    <p className='text-lg font-bold text-indigo-600'>
                      {quizResults.attempt.score}/{quiz.max_score}
                    </p>
                    <p className='text-xs text-slate-500'>
                      +{quizResults.points_awarded} points
                    </p>
                  </div>
                )}
              </div>

              <div className='space-y-6'>
                {quiz.questions.map((question, idx) => (
                  <div key={question.id} className='space-y-3'>
                    <div className='flex items-start justify-between'>
                      <p className='font-medium'>
                        {idx + 1}. {question.question_text}
                      </p>
                      <span className='ml-2 text-xs text-slate-500'>
                        {question.points} pts
                      </span>
                    </div>

                    {/* Multiple Choice */}
                    {question.question_type === 'multiple_choice' && (
                      <div className='space-y-2'>
                        {question.options.map((option) => {
                          const isSelected =
                            quizAnswers[question.id] === option.id;
                          const isCorrect = option.is_correct;
                          const showResult = quizSubmitted;

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
                                    : isSelected && !isCorrect
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
                                  handleQuizAnswerChange(question.id, option.id)
                                }
                                disabled={quizSubmitted}
                                className='text-indigo-600'
                              />
                              <span className='flex-1'>
                                {option.option_text}
                              </span>
                              {showResult && isCorrect && (
                                <CheckCircle2 className='h-4 w-4 text-green-600' />
                              )}
                              {showResult && isSelected && !isCorrect && (
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
                          const isSelected = quizAnswers[question.id] === value;
                          const isCorrect = question.options.find(
                            (o) => o.option_text === value,
                          )?.is_correct;
                          const showResult = quizSubmitted;

                          return (
                            <label
                              key={value}
                              className={`flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer ${
                                !quizSubmitted
                                  ? isSelected
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-slate-200'
                                  : isCorrect
                                    ? 'border-green-500 bg-green-50'
                                    : isSelected
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
                              {showResult && isCorrect && (
                                <CheckCircle2 className='h-4 w-4 text-green-600' />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Answer */}
                    {question.question_type === 'short_answer' && (
                      <textarea
                        value={quizAnswers[question.id] || ''}
                        onChange={(e) =>
                          !quizSubmitted &&
                          handleQuizAnswerChange(question.id, e.target.value)
                        }
                        disabled={quizSubmitted}
                        rows={3}
                        placeholder='Your answer...'
                        className='w-full rounded-lg border border-slate-200 p-3 text-sm'
                      />
                    )}

                    {/* Show explanation after submission */}
                    {quizSubmitted && question.explanation && (
                      <div className='rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm'>
                        <p className='font-semibold text-blue-900 mb-1'>
                          Explanation:
                        </p>
                        <p className='text-blue-800'>{question.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className='mt-6 flex gap-3'>
                {!quizSubmitted ? (
                  <Button
                    onClick={() => handleSubmitQuiz(quiz)}
                    disabled={submittingQuiz}
                    className='flex-1 bg-indigo-600 hover:bg-indigo-700'
                  >
                    {submittingQuiz ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Submitting...
                      </>
                    ) : (
                      'Submit Quiz'
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleRetakeQuiz}
                    className='flex-1 border border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                  >
                    Retake Quiz
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </section>
      )}

      {/* Exercises */}
      {exercises && exercises.length > 0 && (
        <section className='space-y-6'>
          <div className='flex items-center gap-2'>
            <TrendingUp className='h-6 w-6 text-indigo-600' />
            <h2 className='text-2xl font-bold text-slate-900'>Exercises</h2>
          </div>

          {exercises.map((ex) => (
            <Card key={ex.id} className='p-6'>
              <h3 className='text-lg font-semibold mb-2'>{ex.title}</h3>
              <p className='text-sm text-slate-600 mb-4'>{ex.instructions}</p>
              <p className='text-xs text-slate-500 mb-4'>
                Max Score: {ex.max_score} points
              </p>

              <textarea
                value={exerciseCode[ex.id] || ''}
                onChange={(e) =>
                  handleExerciseCodeChange(ex.id, e.target.value)
                }
                placeholder='// Write your code here...'
                rows={10}
                className='w-full rounded-lg border border-slate-300 p-3 font-mono text-sm bg-slate-50'
              />

              <div className='mt-4'>
                <Button
                  onClick={() => handleSubmitExercise(ex)}
                  disabled={submittingExercise[ex.id]}
                  className='bg-indigo-600 hover:bg-indigo-700'
                >
                  {submittingExercise[ex.id] ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Submitting...
                    </>
                  ) : (
                    'Submit Exercise'
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};

export default Lesson;
