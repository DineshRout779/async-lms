// Add these modal components to LearningFlow.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

type QuizQuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

interface QuizQuestionOption {
  id?: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  explanation?: string;
  options?: QuizQuestionOption[];
}

// ============================================
// QUIZ QUESTION MODAL
// ============================================

interface QuizQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  onSave: () => void;
  editData?: {
    id: string;
    question_text: string;
    question_type: QuizQuestionType;
    points: number;
    explanation?: string;
  };
}

export const QuizQuestionModal: React.FC<QuizQuestionModalProps> = ({
  isOpen,
  onClose,
  quizId,
  onSave,
  editData,
}) => {
  const [questionText, setQuestionText] = useState(
    editData?.question_text || ''
  );
  const [questionType, setQuestionType] = useState<QuizQuestionType>(
    editData?.question_type || 'multiple_choice'
  );
  const [points, setPoints] = useState(editData?.points || 1);
  const [explanation, setExplanation] = useState(editData?.explanation || '');
  const [options, setOptions] = useState<QuizQuestionOption[]>([]);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<'True' | 'False'>(
    'True'
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setQuestionText(editData.question_text);
      setQuestionType(editData.question_type);
      setPoints(editData.points);
      setExplanation(editData.explanation || '');

      // Fetch existing options
      fetchOptions(editData.id);
    } else {
      // Initialize with empty options for multiple choice
      if (questionType === 'multiple_choice') {
        setOptions([
          { option_text: '', is_correct: false, order_index: 0 },
          { option_text: '', is_correct: false, order_index: 1 },
        ]);
      } else if (questionType === 'true_false') {
        setOptions([
          { option_text: 'True', is_correct: true, order_index: 0 },
          { option_text: 'False', is_correct: false, order_index: 1 },
        ]);
        setTrueFalseAnswer('True');
      }
    }
  }, [editData, questionType]);

  const fetchOptions = async (questionId: string) => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: QuizQuestionOption[];
      }>(
        `/admin/quiz-questions/${questionId}/options`
      );
      if (res.data.success) {
        setOptions(res.data.data);
        const correct = res.data.data.find(
          (opt) => opt.is_correct
        );
        if (correct?.option_text === 'False') {
          setTrueFalseAnswer('False');
        } else {
          setTrueFalseAnswer('True');
        }
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleAddOption = () => {
    setOptions([
      ...options,
      {
        option_text: '',
        is_correct: false,
        order_index: options.length,
      },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (
    index: number,
    field: keyof QuizQuestionOption,
    value: string | boolean | number
  ) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleSave = async () => {
    if (!questionText.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (questionType === 'multiple_choice' && options.length < 2) {
      toast.error('Multiple choice questions need at least 2 options');
      return;
    }

    if (
      questionType === 'multiple_choice' &&
      !options.some((o) => o.is_correct)
    ) {
      toast.error('At least one option must be marked as correct');
      return;
    }

    try {
      setLoading(true);

      // Create or update question
      const questionData = {
        quiz_id: quizId,
        question_text: questionText,
        question_type: questionType,
        points: points,
        explanation: explanation,
      };

      let questionId: string;
      if (editData) {
        const res = await apiClient.put<{ data: { id: string } }>(
          `/admin/quiz-questions/${editData.id}`,
          questionData
        );
        questionId = res.data.data.id;
      } else {
        const res = await apiClient.post<{ data: { id: string } }>(
          '/admin/quiz-questions',
          questionData
        );
        questionId = res.data.data.id;
      }

      // Create or update options (for multiple choice / true-false)
      if (questionType === 'multiple_choice' || questionType === 'true_false') {
        if (editData) {
          await Promise.all(
            options
              .filter((o) => o.id)
              .map((o) =>
                apiClient.delete(`/admin/quiz-question-options/${o.id}`)
              )
          );
        }

        const finalOptions =
          questionType === 'true_false'
            ? [
                {
                  option_text: 'True',
                  is_correct: trueFalseAnswer === 'True',
                  order_index: 0,
                },
                {
                  option_text: 'False',
                  is_correct: trueFalseAnswer === 'False',
                  order_index: 1,
                },
              ]
            : options.map((option, index) => ({
                option_text: option.option_text,
                is_correct: option.is_correct,
                order_index: index,
              }));

        await Promise.all(
          finalOptions.map((option) =>
            apiClient.post('/admin/quiz-question-options', {
              question_id: questionId,
              option_text: option.option_text,
              is_correct: option.is_correct,
              order_index: option.order_index,
            })
          )
        );
      }

      toast.success(editData ? 'Question updated!' : 'Question created!');
      onSave();
      onClose();
    } catch (error: unknown) {
      console.error('Error saving question:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto'>
      <div className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto'>
        <div className='mb-4 flex items-center justify-between sticky top-0 bg-white pb-4 border-b'>
          <h3 className='text-lg font-bold text-slate-900'>
            {editData ? 'Edit Question' : 'Add Question'}
          </h3>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-600'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-4'>
          {/* Question Type */}
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Question Type
            </label>
            <select
              value={questionType}
              onChange={(e) =>
                setQuestionType(e.target.value as QuizQuestionType)
              }
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
              disabled={!!editData}
            >
              <option value='multiple_choice'>Multiple Choice</option>
              <option value='true_false'>True/False</option>
              <option value='short_answer'>Short Answer</option>
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Question Text *
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder='Enter your question...'
              rows={3}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          {/* Points */}
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Points
            </label>
            <input
              type='number'
              value={points}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10);
                setPoints(Number.isNaN(next) ? 1 : next);
              }}
              min={1}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          {/* Options (for multiple choice) */}
          {questionType === 'multiple_choice' && (
            <div>
              <div className='mb-2 flex items-center justify-between'>
                <label className='text-sm font-medium text-slate-700'>
                  Answer Options
                </label>
                <Button
                  onClick={handleAddOption}
                  size='sm'
                  className='bg-indigo-600 hover:bg-indigo-700'
                >
                  <Plus className='mr-1 h-4 w-4' />
                  Add Option
                </Button>
              </div>

              <div className='space-y-2'>
                {options.map((option, index) => (
                  <div key={index} className='flex gap-2 items-start'>
                    <input
                      type='checkbox'
                      checked={option.is_correct}
                      onChange={(e) =>
                        handleOptionChange(
                          index,
                          'is_correct',
                          e.target.checked
                        )
                      }
                      className='mt-3'
                      title='Mark as correct answer'
                    />
                    <input
                      type='text'
                      value={option.option_text}
                      onChange={(e) =>
                        handleOptionChange(index, 'option_text', e.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      className='flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500'
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(index)}
                        className='mt-2 text-red-500 hover:text-red-700'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className='mt-2 text-xs text-slate-500'>
                ✓ Check the box next to the correct answer(s)
              </p>
            </div>
          )}

          {/* True/False Correct Answer */}
          {questionType === 'true_false' && (
            <div>
              <label className='mb-2 block text-sm font-medium text-slate-700'>
                Correct Answer
              </label>
              <div className='flex gap-4'>
                {(['True', 'False'] as const).map((value) => (
                  <label
                    key={value}
                    className='flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                  >
                    <input
                      type='radio'
                      name='true-false-answer'
                      checked={trueFalseAnswer === value}
                      onChange={() => setTrueFalseAnswer(value)}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Explanation (Optional)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder='Explain the correct answer...'
              rows={2}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>
        </div>

        <div className='mt-6 flex gap-3 sticky bottom-0 bg-white pt-4 border-t'>
          <Button
            onClick={onClose}
            className='flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className='flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
            disabled={loading}
          >
            <Save className='mr-2 h-4 w-4' />
            {loading ? 'Saving...' : editData ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// QUIZ QUESTIONS LIST COMPONENT
// ============================================

interface QuizQuestionsListProps {
  quizId: string;
  subtopicTitle: string;
}

export const QuizQuestionsList: React.FC<QuizQuestionsListProps> = ({
  quizId,
  subtopicTitle,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(
    null
  );

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{
        success: boolean;
        data: QuizQuestion[];
      }>(`/admin/quizzes/${quizId}/questions`);
      if (res.data.success) {
        setQuestions(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await apiClient.delete(`/admin/quiz-questions/${questionId}`);
      toast.success('Question deleted');
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h4 className='text-sm font-semibold text-slate-700'>
          Quiz Questions for: {subtopicTitle}
        </h4>
        <Button
          onClick={() => {
            setEditingQuestion(null);
            setModalOpen(true);
          }}
          size='sm'
          className='bg-indigo-600 hover:bg-indigo-700'
        >
          <Plus className='mr-1 h-4 w-4' />
          Add Question
        </Button>
      </div>

      {loading ? (
        <p className='text-sm text-slate-500'>Loading questions...</p>
      ) : questions.length === 0 ? (
        <p className='text-sm italic text-slate-400'>
          No questions added yet. Click "Add Question" to get started.
        </p>
      ) : (
        <div className='space-y-3'>
          {questions.map((q, index) => (
            <div
              key={q.id}
              className='rounded-lg border border-slate-200 bg-white p-4'
            >
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-xs font-bold text-slate-500'>
                      Q{index + 1}
                    </span>
                    <span className='rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700'>
                      {q.question_type.replace('_', ' ')}
                    </span>
                    <span className='text-xs text-slate-500'>
                      {q.points} {q.points === 1 ? 'point' : 'points'}
                    </span>
                  </div>
                  <p className='text-sm font-medium text-slate-900'>
                    {q.question_text}
                  </p>

                  {/* Show options for multiple choice */}
                  {q.question_type === 'multiple_choice' && q.options && (
                    <div className='mt-2 space-y-1'>
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`text-xs ${
                            opt.is_correct
                              ? 'text-green-700 font-medium'
                              : 'text-slate-600'
                          }`}
                        >
                          {opt.is_correct && '✓ '}
                          {opt.option_text}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.explanation && (
                    <p className='mt-2 text-xs text-slate-500 italic'>
                      Explanation: {q.explanation}
                    </p>
                  )}
                </div>

                <div className='flex gap-2'>
                  <button
                    onClick={() => {
                      setEditingQuestion(q);
                      setModalOpen(true);
                    }}
                    className='text-indigo-600 hover:text-indigo-700'
                  >
                    <Edit2 className='h-4 w-4' />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className='text-red-500 hover:text-red-700'
                  >
                    <Trash2 className='h-4 w-4' />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <QuizQuestionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingQuestion(null);
        }}
        quizId={quizId}
        onSave={fetchQuestions}
        editData={editingQuestion ?? undefined}
      />
    </div>
  );
};
