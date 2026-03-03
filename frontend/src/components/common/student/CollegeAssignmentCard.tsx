import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Building2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CollegeAssignment } from '@/utils/types';

function formatDueDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isPast = date < now;
  const label = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return { label, isPast };
}

export const CollegeAssignmentCard = ({
  assignment,
  onClick,
}: {
  assignment: CollegeAssignment;
  onClick?: () => void;
}) => {
  const due = assignment.due_date ? formatDueDate(assignment.due_date) : null;

  return (
    <Card onClick={onClick} className='w-full border-slate-100 shadow-sm transition-all hover:shadow-md cursor-pointer'>
      <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-2'>
        <div className='p-2 rounded-lg bg-violet-50'>
          <Building2 className='w-5 h-5 text-violet-500' />
        </div>
        <Badge
          variant='secondary'
          className='bg-violet-50 text-violet-600 border-none font-bold'
        >
          External
        </Badge>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div className='space-y-1'>
          <CardTitle className='text-xl font-bold text-slate-800'>
            {assignment.title}
          </CardTitle>
          {assignment.description && (
            <div className='prose prose-sm max-w-none text-slate-500 leading-relaxed line-clamp-3'>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {assignment.description}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className='space-y-2 text-sm pt-1'>
          <div className='flex justify-between'>
            <span className='text-slate-400'>Posted by:</span>
            <span className='font-semibold text-slate-700'>
              {assignment.created_by_name}
            </span>
          </div>

          {due && (
            <div className='flex items-center justify-between'>
              <span className='text-slate-400'>Due:</span>
              <span
                className={`flex items-center gap-1 font-semibold ${
                  due.isPast ? 'text-red-500' : 'text-slate-700'
                }`}
              >
                <CalendarClock className='w-3.5 h-3.5' />
                {due.label}
                {due.isPast && (
                  <span className='ml-1 text-xs font-normal text-red-400'>
                    (overdue)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
