import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Play,
  BookOpen,
  Clock,
  Trophy,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import apiClient from '@/services/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SubjectInfo {
  name: string;
  description: string;
  total_topics: number;
  total_subtopics: number;
  first_lesson_slug?: string;
}

interface Subtopic {
  id: string;
  title: string;
  slug: string;
}

interface Unit {
  id: string;
  title: string;
  subtopics: Subtopic[];
}

interface Module {
  id: string;
  title: string;
  units: Unit[];
}

interface CourseData {
  name: string;
  description: string;
  data: Module[];
}

const CourseIntro = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<SubjectInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const { data } = await apiClient.get<CourseData>(`/subjects/${slug}`);

        // Helper to count all subtopics across all modules and units
        const totalSubtopics = data.data.reduce((total, module) => {
          return (
            total +
            module.units.reduce(
              (unitTotal, unit) => unitTotal + unit.subtopics.length,
              0,
            )
          );
        }, 0);

        // Find the first lesson slug for "Start Learning"
        // Traverse: First Module -> First Unit -> First Subtopic
        const firstLesson = data.data[0]?.units[0]?.subtopics[0]?.slug;

        setCourse({
          name: data.name || 'Course Overview',
          description:
            data.description || "Welcome to this course. Let's get started!",
          total_topics: data.data.length, // Counting Modules as "Chapters"
          total_subtopics: totalSubtopics,
          first_lesson_slug: firstLesson,
        });
      } catch (err) {
        console.error('Failed to fetch course details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseDetails();
  }, [slug]);

  const startLearning = () => {
    if (course?.first_lesson_slug) {
      navigate(
        `/dashboard/student/courses/${slug}/lesson/${course.first_lesson_slug}`,
      );
    }
  };

  if (loading)
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='animate-spin text-blue-600' />
      </div>
    );

  return (
    <div className='max-w-5xl mx-auto p-8 space-y-10 animate-in fade-in duration-700'>
      {/* Hero Section */}
      <div className='relative overflow-hidden rounded-3xl bg-[#1e2653] p-10 text-white shadow-2xl'>
        <div className='relative z-10 space-y-6 max-w-2xl'>
          <h1 className='text-4xl md:text-5xl font-black tracking-tight leading-tight'>
            {course?.name}
          </h1>
          <p className='text-blue-100 text-lg leading-relaxed opacity-90'>
            {course?.description}
          </p>
          <div className='flex flex-wrap gap-4 pt-4'>
            <Button
              size='lg'
              onClick={startLearning}
              className='bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 px-8 rounded-xl shadow-lg shadow-blue-900/20 gap-2'
            >
              <Play className='w-5 h-5 fill-current' /> Start Learning
            </Button>
          </div>
        </div>
        {/* Decorative Graphic */}
        <div className='absolute top-0 right-0 w-1/3 h-full bg-linear-to-l from-blue-500/10 to-transparent pointer-events-none' />
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <StatCard
          icon={<BookOpen className='text-blue-600' />}
          label='Curriculum'
          value={`${course?.total_topics} Topics`}
        />
        <StatCard
          icon={<Clock className='text-orange-600' />}
          label='Content'
          value={`${course?.total_subtopics} Lessons`}
        />
        <StatCard
          icon={<Trophy className='text-emerald-600' />}
          label='Certificate'
          value='On Completion'
        />
      </div>

      {/* Progress & Quick Continue */}
      <div className='bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8'>
        <div className='space-y-2 w-full md:w-1/2'>
          <div className='flex justify-between text-sm font-bold mb-1'>
            <span className='text-slate-500 uppercase tracking-wider'>
              Your Progress
            </span>
            <span className='text-blue-600'>0%</span>
          </div>
          <Progress value={0} className='h-3 bg-slate-100' />
        </div>
        <div className='flex items-center gap-4'>
          <div className='text-right hidden sm:block'>
            <p className='text-xs font-bold text-slate-400 uppercase tracking-widest'>
              Last Activity
            </p>
            <p className='text-sm font-semibold text-slate-700'>
              Not started yet
            </p>
          </div>
          <Button
            variant='outline'
            className='rounded-xl border-slate-200 font-bold'
            onClick={startLearning}
          >
            View Syllabus <ChevronRight className='w-4 h-4 ml-1' />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Simple Stat Card Helper
const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className='bg-white border border-slate-100 p-6 rounded-2xl flex items-center gap-4 shadow-sm'>
    <div className='p-3 bg-slate-50 rounded-xl'>{icon}</div>
    <div>
      <p className='text-xs font-bold text-slate-400 uppercase tracking-widest'>
        {label}
      </p>
      <p className='text-lg font-bold text-slate-800'>{value}</p>
    </div>
  </div>
);

export default CourseIntro;
