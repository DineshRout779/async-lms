import { useEffect, useState } from 'react';
import apiClient from '@/services/api';
import { Loader2, Code2, Layout, Boxes, Zap, BookOpen, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import type { Subject } from '@/utils/types';

const getCourseTheme = (slug: string) => {
  if (slug.includes('frontend') || slug.includes('react'))
    return { icon: Code2, color: 'bg-[#333D7C]' };
  if (slug.includes('backend') || slug.includes('node'))
    return { icon: Boxes, color: 'bg-[#0a3a3a]' };
  if (slug.includes('devops') || slug.includes('kubernetes'))
    return { icon: Zap, color: 'bg-[#4c1d95]' };
  return { icon: Layout, color: 'bg-[#333D7C]' };
};

type Tab = 'enrolled' | 'all';

const MyCourses = () => {
  const [enrolled, setEnrolled] = useState<Subject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('enrolled');
  const [enrollTarget, setEnrollTarget] = useState<Subject | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const navigate = useNavigate();

  const fetchCourses = async () => {
    const [enrolledRes, allRes] = await Promise.allSettled([
      apiClient.get<{ success: boolean; data: Subject[] }>('/users/subjects'),
      apiClient.get<{ success: boolean; data: Subject[] }>('/subjects/published'),
    ]);
    if (enrolledRes.status === 'fulfilled' && enrolledRes.value.data.success)
      setEnrolled(enrolledRes.value.data.data);
    if (allRes.status === 'fulfilled' && allRes.value.data.success)
      setAllSubjects(allRes.value.data.data);
  };

  useEffect(() => {
    fetchCourses().finally(() => setLoading(false));
  }, []);

  const handleEnroll = async () => {
    if (!enrollTarget) return;
    setEnrolling(true);
    try {
      await apiClient.post(`/students/subjects/${enrollTarget.id}/enroll`);
      toast.success(`Enrolled in ${enrollTarget.name}!`);
      setEnrollTarget(null);
      await fetchCourses();
    } catch {
      toast.error('Enrollment failed. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const enrolledIds = new Set(enrolled.map((s) => s.id));

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'enrolled', label: 'Enrolled', count: enrolled.length },
    { id: 'all', label: 'All', count: allSubjects.length },
  ];

  if (loading)
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-[#333D7C]' />
      </div>
    );

  const displayCourses = activeTab === 'enrolled' ? enrolled : allSubjects;

  return (
    <div className='p-8 max-w-7xl mx-auto space-y-8'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold text-[#1e293b]'>Courses</h1>
        <p className='text-slate-500 mt-1'>Browse and continue your learning</p>
      </div>

      {/* Tabs */}
      <div className='flex items-center gap-1 border-b border-slate-200'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-[#333D7C] text-[#333D7C]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? 'bg-[#333D7C]/10 text-[#333D7C]'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {displayCourses.length === 0 ? (
        <div className='flex flex-col items-center justify-center h-60 text-slate-400 gap-3'>
          <BookOpen className='w-10 h-10 text-slate-300' />
          <p className='text-sm'>
            {activeTab === 'enrolled'
              ? "You haven't enrolled in any courses yet."
              : 'No courses available.'}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {displayCourses.map((course) => {
            const { icon: Icon, color } = getCourseTheme(course.slug || '');
            const progress = Math.round(course.progress_percent || 0);
            const isEnrolled = enrolledIds.has(course.id);

            return (
              <div
                key={course.id}
                onClick={() =>
                  isEnrolled
                    ? navigate(`/dashboard/student/courses/${course.slug}`)
                    : undefined
                }
                className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm transition-all duration-300 overflow-hidden group ${
                  isEnrolled
                    ? 'hover:shadow-xl cursor-pointer'
                    : 'cursor-default'
                }`}
              >
                {/* Header */}
                <div
                  className={`${isEnrolled ? color : 'bg-slate-200'} h-44 flex items-center justify-center relative`}
                >
                  <Icon
                    className={`w-16 h-16 transition-transform ${
                      isEnrolled
                        ? 'text-white/90 group-hover:scale-110'
                        : 'text-slate-400'
                    }`}
                  />
                  {activeTab === 'all' && isEnrolled && (
                    <span className='absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-full'>
                      Enrolled
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className='p-8 space-y-5'>
                  <div className='flex gap-2 flex-wrap'>
                    <Badge
                      variant='secondary'
                      className='bg-slate-50 text-slate-500 border-none px-3 py-0.5 text-[10px] font-bold uppercase'
                    >
                      {course.level || 'General'}
                    </Badge>
                    {isEnrolled && progress > 0 && progress < 100 && (
                      <Badge className='bg-[#333D7C]/10 text-[#333D7C] border-none px-3 py-0.5 text-[10px] font-bold uppercase'>
                        In Progress
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className='text-2xl font-bold text-[#1e293b] leading-tight'>
                      {course.name}
                    </h3>
                    <p className='text-slate-400 text-sm mt-2'>
                      {course.level || 'Beginner'} •{' '}
                      {course.total_lessons ?? '—'} Lessons
                    </p>
                  </div>

                  {isEnrolled ? (
                    <div className='space-y-3 pt-1'>
                      <div className='flex justify-between text-sm font-bold text-[#1e293b]'>
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress
                        value={progress}
                        className='h-2 bg-slate-100 rounded-full'
                      />
                    </div>
                  ) : (
                    <Button
                      size='sm'
                      className='w-full gap-2 bg-[#333D7C] hover:bg-[#2a3268] text-white'
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnrollTarget(course);
                      }}
                    >
                      <PlusCircle className='w-4 h-4' />
                      Enroll Now
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enroll Confirmation Dialog */}
      <Dialog
        open={!!enrollTarget}
        onOpenChange={(open) => !open && setEnrollTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll in {enrollTarget?.name}?</DialogTitle>
            <DialogDescription>
              You're about to enroll in{' '}
              <span className='font-semibold text-slate-700'>
                {enrollTarget?.name}
              </span>
              . This will add the course to your learning path and unlock the
              first module.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setEnrollTarget(null)}
              disabled={enrolling}
            >
              Cancel
            </Button>
            <Button onClick={handleEnroll} disabled={enrolling} className='bg-[#333D7C] hover:bg-[#2a3268] text-white'>
              {enrolling ? (
                <Loader2 className='w-4 h-4 animate-spin mr-2' />
              ) : null}
              {enrolling ? 'Enrolling...' : 'Confirm Enroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyCourses;
