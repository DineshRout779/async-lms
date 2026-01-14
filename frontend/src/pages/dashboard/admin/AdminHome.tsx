import {
  Building2,
  Users,
  BookOpen,
  Lock,
  ClipboardCheck,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const stats = [
  {
    label: 'Total Colleges',
    value: '5',
    trend: '+1 this month',
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: 'Active Students',
    value: '2,150',
    trend: '+45 this week',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    label: 'Course Units',
    value: '156',
    trend: 'Total Content',
    icon: BookOpen,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    label: 'Locked Items',
    value: '12',
    trend: '3 Pending Unlock',
    icon: Lock,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    isWarning: true,
  },
];

export default function AdminHome() {
  return (
    <div className='p-6 space-y-8 animate-in fade-in duration-500'>
      {/* 1. Statistics Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {stats.map((stat) => (
          <Card key={stat.label} className='border-none shadow-sm'>
            <CardContent className='p-5 flex flex-col justify-between h-32'>
              <div className='flex justify-between items-start'>
                <div>
                  <p className='text-sm font-medium text-slate-500'>
                    {stat.label}
                  </p>
                  <h3 className='text-2xl font-bold text-slate-900 mt-1'>
                    {stat.value}
                  </h3>
                </div>
                <div className={`${stat.bg} p-2.5 rounded-xl`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className='flex items-center gap-1.5 mt-2'>
                {stat.isWarning && (
                  <Clock className='w-3.5 h-3.5 text-orange-500' />
                )}
                <p
                  className={`text-xs font-medium ${
                    stat.isWarning ? 'text-orange-600' : 'text-emerald-600'
                  }`}
                >
                  {stat.trend}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. Main Content Card */}
      <Card className='border-none shadow-sm p-6'>
        <h3 className='text-lg font-bold text-[#1e2653] mb-6'>
          Pending Actions
        </h3>

        {/* Action Blocks */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-8'>
          <div className='flex items-center justify-between p-4 bg-orange-50/50 border border-orange-100 rounded-xl'>
            <div className='flex items-center gap-4'>
              <div className='bg-white p-2.5 rounded-lg shadow-sm'>
                <Lock className='w-5 h-5 text-orange-500' />
              </div>
              <div>
                <p className='font-bold text-sm text-slate-900'>
                  Unlock Requests
                </p>
                <p className='text-xs text-slate-500'>
                  3 Barabari batches waiting
                </p>
              </div>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='bg-white border-orange-200 text-orange-600 hover:bg-orange-50 text-xs font-bold px-5'
            >
              Review
            </Button>
          </div>

          <div className='flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-xl'>
            <div className='flex items-center gap-4'>
              <div className='bg-white p-2.5 rounded-lg shadow-sm'>
                <ClipboardCheck className='w-5 h-5 text-blue-500' />
              </div>
              <div>
                <p className='font-bold text-sm text-slate-900'>Evaluations</p>
                <p className='text-xs text-slate-500'>5 Project submissions</p>
              </div>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='bg-white border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-bold px-5'
            >
              Grade
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className='text-sm font-bold text-slate-900 mb-4 pb-4 border-b'>
            Recent Activity
          </h4>
          <div className='space-y-6'>
            <div className='flex gap-4'>
              <div className='w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0' />
              <div>
                <p className='text-sm text-slate-600'>
                  Admin{' '}
                  <span className='font-bold text-slate-900 underline'>
                    unlocked
                  </span>{' '}
                  JS Functions for DIT
                </p>
                <p className='text-xs text-slate-400 mt-1'>2 mins ago</p>
              </div>
            </div>
            <div className='flex gap-4'>
              <div className='w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0' />
              <div>
                <p className='text-sm text-slate-600'>
                  Facilitator{' '}
                  <span className='font-bold text-slate-900 underline'>
                    approved
                  </span>{' '}
                  Project by Sneha
                </p>
                <p className='text-xs text-slate-400 mt-1'>15 mins ago</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
