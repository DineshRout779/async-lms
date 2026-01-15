import { useEffect, useState } from 'react';
import apiClient from '@/services/api';
import { BookOpen, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';

interface Subject {
  id: number;
  name: string;
  description: string;
  isEnrolled: boolean;
  completed_at: string | null;
  slug: string | null;
}

const MyCourses = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        const { data } = await apiClient.get('/users/subjects');
        setSubjects(data);
      } catch (err) {
        console.log('error', err);
        toast.error('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };
    fetchMyCourses();
  }, []);

  const gotoCourse = ({ slug }: { slug: string | null }) => {
    navigate(`/dashboard/student/courses/${slug}`);
  };

  if (loading) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-3xl font-bold text-slate-900'>My Learning Path</h1>
        <p className='text-slate-500 mt-2'>
          Explore subjects and track your progress.
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className={cn(
              'group relative bg-white border rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
              subject.isEnrolled
                ? 'border-blue-100 ring-1 ring-blue-50'
                : 'border-slate-200'
            )}
          >
            <div className='flex justify-between items-start mb-4'>
              <div
                className={cn(
                  'p-3 rounded-xl',
                  subject.isEnrolled
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-slate-50 text-slate-400'
                )}
              >
                <BookOpen className='w-6 h-6' />
              </div>
              {subject.isEnrolled && (
                <Badge
                  variant='secondary'
                  className='bg-green-50 text-green-700 border-green-100 gap-1'
                >
                  <CheckCircle2 className='w-3 h-3' /> Enrolled
                </Badge>
              )}
            </div>

            <h3 className='text-xl font-bold text-slate-800 mb-2'>
              {subject.name}
            </h3>
            <p className='text-slate-500 text-sm line-clamp-2 mb-6'>
              {subject.description ||
                'Dive deep into the fundamentals and advanced concepts of this subject.'}
            </p>

            <div className='flex items-center justify-between mt-auto'>
              {subject.isEnrolled ? (
                <Button
                  onClick={() => gotoCourse({ slug: subject.slug })}
                  className='w-full bg-blue-600 hover:bg-blue-700 group-hover:gap-3 transition-all'
                >
                  Continue Learning <ArrowRight className='w-4 h-4 ml-2' />
                </Button>
              ) : (
                <Button
                  variant='outline'
                  className='w-full border-slate-200 text-slate-600 hover:bg-slate-50'
                >
                  Enrol Now
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyCourses;
