import { Outlet, Link, useParams } from 'react-router';
import { ChevronLeft, GraduationCap } from 'lucide-react';
import { SubjectSidebar } from '@/components/common/subject/SubjectSidebar';
import { useAppSelector } from '@/app/hooks';
import { selectLessonData } from '@/features/lesson/lessonSlice';

const CourseViewLayout = () => {
  const { slug } = useParams();
  const lessonData = useAppSelector(selectLessonData);
  const subtopic = lessonData?.subtopic;

  return (
    <div className='flex h-screen bg-white overflow-hidden'>
      {/* Dynamic Subject Sidebar (The nested structure) */}
      <SubjectSidebar />

      <div className='flex-1 flex flex-col min-w-0'>
        {/* Course-specific Header */}
        <header className='h-16 border-b flex items-center justify-between px-6 bg-white shrink-0'>
          <div className='flex items-center gap-4'>
            <Link
              to='/dashboard/student/courses'
              className='p-2 hover:bg-slate-100 rounded-full transition-colors'
            >
              <ChevronLeft className='w-5 h-5 text-slate-600' />
            </Link>
            <div className='flex items-center gap-2'>
              <div className='bg-blue-600 p-1.5 rounded-lg'>
                <GraduationCap className='w-4 h-4 text-white' />
              </div>
              <span className='font-bold text-slate-800 uppercase tracking-tight'>
                {subtopic?.title || 'Course Overview'}
              </span>
            </div>
          </div>

          <div className='flex items-center gap-4'>
            {/* Progress bar or user profile could go here */}
            <div className='hidden md:block text-sm font-medium text-slate-500'>
              Course ID: {slug}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className='flex-1 overflow-y-auto bg-[#fcfcfd]'>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CourseViewLayout;
