import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  X,
  Save,
  Plus,
  Trash2,
  Edit2,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

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
  addedCount?: number;
}

export const QuizQuestionModal: React.FC<QuizQuestionModalProps> = ({
  isOpen,
  onClose,
  quizId,
  onSave,
  editData,
  addedCount = 0,
}) => {
  const [questionText, setQuestionText] = useState(
    editData?.question_text || '',
  );
  const [questionType, setQuestionType] = useState<QuizQuestionType>(
    editData?.question_type || 'multiple_choice',
  );
  const [points, setPoints] = useState(editData?.points || 1);
  const [explanation, setExplanation] = useState(editData?.explanation || '');
  const [options, setOptions] = useState<QuizQuestionOption[]>([]);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<'True' | 'False'>(
    'True',
  );
  const [loading, setLoading] = useState(false);

  // Pre-fill form when opening in edit mode
  useEffect(() => {
    if (editData) {
      setQuestionText(editData.question_text);
      setQuestionType(editData.question_type);
      setPoints(editData.points);
      setExplanation(editData.explanation || '');
      fetchOptions(editData.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editData?.id]);

  // Reset options when question type changes in add mode
  useEffect(() => {
    if (editData) return;
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
    } else {
      setOptions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionType]);

  const fetchOptions = async (questionId: string) => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: QuizQuestionOption[];
      }>(`/admin/quiz-questions/${questionId}/options`);
      if (res.data.success) {
        setOptions(res.data.data);
        const correct = res.data.data.find((opt) => opt.is_correct);
        if (correct?.option_text === 'False') {
          setTrueFalseAnswer('False');
        } else {
          setTrueFalseAnswer('True');
        }
      }
    } catch (error) {
      console.log('error: ', error);
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
    value: string | boolean | number,
  ) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const resetForm = () => {
    setQuestionText('');
    setQuestionType('multiple_choice');
    setPoints(1);
    setExplanation('');
    setOptions([
      { option_text: '', is_correct: false, order_index: 0 },
      { option_text: '', is_correct: false, order_index: 1 },
    ]);
    setTrueFalseAnswer('True');
  };

  const saveQuestion = async (closeAfterSave: boolean) => {
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

      const questionData = {
        quiz_id: quizId,
        question_text: questionText,
        question_type: questionType,
        points,
        explanation,
      };

      let questionId: string;
      if (editData) {
        const res = await apiClient.put<{ data: { id: string } }>(
          `/admin/quiz-questions/${editData.id}`,
          questionData,
        );
        questionId = res.data.data.id;
      } else {
        const res = await apiClient.post<{ data: { id: string } }>(
          '/admin/quiz-questions',
          questionData,
        );
        questionId = res.data.data.id;
      }

      if (questionType === 'multiple_choice' || questionType === 'true_false') {
        if (editData) {
          await Promise.all(
            options
              .filter((o) => o.id)
              .map((o) =>
                apiClient.delete(`/admin/quiz-question-options/${o.id}`),
              ),
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
              ...option,
            }),
          ),
        );
      }

      toast.success(
        editData
          ? 'Question updated!'
          : closeAfterSave
            ? 'Question created!'
            : 'Question saved! Add another.',
      );
      onSave();
      if (closeAfterSave) {
        onClose();
      } else {
        resetForm();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save question'));
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
                          e.target.checked,
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

        <div className='mt-6 sticky bottom-0 bg-white pt-4 border-t space-y-2'>
          {addedCount > 0 && !editData && (
            <p className='text-xs text-center text-emerald-600 font-medium'>
              {addedCount} question{addedCount > 1 ? 's' : ''} added this
              session
            </p>
          )}
          <div className='flex gap-3'>
            <Button
              onClick={onClose}
              className='flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              disabled={loading}
            >
              Cancel
            </Button>
            {!editData && (
              <Button
                onClick={() => saveQuestion(false)}
                className='flex-1 border border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50'
                disabled={loading}
              >
                <Plus className='mr-2 h-4 w-4' />
                {loading ? 'Saving...' : 'Save & Add Another'}
              </Button>
            )}
            <Button
              onClick={() => saveQuestion(true)}
              className='flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
              disabled={loading}
            >
              <Save className='mr-2 h-4 w-4' />
              {loading ? 'Saving...' : editData ? 'Update' : 'Save & Close'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// BULK IMPORT MODAL
// ============================================

interface BulkImportQuestion {
  question_text: string;
  question_type: QuizQuestionType;
  points?: number;
  explanation?: string;
  options?: { option_text: string; is_correct: boolean }[];
  correct_answer?: 'True' | 'False';
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  onImported: () => void;
}

const BULK_TEMPLATE = JSON.stringify(
  [
    {
      question_text: 'What keyword declares a block-scoped variable?',
      question_type: 'multiple_choice',
      points: 1,
      explanation: 'let is block-scoped, var is function-scoped.',
      options: [
        { option_text: 'var', is_correct: false },
        { option_text: 'let', is_correct: true },
        { option_text: 'const', is_correct: false },
        { option_text: 'def', is_correct: false },
      ],
    },
    {
      question_text: 'const variables can be reassigned.',
      question_type: 'true_false',
      points: 1,
      correct_answer: 'False',
    },
  ],
  null,
  2,
);

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  quizId,
  onImported,
}) => {
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<BulkImportQuestion[] | null>(null);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleParse = () => {
    setParseError('');
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data))
        throw new Error('JSON must be an array [ ... ]');
      for (const q of data) {
        if (!q.question_text)
          throw new Error('Each question needs "question_text"');
        if (
          !['multiple_choice', 'true_false', 'short_answer'].includes(
            q.question_type,
          )
        )
          throw new Error(`Invalid question_type: "${q.question_type}"`);
        if (
          q.question_type === 'multiple_choice' &&
          (!Array.isArray(q.options) || q.options.length < 2)
        )
          throw new Error(
            'multiple_choice questions need "options" array with ≥2 items',
          );
      }
      setParsed(data);
    } catch (e) {
      setParseError((e as Error).message);
      setParsed(null);
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setProgress(0);
    let success = 0;
    for (const q of parsed) {
      try {
        const res = await apiClient.post<{ data: { id: string } }>(
          '/admin/quiz-questions',
          {
            quiz_id: quizId,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points ?? 1,
            explanation: q.explanation ?? '',
          },
        );
        const questionId = res.data.data.id;

        if (q.question_type === 'multiple_choice' && q.options) {
          await Promise.all(
            q.options.map((opt, i) =>
              apiClient.post('/admin/quiz-question-options', {
                question_id: questionId,
                option_text: opt.option_text,
                is_correct: opt.is_correct,
                order_index: i,
              }),
            ),
          );
        } else if (q.question_type === 'true_false') {
          await Promise.all([
            apiClient.post('/admin/quiz-question-options', {
              question_id: questionId,
              option_text: 'True',
              is_correct: q.correct_answer === 'True',
              order_index: 0,
            }),
            apiClient.post('/admin/quiz-question-options', {
              question_id: questionId,
              option_text: 'False',
              is_correct: q.correct_answer === 'False',
              order_index: 1,
            }),
          ]);
        }
        success++;
      } catch (error) {
        // continue with next question
      }
      setProgress(success);
    }
    setImporting(false);
    toast.success(`Imported ${success} of ${parsed.length} questions`);
    onImported();
    onClose();
  };

  const reset = () => {
    setRaw('');
    setParsed(null);
    setParseError('');
    setProgress(0);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-60 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-2xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]'>
        <div className='flex items-center justify-between px-6 py-4 border-b shrink-0'>
          <div>
            <h3 className='text-base font-semibold text-slate-900'>
              Bulk Import Questions
            </h3>
            <p className='text-xs text-slate-400 mt-0.5'>
              Paste a JSON array of questions
            </p>
          </div>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className='text-slate-400 hover:text-slate-600'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-6 space-y-4'>
          {/* Template hint */}
          <details className='text-xs text-slate-500 border border-slate-100 rounded-lg'>
            <summary className='px-3 py-2 cursor-pointer font-medium text-slate-600 hover:bg-slate-50 rounded-lg'>
              View JSON format / template
            </summary>
            <pre className='p-3 text-[11px] text-slate-600 bg-slate-50 overflow-x-auto rounded-b-lg'>
              {BULK_TEMPLATE}
            </pre>
          </details>

          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setParsed(null);
              setParseError('');
            }}
            placeholder='Paste your JSON array here…'
            rows={12}
            className='w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none'
          />

          {parseError && (
            <div className='flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700'>
              <AlertCircle className='h-3.5 w-3.5 shrink-0 mt-0.5' />
              {parseError}
            </div>
          )}

          {parsed && (
            <div className='flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700'>
              <CheckCircle2 className='h-3.5 w-3.5 shrink-0' />
              {parsed.length} question{parsed.length !== 1 ? 's' : ''} ready to
              import
              {importing && ` — imported ${progress} so far…`}
            </div>
          )}
        </div>

        <div className='flex gap-3 px-6 py-4 border-t shrink-0'>
          <Button
            onClick={() => {
              reset();
              onClose();
            }}
            className='flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            disabled={importing}
          >
            Cancel
          </Button>
          {!parsed ? (
            <Button
              onClick={handleParse}
              disabled={!raw.trim()}
              className='flex-1 bg-indigo-600 hover:bg-indigo-700 text-white'
            >
              Parse & Preview
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={importing}
              className='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              <Upload className='mr-2 h-4 w-4' />
              {importing ? `Importing…` : `Import ${parsed.length} Questions`}
            </Button>
          )}
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
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(
    null,
  );
  const [sessionAddedCount, setSessionAddedCount] = useState(0);

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
      toast.error(getErrorMessage(error, 'Failed to load questions'));
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
      toast.error(getErrorMessage(error, 'Failed to delete question'));
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h4 className='text-sm font-semibold text-slate-700'>
          Quiz Questions for: {subtopicTitle}
        </h4>
        <div className='flex gap-2'>
          <Button
            onClick={() => setBulkModalOpen(true)}
            size='sm'
            variant='outline'
            className='border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
          >
            <Upload className='mr-1 h-3.5 w-3.5' />
            Bulk Import
          </Button>
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
          setSessionAddedCount(0);
        }}
        quizId={quizId}
        onSave={() => {
          fetchQuestions();
          if (!editingQuestion) setSessionAddedCount((c) => c + 1);
        }}
        editData={editingQuestion ?? undefined}
        addedCount={sessionAddedCount}
      />

      <BulkImportModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        quizId={quizId}
        onImported={fetchQuestions}
      />
    </div>
  );
};
