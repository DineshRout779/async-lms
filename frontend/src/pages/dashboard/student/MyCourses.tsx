import { useEffect, useState } from 'react';
import apiClient from '@/services/api';
import { Loader2, Code2, Layout, Boxes, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router';

// Maps subjects to specific header styles and icons based on slug/name
const getCourseTheme = (slug: string) => {
  if (slug.includes('frontend') || slug.includes('react'))
    return { icon: Code2, color: 'bg-[#2e5cd5]' };
  if (slug.includes('backend') || slug.includes('node'))
    return { icon: Boxes, color: 'bg-[#0a3a3a]' };
  if (slug.includes('devops') || slug.includes('kubernetes'))
    return { icon: Zap, color: 'bg-[#4c1d95]' };
  return { icon: Layout, color: 'bg-slate-800' };
};

const MyCourses = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        const { data } = await apiClient.get('/users/subjects');
        if (data.success) setSubjects(data.data);
      } finally {
        setLoading(false);
      }
    };
    fetchMyCourses();
  }, []);

  if (loading)
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    );

  return (
    <div className='p-8 max-w-7xl mx-auto space-y-10'>
      <div>
        <h1 className='text-3xl font-bold text-[#1e293b]'>My Courses</h1>
        <p className='text-slate-500 mt-1'>Continue where you left off</p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
        {subjects.map((course) => {
          const { icon: Icon, color } = getCourseTheme(course.slug || '');
          const progress = Math.round(course.progress_percent || 0);

          return (
            <div
              key={course.id}
              onClick={() =>
                navigate(`/dashboard/student/courses/${course.slug}`)
              }
              className='bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group'
            >
              {/* Header Visual */}
              <div
                className={`${color} h-44 flex items-center justify-center transition-transform duration-300`}
              >
                <Icon className='w-16 h-16 text-white/90 group-hover:scale-110 transition-transform' />
              </div>

              {/* Content Section */}
              <div className='p-8 space-y-6'>
                <div className='flex gap-2'>
                  <Badge
                    variant='secondary'
                    className='bg-slate-50 text-slate-500 border-none px-3 py-0.5 text-[10px] font-bold uppercase'
                  >
                    {course.level || 'General'}
                  </Badge>
                  {progress > 0 && progress < 100 && (
                    <Badge className='bg-blue-50 text-blue-600 border-none px-3 py-0.5 text-[10px] font-bold uppercase'>
                      In Progress
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className='text-2xl font-bold text-[#1e293b] leading-tight'>
                    {course.name}
                  </h3>
                  <p className='text-slate-400 text-sm mt-2'>
                    {course.level || 'Beginner'} • {course.total_lessons}{' '}
                    Lessons
                  </p>
                </div>

                <div className='space-y-3 pt-2'>
                  <div className='flex justify-between text-sm font-bold text-[#1e293b]'>
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress
                    value={progress}
                    className='h-2 bg-slate-100 rounded-full'
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyCourses;
