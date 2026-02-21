import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Loader2, XCircle, ClipboardList } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import apiClient from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Assignment } from '@/utils/types';

export default function AssignmentView() {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!assignmentId) return;

    const fetchAssignment = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await apiClient.get<{ success: boolean; data: Assignment }>(
          `/students/assignments/${assignmentId}`,
        );
        setAssignment(res.data.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId]);

  if (loading) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='h-10 w-10 animate-spin text-indigo-600' />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className='flex h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center'>
        <XCircle className='h-12 w-12 text-red-400' />
        <p className='text-lg font-semibold text-slate-700'>
          Failed to load assignment
        </p>
        <p className='text-sm text-slate-500'>Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-4xl space-y-10 p-6 md:p-10'>
      <header className='space-y-3'>
        <div className='flex items-center gap-3'>
          <ClipboardList className='h-7 w-7 text-indigo-600 shrink-0' />
          <h1 className='text-4xl font-extrabold tracking-tight text-slate-900'>
            {assignment.title}
          </h1>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Badge className='bg-indigo-50 text-indigo-700 border border-indigo-200'>
            Assignment
          </Badge>
          <Badge className='bg-slate-100 text-slate-600 border border-slate-200'>
            Max: {assignment.max_score} pts
          </Badge>
          {assignment.unit_title && (
            <Badge className='bg-slate-100 text-slate-500 border border-slate-200'>
              {assignment.unit_title}
            </Badge>
          )}
        </div>
      </header>

      <Card className='overflow-hidden rounded-3xl border border-slate-200 shadow-sm'>
        <div className='bg-slate-50 px-6 py-4'>
          <p className='text-xs font-semibold uppercase tracking-widest text-slate-400'>
            Instructions
          </p>
          <p className='text-sm text-slate-600 mt-0.5'>
            Read carefully before submitting
          </p>
        </div>
        <div className='bg-white px-6 py-8'>
          {assignment.instructions ? (
            <div className='prose prose-slate max-w-none lg:prose-lg'>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {assignment.instructions}
              </ReactMarkdown>
            </div>
          ) : (
            <p className='italic text-slate-400'>No instructions provided.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
