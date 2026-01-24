import React from 'react';
import {
  Play,
  FileText,
  ChevronRight,
  Zap,
  Target,
  Flame,
  Star,
  Trophy,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils'; // Standard shadcn utility

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon; // Better type than ReactNode for cloning
  iconColor: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor,
  bgColor,
}) => (
  <Card className='border-none shadow-sm hover:shadow-md transition-all duration-300'>
    <CardContent className='pt-6 flex flex-col items-center'>
      <div className={cn('p-3 rounded-full mb-3', bgColor)}>
        <Icon className={cn('w-6 h-6', iconColor)} />
      </div>
      <div className='text-2xl font-bold tracking-tight text-slate-900'>
        {value}
      </div>
      <p className='text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1'>
        {label}
      </p>
    </CardContent>
  </Card>
);

const StudentDashboardHome: React.FC = () => {
  return (
    <main className='flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto overflow-hidden'>
      {/* 1. Hero Section */}
      <section className='relative overflow-hidden rounded-[2rem] bg-[#1e293b] text-white p-8 md:p-12 shadow-2xl'>
        <div className='relative z-10 max-w-2xl'>
          <Badge className='bg-slate-700/50 hover:bg-slate-700 text-slate-100 border-none px-3 py-1 mb-6 backdrop-blur-md'>
            WEEKLY UPDATE
          </Badge>
          <h1 className='text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-[1.1]'>
            Ready to continue your{' '}
            <span className='text-yellow-400'>Full Stack Journey?</span>
          </h1>
          <p className='text-slate-400 text-lg mb-8 max-w-md leading-relaxed'>
            You have 2 pending assignments and a quiz due this week. Keep up the
            momentum!
          </p>
          <div className='flex flex-wrap gap-4'>
            <Button
              size='lg'
              className='bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 h-12 font-semibold transition-all hover:scale-105'
            >
              <Play className='mr-2 h-4 w-4 fill-current' /> Continue Learning
            </Button>
            <Button
              size='lg'
              variant='secondary'
              className='bg-slate-700 hover:bg-slate-600 text-white border-none rounded-xl px-8 h-12 font-semibold'
            >
              View Assignments
            </Button>
          </div>
        </div>
        {/* Decorative background glow */}
        <div className='absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none' />
        <div className='absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none' />
      </section>

      {/* 2. Stats Grid */}
      <section className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
        <StatCard
          label='Day Streak'
          value='12'
          icon={Flame}
          iconColor='text-orange-500'
          bgColor='bg-orange-50'
        />
        <StatCard
          label='Total XP'
          value='2,450'
          icon={Star}
          iconColor='text-indigo-500'
          bgColor='bg-indigo-50'
        />
        <StatCard
          label='Avg. Score'
          value='85%'
          icon={Activity}
          iconColor='text-purple-500'
          bgColor='bg-purple-50'
        />
        <StatCard
          label='Rank'
          value='#42'
          icon={Trophy}
          iconColor='text-emerald-500'
          bgColor='bg-emerald-50'
        />
      </section>

      {/* 3. Primary Learning Card */}
      <section className='space-y-4'>
        <div className='flex items-center justify-between px-1'>
          <h2 className='text-xl font-bold tracking-tight text-slate-900'>
            Continue Learning
          </h2>
          <Button
            variant='link'
            className='text-indigo-600 font-bold p-0 hover:no-underline'
          >
            View All Courses
          </Button>
        </div>

        <Card className='overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow'>
          <CardContent className='p-6'>
            <div className='flex flex-col lg:flex-row gap-8 items-center'>
              {/* Video Thumbnail Placeholder */}
              <div className='w-full lg:w-80 aspect-video bg-indigo-950 rounded-2xl flex items-center justify-center group cursor-pointer relative overflow-hidden shrink-0'>
                <div className='absolute inset-0 bg-indigo-600/10 group-hover:bg-indigo-600/20 transition-colors' />
                <div className='z-10 bg-white/10 backdrop-blur-md p-4 rounded-full group-hover:scale-110 transition-transform'>
                  <Play className='w-8 h-8 text-white fill-white' />
                </div>
              </div>

              <div className='flex-1 w-full space-y-5'>
                <div className='flex items-center gap-2'>
                  <Badge
                    variant='outline'
                    className='text-indigo-600 border-indigo-100 bg-indigo-50/50'
                  >
                    FRONTEND
                  </Badge>
                  <span className='text-slate-300'>•</span>
                  <span className='text-xs font-semibold text-slate-400 uppercase tracking-wider'>
                    Advanced React Patterns
                  </span>
                </div>
                <div>
                  <h3 className='text-2xl font-bold mb-2 text-slate-900'>
                    Composition vs Inheritance
                  </h3>
                  <p className='text-muted-foreground text-sm leading-relaxed'>
                    Learn how to build flexible components using the composition
                    pattern in React to avoid prop-drilling.
                  </p>
                </div>
                <div className='space-y-3'>
                  <Progress value={35} className='h-2 bg-slate-100' />
                  <div className='flex justify-end'>
                    <span className='text-xs font-bold text-slate-500 uppercase'>
                      35% Complete
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Bottom Grid */}
      <section className='grid gap-6 md:grid-cols-2'>
        {/* Assignments */}
        <Card className='border-none shadow-sm'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg font-bold'>
              Pending Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {[
              { title: 'Personal Portfolio Website', due: 'Oct 25, 2023' },
              { title: 'E-commerce API Integration', due: 'Nov 02, 2023' },
            ].map((item, idx) => (
              <div
                key={idx}
                className='flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group'
              >
                <div className='flex items-center gap-4'>
                  <div className='p-2.5 bg-orange-50 rounded-xl text-orange-600'>
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className='text-sm font-bold text-slate-900'>
                      {item.title}
                    </p>
                    <p className='text-[11px] text-muted-foreground font-medium mt-0.5'>
                      Due: {item.due}
                    </p>
                  </div>
                </div>
                <ChevronRight className='w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform group-hover:text-indigo-600' />
              </div>
            ))}
            <Button
              variant='outline'
              className='w-full mt-2 border-dashed border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors'
            >
              View All Assignments
            </Button>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className='border-none shadow-sm'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg font-bold'>
              Recommended For You
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {[
              {
                title: 'System Design Interview Prep',
                icon: Zap,
                meta: 'Intermediate • 4h 30m',
                color: 'text-purple-600 bg-purple-50',
              },
              {
                title: 'Docker for Beginners',
                icon: Target,
                meta: 'Beginner • 2h 15m',
                color: 'text-emerald-600 bg-emerald-50',
              },
            ].map((rec, idx) => (
              <div
                key={idx}
                className='flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group'
              >
                <div className='flex items-center gap-4'>
                  <div className={cn('p-2.5 rounded-xl', rec.color)}>
                    <rec.icon size={20} />
                  </div>
                  <div>
                    <p className='text-sm font-bold text-slate-900'>
                      {rec.title}
                    </p>
                    <p className='text-[10px] text-muted-foreground uppercase font-bold tracking-tight mt-0.5'>
                      {rec.meta}
                    </p>
                  </div>
                </div>
                <ChevronRight className='w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform group-hover:text-indigo-600' />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default StudentDashboardHome;
