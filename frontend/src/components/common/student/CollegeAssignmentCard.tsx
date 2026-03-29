import { FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CollegeAssignment } from '@/utils/types';

function formatDueDate(dateStr: string) {
  const date = new Date(dateStr);
  const isPast = date < new Date();
  const label = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return { label, isPast };
}

interface Props {
  assignment: CollegeAssignment;
  onClick?: () => void;
}

export const CollegeAssignmentCard = ({ assignment, onClick }: Props) => {
  const due = assignment.due_date ? formatDueDate(assignment.due_date) : null;
  const isSubmitted = Boolean(assignment.submission_link || assignment.submission_file_url);

  return (
    <div
      className='group relative bg-white border border-slate-200 rounded-[2rem] p-8 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-500 cursor-pointer flex flex-col h-full overflow-hidden'
      onClick={onClick}
    >
      <div className='flex items-start justify-between mb-6'>
        {/* Icon */}
        <div className={`p-4 rounded-2xl ${isSubmitted ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-500'}`}>
          {isSubmitted ? (
            <CheckCircle2 className='w-6 h-6' />
          ) : (
            <FileText className='w-6 h-6' />
          )}
        </div>

        {/* Status Badge */}
        <div
          className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${
            isSubmitted
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              : 'bg-orange-50 text-orange-500 border border-orange-100'
          }`}
        >
          {isSubmitted ? 'COMPLETED' : 'PENDING'}
        </div>
      </div>

      {/* Content */}
      <div className='space-y-4 flex-1 mb-8'>
        <h3 className='text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight'>
          {assignment.title}
        </h3>
        {assignment.description && (
          <div className='prose prose-sm max-w-none text-slate-500 line-clamp-3 text-sm leading-relaxed font-medium'>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {assignment.description}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Meta Labels Component */}
      <div className='space-y-3 pt-6 border-t border-slate-50'>
        <div className='flex items-center justify-between text-xs'>
          <span className='text-slate-400 font-bold uppercase tracking-widest'>Course:</span>
          <span className='text-slate-900 font-black text-right'>
            {assignment.course || 'Build Web Applications'}
          </span>
        </div>
        {due && (
          <div className='flex items-center justify-between text-xs'>
            <span className='text-slate-400 font-bold uppercase tracking-widest'>Due Date:</span>
            <span className={`text-right font-black ${due.isPast ? 'text-red-500' : 'text-orange-500'}`}>
              {due.label}
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className='mt-8 pt-4'>
        {isSubmitted ? (
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 font-black text-sm">Submitted</span>
          </div>
        ) : (
          <Button
            variant='outline'
            className='w-full h-14 rounded-2xl border-2 border-indigo-600 text-indigo-600 font-black text-sm hover:bg-indigo-600 hover:text-white transition-all shadow-sm'
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            View Details & Submit
          </Button>
        )}
      </div>
    </div>
  );
};
