import {
  Search,
  Plus,
  MoreVertical,
  BookOpen,
  Layers,
  Users2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const courses = [
  {
    title: 'Full Stack Web Development',
    code: 'FSWD',
    description: 'Master frontend and backend technologies with MERN stack.',
    units: 12,
    topics: 48,
    colleges: 4,
    accentColor: 'bg-[#2563eb]', // Brighter blue
  },
  {
    title: 'Python Programming',
    code: 'Python Programming',
    description:
      'Introduction to Python, data types, and automation scripts relaxx.',
    units: 8,
    topics: 24,
    colleges: 4,
    accentColor: 'bg-[#16a34a]', // Brighter green
    customCode: 'PYTH',
  },
  {
    title: 'Data Structures & Algorithms',
    code: 'DSA',
    description: 'Core concepts of DSA using Java and C++.',
    units: 15,
    topics: 60,
    colleges: 2,
    accentColor: 'bg-[#9333ea]', // Brighter purple
  },
];

export default function AdminCourses() {
  return (
    <div className='p-8 space-y-6 bg-[#f8fafc] min-h-screen'>
      {/* Header Section */}
      <div className='flex flex-col sm:flex-row justify-between items-center gap-4'>
        <div className='relative w-full sm:w-100'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4' />
          <Input
            placeholder='Search courses...'
            className='pl-10 bg-white border-slate-200 h-11 rounded-md shadow-sm'
          />
        </div>
        <Button className='bg-[#2e3c85] hover:bg-[#25316d] text-white font-semibold h-11 px-6 rounded-md gap-2'>
          <Plus className='w-5 h-5' /> Create Course
        </Button>
      </div>

      {/* Course Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {courses.map((course) => (
          <Card
            key={course.title}
            className='border border-slate-200 shadow-sm overflow-hidden bg-white rounded-xl'
          >
            {/* Top Accent Bar */}
            <div className={cn('h-1.5 w-full', course.accentColor)} />

            <CardHeader className='space-y-4 p-6 pb-4'>
              <div className='flex justify-between items-start'>
                <Badge
                  variant='secondary'
                  className='bg-[#f1f5f9] text-[#64748b] font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider'
                >
                  {course.customCode || course.code}
                </Badge>
                <button className='text-slate-400 hover:text-slate-600 transition-colors'>
                  <MoreVertical className='w-5 h-5' />
                </button>
              </div>

              <div className='space-y-3'>
                <h3 className='text-[22px] font-bold text-[#1e293b] leading-tight'>
                  {course.title}
                </h3>
                <p className='text-[15px] text-[#64748b] leading-relaxed line-clamp-2'>
                  {course.description}
                </p>
              </div>
            </CardHeader>

            <CardContent className='p-6 pt-2 space-y-6'>
              {/* Divider */}
              <div className='h-px bg-slate-100 w-full' />

              {/* Stats Row 1: Units and Topics */}
              <div className='flex items-center gap-12 text-[#94a3b8]'>
                <div className='flex items-center gap-2'>
                  <BookOpen className='w-5 h-5 opacity-70' />
                  <span className='text-sm font-medium text-[#475569]'>
                    {course.units} Units
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Layers className='w-5 h-5 opacity-70' />
                  <span className='text-sm font-medium text-[#475569]'>
                    {course.topics} Topics
                  </span>
                </div>
              </div>

              {/* Stats Row 2: Colleges and Manage Access */}
              <div className='flex items-center justify-between pt-2'>
                <div className='flex items-center gap-2 text-[#94a3b8]'>
                  <Users2 className='w-5 h-5 opacity-70' />
                  <span className='text-sm font-medium text-[#475569]'>
                    {course.colleges} Colleges
                  </span>
                </div>
                <button className='text-[#3b49a2] font-bold text-sm hover:underline transition-all'>
                  Manage Access
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
