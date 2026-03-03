import { useState } from 'react';
import { X, CalendarClock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CollegeAssignment } from '@/utils/types';

function formatDueDate(dateStr: string) {
  const date = new Date(dateStr);
  const isPast = date < new Date();
  const label = date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return { label, isPast };
}

interface Props {
  assignment: CollegeAssignment | null;
  onClose: () => void;
}

export const CollegeAssignmentModal = ({ assignment, onClose }: Props) => {
  const [solution, setSolution] = useState('');

  if (!assignment) return null;

  const due = assignment.due_date ? formatDueDate(assignment.due_date) : null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
      onClick={onClose}
    >
      <div
        className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl flex flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-start justify-between p-6 border-b border-slate-100'>
          <div className='space-y-1 pr-4'>
            <p className='text-xs font-semibold uppercase tracking-widest text-violet-500'>
              External Assignment
            </p>
            <h2 className='text-xl font-bold text-slate-900'>
              {assignment.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-600 shrink-0'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Meta */}
        <div className='flex flex-wrap gap-4 px-6 py-4 border-b border-slate-100 text-sm'>
          <div className='flex items-center gap-1.5 text-slate-500'>
            <User className='w-4 h-4' />
            <span>
              Posted by{' '}
              <span className='font-semibold text-slate-700'>
                {assignment.created_by_name}
              </span>
            </span>
          </div>
          {due && (
            <div
              className={`flex items-center gap-1.5 font-semibold ${
                due.isPast ? 'text-red-500' : 'text-slate-600'
              }`}
            >
              <CalendarClock className='w-4 h-4' />
              <span>
                Due: {due.label}
                {due.isPast && (
                  <span className='ml-1 text-xs font-normal text-red-400'>
                    (overdue)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {assignment.description && (
          <div className='px-6 py-4 border-b border-slate-100'>
            <p className='text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3'>
              Description
            </p>
            <div className='prose prose-sm max-w-none text-slate-700'>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {assignment.description}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Solution input */}
        <div className='px-6 py-4 flex flex-col gap-2 flex-1'>
          <p className='text-xs font-semibold uppercase tracking-widest text-slate-400'>
            Your Solution
          </p>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder='Paste your solution, link, or notes here...'
            rows={6}
            className='w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none'
          />
        </div>

        {/* Footer */}
        <div className='flex gap-3 px-6 pb-6'>
          <Button
            onClick={onClose}
            className='flex-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          >
            Close
          </Button>
          <Button
            disabled
            className='flex-1 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50'
          >
            Submit (coming soon)
          </Button>
        </div>
      </div>
    </div>
  );
};
