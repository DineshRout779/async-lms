import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import apiClient from '@/services/api';
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
import toast from 'react-hot-toast';

/* =======================
   Types
======================= */

interface QuizOption {
  id: string;
  option_text: string;
  is_correct: boolean;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  points: number;
  options: QuizOption[];
  explanation?: string;
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
    description: string | null;
  };
  lesson: {
    id?: string; // Optional - may not be returned by API
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
  const [lessonCompleted, setLessonCompleted] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Exercise state
  const [exerciseCode, setExerciseCode] = useState<Record<string, string>>({});
  const [submittingExercise, setSubmittingExercise] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/subjects/content/${subtopicSlug}`);
        console.log('Lesson data:', res.data);
        setData(res.data.data);

        // Mark subtopic as started
        if (res.data.data?.subtopic?.id) {
          try {
            await apiClient.post(
              `/students/progress/subtopic/${res.data.data.subtopic.id}/start`
            );
          } catch (err) {
            console.log('Note: Could not mark subtopic as started:', err);
            // Continue anyway - this is not critical
          }
        }
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
     Lesson Completion
  ======================= */

  const handleCompleteLesson = async () => {
    // Use lesson ID if available, otherwise just mark locally
    const lessonId = data?.lesson?.id;

    if (!lessonId) {
      // If no lesson ID from API, mark as complete locally
      setLessonCompleted(true);
      toast.success('Lesson completed! 🎉');
      return;
    }

    try {
      await apiClient.post(`/students/progress/lesson/${lessonId}/complete`);
      setLessonCompleted(true);
      toast.success('Lesson completed! +10 points 🎉');
    } catch (error) {
      console.error('Error completing lesson:', error);
      // Still mark as complete locally even if API call fails
      setLessonCompleted(true);
      toast.success('Lesson marked as complete');
    }
  };

  /* =======================
     Quiz Submission
  ======================= */

  const handleQuizAnswerChange = (questionId: string, value: any) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
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
      // Short answer requires manual grading
    });

    return score;
  };

  const handleSubmitQuiz = async (quiz: Quiz) => {
    // Validate all questions answered
    const unanswered = quiz.questions.filter((q) => !quizAnswers[q.id]);
    if (unanswered.length > 0) {
      toast.error(
        `Please answer all questions. ${unanswered.length} remaining.`
      );
      return;
    }

    setSubmittingQuiz(true);

    try {
      const score = calculateQuizScore(quiz);
      const res = await apiClient.post(`/students/quiz/${quiz.id}/submit`, {
        score,
      });

      setQuizResults(res.data.data);
      setQuizSubmitted(true);

      const isPassed = score >= quiz.passing_score;
      if (isPassed) {
        toast.success(`Quiz passed! Score: ${score}/${quiz.max_score} 🎉`);
      } else {
        toast.error(
          `Quiz failed. Score: ${score}/${quiz.max_score}. Try again!`
        );
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleRetakeQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizResults(null);
  };

  /* =======================
     Exercise Submission
  ======================= */

  const handleExerciseCodeChange = (exerciseId: string, code: string) => {
    setExerciseCode((prev) => ({
      ...prev,
      [exerciseId]: code,
    }));
  };

  const handleSubmitExercise = async (exercise: Exercise) => {
    if (!exerciseCode[exercise.id]?.trim()) {
      toast.error('Please write some code before submitting');
      return;
    }

    setSubmittingExercise((prev) => ({ ...prev, [exercise.id]: true }));

    try {
      // In a real implementation, you'd evaluate the code
      // For now, we'll give a mock score
      const mockScore = Math.floor(
        Math.random() * (exercise.max_score - 50) + 50
      );

      await apiClient.post(`/students/exercise/${exercise.id}/submit`, {
        score: mockScore,
      });

      toast.success(
        `Exercise submitted! Score: ${mockScore}/${exercise.max_score} 🎉`
      );
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error('Failed to submit exercise');
    } finally {
      setSubmittingExercise((prev) => ({ ...prev, [exercise.id]: false }));
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

  if (!data) {
    return (
      <div className='p-10 text-center text-slate-500'>Lesson not found.</div>
    );
  }

  const { subtopic, lesson, quizzes, exercises } = data;

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
      <Card className='prose prose-slate max-w-none rounded-3xl p-8 lg:prose-lg'>
        {lesson.markdown_content ? (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {lesson.markdown_content}
            </ReactMarkdown>

            {!lessonCompleted && (
              <div className='not-prose mt-8 flex justify-center'>
                <Button
                  onClick={handleCompleteLesson}
                  className='bg-green-600 hover:bg-green-700'
                  size='lg'
                >
                  <CheckCircle2 className='mr-2 h-5 w-5' />
                  Mark as Complete
                </Button>
              </div>
            )}

            {lessonCompleted && (
              <div className='not-prose mt-8 rounded-lg bg-green-50 border border-green-200 p-4 text-center'>
                <CheckCircle2 className='mx-auto mb-2 h-8 w-8 text-green-600' />
                <p className='font-semibold text-green-800'>
                  Lesson Completed!
                </p>
              </div>
            )}
          </>
        ) : (
          <p className='italic text-slate-400'>Lesson content is empty.</p>
        )}
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
                            (o) => o.option_text === value
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
