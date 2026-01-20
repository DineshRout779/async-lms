import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2 } from 'lucide-react';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course: string;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED';
  score?: number;
}

export const AssignmentCard = ({ assignment }: { assignment: Assignment }) => {
  const isCompleted = assignment.status === 'COMPLETED';

  return (
    <Card className='w-full border-slate-100 shadow-sm transition-all hover:shadow-md'>
      <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-2'>
        <div
          className={`p-2 rounded-lg ${
            isCompleted ? 'bg-emerald-50' : 'bg-blue-50'
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className='w-5 h-5 text-emerald-500' />
          ) : (
            <FileText className='w-5 h-5 text-blue-500' />
          )}
        </div>
        <Badge
          variant='secondary'
          className={
            isCompleted
              ? 'bg-emerald-50 text-emerald-600 border-none font-bold'
              : 'bg-orange-50 text-orange-600 border-none font-bold'
          }
        >
          {assignment.status}
        </Badge>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div className='space-y-1'>
          <CardTitle className='text-xl font-bold text-slate-800'>
            {assignment.title}
          </CardTitle>
          <p className='text-sm text-slate-500 leading-relaxed line-clamp-2'>
            {assignment.description}
          </p>
        </div>

        <div className='space-y-2 text-sm pt-2'>
          <div className='flex justify-between'>
            <span className='text-slate-400'>Course:</span>
            <span className='font-semibold text-slate-700 text-right'>
              {assignment.course}
            </span>
          </div>
          <div className='flex justify-between'>
            <span className='text-slate-400'>Due Date:</span>
            <span
              className={
                isCompleted ? 'text-slate-700' : 'text-orange-500 font-semibold'
              }
            >
              {assignment.dueDate}
            </span>
          </div>
        </div>

        {isCompleted && assignment.score && (
          <div className='flex items-center justify-between p-3 bg-emerald-50/50 rounded-lg mt-4 border border-emerald-100'>
            <span className='text-emerald-700 font-bold'>
              Score: {assignment.score}/100
            </span>
            <button className='text-xs font-bold text-emerald-600 hover:underline'>
              View Feedback
            </button>
          </div>
        )}
      </CardContent>

      {!isCompleted && (
        <CardFooter>
          <Button
            variant='outline'
            className='w-full border-indigo-900 text-indigo-900 hover:bg-indigo-50 font-bold'
          >
            View Details & Submit
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
