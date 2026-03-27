import { useLocation, useNavigate } from 'react-router';
import { CheckCircle2, Pencil, Trash2, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/* ======================
   Types
====================== */

interface AssignmentData {
  title: string;
  course: string;
  college: string;
  domain: string;
  deadline: string;
  totalMarks: number;
  rubrics: { name: string; score: number }[];
}

/* ======================
   Component
====================== */

export default function AssignmentSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const assignment = location.state as AssignmentData | null;

  const dashboardType = location.pathname.includes('/dashboard/admin') ? 'admin' : 'facilitator';
  const basePath = `/dashboard/${dashboardType}`;

  // If no data was passed (e.g. user navigated directly), redirect to create page
  if (!assignment) {
    return (
      <div className='min-h-screen bg-slate-50/60 flex items-center justify-center px-4'>
        <div className='max-w-md w-full text-center space-y-4 animate-in fade-in duration-500'>
          <div className='w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto'>
            <CheckCircle2 className='w-10 h-10 text-slate-300' />
          </div>
          <h1 className='text-xl font-bold text-slate-900'>No Assignment Data</h1>
          <p className='text-sm text-slate-500'>
            Please create an assignment first to see the success page.
          </p>
          <Button
            className='bg-blue-600 hover:bg-blue-700'
            onClick={() => navigate(`${basePath}/create-assignment`)}
          >
            Go to Create Assignment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50/60 flex items-center justify-center px-4'>
      <div className='max-w-2xl w-full space-y-8 animate-in fade-in duration-500'>
        {/* ── Success Icon & Heading ── */}
        <div className='text-center space-y-3'>
          <div className='flex justify-center'>
            <div className='w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center'>
              <CheckCircle2 className='w-10 h-10 text-emerald-500' />
            </div>
          </div>
          <h1 className='text-2xl font-bold text-slate-900'>
            Assignment Created Successfully
          </h1>
          <p className='text-sm text-slate-500'>
            Your assignment is now live and visible to students.
          </p>
        </div>

        {/* ── Assignment Preview Card ── */}
        <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5'>
          <h2 className='text-base font-semibold text-slate-900'>
            Assignment Preview
          </h2>

          {/* Info Grid */}
          <div className='grid grid-cols-2 gap-y-5 gap-x-8'>
            {/* Title */}
            <div className='space-y-1'>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
                Title
              </p>
              <p className='text-sm font-medium text-slate-800'>
                {assignment.title || '—'}
              </p>
            </div>

            {/* Course */}
            <div className='space-y-1'>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
                Course
              </p>
              <p className='text-sm font-medium text-slate-800'>
                {assignment.course || '—'}
              </p>
            </div>

            {/* College */}
            <div className='space-y-1'>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
                College
              </p>
              <p className='text-sm font-medium text-slate-800'>
                {assignment.college || '—'}
              </p>
            </div>

            {/* Domain */}
            <div className='space-y-1'>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
                Domain
              </p>
              <p className='text-sm font-medium text-slate-800'>
                {assignment.domain || '—'}
              </p>
            </div>

            {/* Due Date */}
            <div className='space-y-1'>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
                Due Date
              </p>
              <p className='text-sm font-medium text-slate-800'>
                {assignment.deadline || '—'}
              </p>
            </div>

            {/* Total Marks */}
            <div className='space-y-1'>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
                Total Marks
              </p>
              <p className='text-sm font-medium text-slate-800'>
                {assignment.totalMarks || 0}
              </p>
            </div>
          </div>

          {/* Rubrics */}
          {assignment.rubrics && assignment.rubrics.length > 0 && (
            <div className='space-y-2'>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
                Rubrics
              </p>
              <div className='flex flex-wrap gap-2'>
                {assignment.rubrics.map((rubric) => (
                  <Badge
                    key={rubric.name}
                    className='bg-slate-100 text-slate-700 hover:bg-slate-100 font-normal text-xs px-3 py-1'
                  >
                    {rubric.name} ({rubric.score})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Action Buttons ── */}
        <div className='flex items-center justify-center gap-4 pb-8'>
          <Button
            variant='outline'
            className='gap-2 text-slate-700 border-slate-300 hover:bg-slate-50'
            onClick={() => navigate(`${basePath}/create-assignment`, { state: assignment })}
          >
            <Pencil className='w-4 h-4' />
            Edit Assignment
          </Button>

          <Button
            variant='outline'
            className='gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600'
            onClick={() => navigate(`${basePath}/assignments`)}
          >
            <Trash2 className='w-4 h-4' />
            Delete Assignment
          </Button>

          <Button
            className='gap-2 bg-blue-600 hover:bg-blue-700'
            onClick={() => navigate(`${basePath}/assignments`)}
          >
            Go to Assignment Management
            <ArrowRight className='w-4 h-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
