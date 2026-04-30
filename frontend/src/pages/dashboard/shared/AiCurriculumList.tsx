import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Loader2,
  Trash2,
  ShieldCheck,
  Search,
  Plus,
  Pencil,
} from 'lucide-react';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';
import type { AiCourse, CourseStatus } from '@/features/aiCurriculum/types';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

const DOT_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-emerald-500',
  'bg-orange-400',
  'bg-red-500',
  'bg-sky-500',
];

const STATUS_STYLES: Record<
  CourseStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  in_review: { label: 'In Review', className: 'bg-yellow-100 text-yellow-700' },
  changes_requested: {
    label: 'Changes Requested',
    className: 'bg-orange-100 text-orange-700',
  },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  published: { label: 'Published', className: 'bg-blue-100 text-blue-700' },
};

const STATUS_TABS: { label: string; value: CourseStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Changes Requested', value: 'changes_requested' },
  { label: 'Approved', value: 'approved' },
  { label: 'Published', value: 'published' },
];

function courseCode(title: string, idx: number) {
  const words = title.trim().split(/\s+/);
  const abbr = words
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return `${abbr}-${String(idx + 1).padStart(3, '0')}`;
}

function CourseCard({
  course,
  index,
  isAdmin,
  onDelete,
  base,
}: {
  course: AiCourse;
  index: number;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  base: string;
}) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const dotColor = DOT_COLORS[index % DOT_COLORS.length];
  const status = STATUS_STYLES[course.status] ?? STATUS_STYLES.draft;

  const editPath =
    isAdmin && course.status === 'in_review'
      ? `${base}/ai-curriculum/${course.id}/review`
      : `${base}/ai-curriculum/${course.id}/edit`;

  const canDelete =
    course.status !== 'published' &&
    (isAdmin ||
      course.status === 'draft' ||
      course.status === 'changes_requested');

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this course?')) return;
    setDeleting(true);
    try {
      await aiCurriculumApi.delete(course.id);
      onDelete(course.id);
      toast.success('Deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const moduleCount = course.modules?.length ?? 0;
  const topicCount =
    course.modules?.reduce((acc, m) => acc + (m.topics?.length ?? 0), 0) ?? 0;

  const tags: string[] = [];
  if (course.domain) tags.push(course.domain);
  if (course.level) tags.push(course.level);
  if (course.role_focus) tags.push(course.role_focus);

  return (
    <div className='bg-white border border-slate-200 rounded-2xl p-5 flex flex-col hover:shadow-sm transition-shadow h-full'>
      {/* Top row */}
      <div className='flex items-center justify-between mb-4'>
        <div className={`w-3 h-3 rounded-full ${dotColor}`} />
        <span className='text-[11px] font-bold text-slate-700 border border-slate-200 rounded-full px-2.5 py-0.5 tracking-wide'>
          {courseCode(course.title, index)}
        </span>
      </div>

      {/* Main content */}
      <div className='flex-1 flex flex-col'>
        <h3 className='font-bold text-[17px] text-slate-900 leading-tight mb-1.5'>
          {course.title}
        </h3>
        <p className='text-[13px] text-slate-500 leading-snug line-clamp-2'>
          {course.learning_goal || course.role_focus || '—'}
        </p>

        {/* Stats */}
        <div className='flex items-center gap-5 mt-4'>
          <div className='text-[13px]'>
            <span className='font-bold text-slate-800'>{moduleCount}</span>{' '}
            <span className='text-slate-400'>Topics</span>
          </div>
          <div className='text-[13px]'>
            <span className='font-bold text-slate-800'>{topicCount}</span>{' '}
            <span className='text-slate-400'>Units</span>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className='flex flex-wrap gap-2 mt-4'>
            {tags.map((tag, i) => (
              <span
                key={i}
                className='px-3 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200 rounded-full capitalize'
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className='mt-3 mb-1'>
        <span
          className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Actions */}
      <div className='mt-3 flex items-center gap-2.5'>
        <button
          onClick={() => navigate(editPath)}
          className='flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-full text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors'
        >
          <ShieldCheck className='w-4 h-4 text-slate-400' />
          {isAdmin && course.status === 'in_review' ? 'Review' : 'Access'}
        </button>
        <button
          onClick={() => navigate(editPath)}
          className='flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-full text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors'
        >
          <Pencil className='w-4 h-4 text-slate-400' />
          Edit
        </button>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className='p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors shrink-0'
          >
            {deleting ? (
              <Loader2 className='w-4.5 h-4.5 animate-spin' />
            ) : (
              <Trash2 className='w-4.5 h-4.5' />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AiCurriculumList() {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const isAdmin = user?.role === 'admin';
  const base = isAdmin ? '/dashboard/admin' : '/dashboard/facilitator';

  const [courses, setCourses] = useState<AiCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    aiCurriculumApi
      .list()
      .then((res) => {
        if (!cancelled) setCourses(res.data.data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load courses');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = courses.filter((c) => {
    const matchesSearch =
      !search.trim() ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.role_focus.toLowerCase().includes(search.toLowerCase()) ||
      c.domain.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string) =>
    setCourses((cs) => cs.filter((c) => c.id !== id));

  // Count per status for tab badges
  const countByStatus = courses.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className='p-4 max-w-350 mx-auto'>
      {/* Header Row */}
      <div className='flex items-start justify-between mb-6'>
        <div>
          <h1 className='text-[26px] font-extrabold text-slate-800 tracking-tight'>
            Courses
          </h1>
          <p className='text-[14px] text-slate-500 mt-1'>
            Manage course curriculum and access
          </p>
        </div>
        <button
          onClick={() => navigate(`${base}/ai-curriculum/new`)}
          className='flex items-center gap-2 px-5 py-2.5 bg-[#1e2653] text-white text-sm font-semibold rounded-lg hover:bg-[#16203f] transition-colors shadow-sm'
        >
          <Plus className='w-4 h-4' /> Create Course with AI
        </button>
      </div>

      {/* Search + Status tabs row */}
      <div className='flex flex-col sm:flex-row sm:items-center gap-3 mb-6'>
        <div className='relative max-w-75'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
          <input
            type='text'
            placeholder='Search courses...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full bg-white pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {isAdmin && (
          <div className='flex items-center gap-1 flex-wrap'>
            {STATUS_TABS.map(({ label, value }) => {
              const count =
                value === 'all' ? courses.length : (countByStatus[value] ?? 0);
              return (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                    statusFilter === value
                      ? 'bg-[#1e2653] text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className={`ml-1.5 text-[10px] font-bold px-1.5 py-px rounded-full ${
                        statusFilter === value
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className='flex items-center justify-center h-48'>
          <Loader2 className='w-6 h-6 animate-spin text-blue-500' />
        </div>
      ) : filtered.length === 0 ? (
        <div className='text-center py-20 bg-white rounded-xl border border-slate-100'>
          <p className='text-sm font-semibold text-slate-500 mb-1'>
            No courses found
          </p>
          <p className='text-xs text-slate-400'>
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Create your first AI-powered course.'}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {filtered.map((course, i) => (
            <CourseCard
              key={course.id}
              course={course}
              index={i}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              base={base}
            />
          ))}
        </div>
      )}
    </div>
  );
}
