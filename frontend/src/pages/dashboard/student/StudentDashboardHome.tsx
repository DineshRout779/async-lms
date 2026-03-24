import React, { useMemo } from 'react';
import {
  Play,
  FileText,
  ChevronRight,
  Trophy,
  Activity,
  Loader2,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import {
  useMySubjects,
  useMyAssignments,
  useMyOverallRank,
} from '@/hooks/queries/useStudentDashboard';
import type { Assignment, Subject } from '@/utils/types';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
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
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  const { data: courses = [], isLoading: loadingCourses } = useMySubjects();
  const { data: assignments = [], isLoading: loadingAssignments } = useMyAssignments();
  const { data: myRank } = useMyOverallRank();

  const avgProgress = useMemo(() => {
    if (!courses.length) return null;
    const sum = courses.reduce((s, c: Subject) => s + (c.progress_percent || 0), 0);
    return Math.round(sum / courses.length);
  }, [courses]);

  const currentCourse = courses[0];
  const pendingCount = assignments.length;

  return (
    <main className='flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto overflow-hidden'>
      {/* 1. Hero Section */}
      <section className='relative overflow-hidden rounded-[2rem] bg-[#1e293b] text-white p-8 md:p-12 shadow-2xl'>
        <div className='relative z-10 max-w-2xl'>
          <Badge className='bg-slate-700/50 hover:bg-slate-700 text-slate-100 border-none px-3 py-1 mb-6 backdrop-blur-md'>
            WELCOME BACK
          </Badge>
          <h1 className='text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-[1.1]'>
            Ready to continue,{' '}
            <span className='text-yellow-400'>
              {user?.full_name?.split(' ')[0] || 'there'}?
            </span>
          </h1>
          <p className='text-slate-400 text-lg mb-8 max-w-md leading-relaxed'>
            {loadingAssignments
              ? 'Loading your progress...'
              : pendingCount > 0
                ? `You have ${pendingCount} pending assignment${pendingCount !== 1 ? 's' : ''}. Keep up the momentum!`
                : 'All caught up! Keep learning and growing.'}
          </p>
          <div className='flex flex-wrap gap-4'>
            <Button
              size='lg'
              onClick={() => navigate('/dashboard/student/courses')}
              className='bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 h-12 font-semibold transition-all hover:scale-105'
            >
              <Play className='mr-2 h-4 w-4 fill-current' /> Continue Learning
            </Button>
            <Button
              size='lg'
              variant='secondary'
              onClick={() => navigate('/dashboard/student/assignments')}
              className='bg-slate-700 hover:bg-slate-600 text-white border-none rounded-xl px-8 h-12 font-semibold'
            >
              View Assignments
            </Button>
          </div>
        </div>
        <div className='absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none' />
        <div className='absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none' />
      </section>

      {/* 2. Stats Grid */}
      <section className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
        <StatCard
          label='Courses'
          value={loadingCourses ? '—' : courses.length}
          icon={BookOpen}
          iconColor='text-indigo-500'
          bgColor='bg-indigo-50'
        />
        <StatCard
          label='Assignments'
          value={loadingAssignments ? '—' : pendingCount}
          icon={FileText}
          iconColor='text-orange-500'
          bgColor='bg-orange-50'
        />
        <StatCard
          label='Avg. Progress'
          value={loadingCourses || avgProgress === null ? '—' : `${avgProgress}%`}
          icon={Activity}
          iconColor='text-purple-500'
          bgColor='bg-purple-50'
        />
        <StatCard
          label='My Rank'
          value={myRank ? `#${myRank}` : '—'}
          icon={Trophy}
          iconColor='text-emerald-500'
          bgColor='bg-emerald-50'
        />
      </section>

      {/* 3. Continue Learning Card */}
      <section className='space-y-4'>
        <div className='flex items-center justify-between px-1'>
          <h2 className='text-xl font-bold tracking-tight text-slate-900'>
            Continue Learning
          </h2>
          <Button
            variant='link'
            className='text-indigo-600 font-bold p-0 hover:no-underline'
            onClick={() => navigate('/dashboard/student/courses')}
          >
            View All Courses
          </Button>
        </div>

        {loadingCourses ? (
          <Card className='border-none shadow-sm'>
            <CardContent className='p-6 flex items-center justify-center h-40'>
              <Loader2 className='w-8 h-8 animate-spin text-indigo-400' />
            </CardContent>
          </Card>
        ) : currentCourse ? (
          <Card
            className='overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer'
            onClick={() =>
              navigate(`/dashboard/student/courses/${currentCourse.slug}`)
            }
          >
            <CardContent className='p-6'>
              <div className='flex flex-col lg:flex-row gap-8 items-center'>
                <div className='w-full lg:w-80 aspect-video bg-indigo-950 rounded-2xl flex items-center justify-center group relative overflow-hidden shrink-0'>
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
                      {currentCourse.level || 'General'}
                    </Badge>
                  </div>
                  <div>
                    <h3 className='text-2xl font-bold mb-2 text-slate-900'>
                      {currentCourse.name}
                    </h3>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                      {currentCourse.total_lessons} lessons
                    </p>
                  </div>
                  <div className='space-y-3'>
                    <Progress
                      value={Math.round(currentCourse.progress_percent || 0)}
                      className='h-2 bg-slate-100'
                    />
                    <div className='flex justify-end'>
                      <span className='text-xs font-bold text-slate-500 uppercase'>
                        {Math.round(currentCourse.progress_percent || 0)}%
                        Complete
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className='border-none shadow-sm'>
            <CardContent className='p-6 flex flex-col items-center justify-center h-40 gap-3 text-center'>
              <BookOpen className='w-8 h-8 text-slate-300' />
              <p className='text-slate-500 font-medium'>
                No courses yet. Enroll in a course to get started!
              </p>
            </CardContent>
          </Card>
        )}
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
            {loadingAssignments ? (
              <div className='flex justify-center py-6'>
                <Loader2 className='w-6 h-6 animate-spin text-slate-400' />
              </div>
            ) : assignments.length === 0 ? (
              <p className='py-4 text-center text-sm text-slate-400'>
                No pending assignments.
              </p>
            ) : (
              (assignments as Assignment[]).slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate('/dashboard/student/assignments')}
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
                        {item.subject_title}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className='w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform group-hover:text-indigo-600' />
                </div>
              ))
            )}
            <Button
              variant='outline'
              onClick={() => navigate('/dashboard/student/assignments')}
              className='w-full mt-2 border-dashed border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors'
            >
              View All Assignments
            </Button>
          </CardContent>
        </Card>

        {/* My Courses */}
        <Card className='border-none shadow-sm'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg font-bold'>My Courses</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {loadingCourses ? (
              <div className='flex justify-center py-6'>
                <Loader2 className='w-6 h-6 animate-spin text-slate-400' />
              </div>
            ) : courses.length === 0 ? (
              <p className='py-4 text-center text-sm text-slate-400'>
                No enrolled courses yet.
              </p>
            ) : (
              (courses as Subject[]).slice(0, 3).map((course) => (
                <div
                  key={course.id}
                  onClick={() =>
                    navigate(`/dashboard/student/courses/${course.slug}`)
                  }
                  className='flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group'
                >
                  <div className='flex items-center gap-4 min-w-0'>
                    <div className='p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shrink-0'>
                      <BookOpen size={20} />
                    </div>
                    <div className='min-w-0'>
                      <p className='text-sm font-bold text-slate-900 truncate'>
                        {course.name}
                      </p>
                      <p className='text-[11px] text-muted-foreground font-medium mt-0.5'>
                        {Math.round(course.progress_percent || 0)}% complete
                      </p>
                    </div>
                  </div>
                  <ChevronRight className='w-4 h-4 text-slate-300 shrink-0 group-hover:translate-x-1 transition-transform group-hover:text-indigo-600' />
                </div>
              ))
            )}
            <Button
              variant='outline'
              onClick={() => navigate('/dashboard/student/courses')}
              className='w-full mt-2 border-dashed border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors'
            >
              View All Courses
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default StudentDashboardHome;
