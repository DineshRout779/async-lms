import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Sparkles, Loader2, Trash2, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';
import type { AiCourse, CourseStatus } from '@/features/aiCurriculum/types';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

const STATUS_CONFIG: Record<CourseStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:              { label: 'Draft',             color: 'bg-slate-100 text-slate-600',  icon: Clock },
  in_review:          { label: 'In Review',         color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  changes_requested:  { label: 'Changes Requested', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  approved:           { label: 'Approved',          color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  published:          { label: 'Published',         color: 'bg-blue-100 text-blue-700',   icon: CheckCircle },
};

function CourseCard({
  course, isAdmin, onDelete, base,
}: {
  course: AiCourse; isAdmin: boolean; onDelete: (id: string) => void; base: string;
}) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[course.status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  const [deleting, setDeleting] = useState(false);

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

  const canDelete = course.status !== 'published' && (isAdmin || course.status === 'draft' || course.status === 'changes_requested');
  const reviewPath = isAdmin && course.status === 'in_review'
    ? `${base}/ai-curriculum/${course.id}/review`
    : `${base}/ai-curriculum/${course.id}/edit`;

  return (
    <div
      onClick={() => navigate(reviewPath)}
      className='bg-white border border-slate-100 rounded-2xl p-5 cursor-pointer hover:shadow-md hover:border-blue-100 transition-all group'
    >
      <div className='flex items-start justify-between mb-3'>
        <div className='flex-1 min-w-0'>
          <h3 className='font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors'>
            {course.title}
          </h3>
          <p className='text-xs text-slate-500 mt-0.5 capitalize'>
            {course.role_focus} · {course.domain} · {course.level}
          </p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ${cfg.color}`}>
          <Icon className='w-3 h-3' />
          {cfg.label}
        </span>
      </div>

      <div className='flex items-center gap-3 text-xs text-slate-400'>
        <span>{course.skills?.length ?? 0} skills</span>
        <span>·</span>
        <span className='capitalize'>{course.audience}</span>
        <span>·</span>
        <span>{new Date(course.created_at).toLocaleDateString()}</span>
        {isAdmin && (
          <>
            <span>·</span>
            <span>by {course.creator_name}</span>
          </>
        )}
      </div>

      <div className='flex items-center justify-between mt-4 pt-3 border-t border-slate-50'>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(reviewPath); }}
          className='flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700'
        >
          <Eye className='w-3.5 h-3.5' />
          {isAdmin && course.status === 'in_review' ? 'Review' : 'Open Editor'}
        </button>

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className='flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors'
          >
            {deleting ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Trash2 className='w-3.5 h-3.5' />}
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

const FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Changes Requested', value: 'changes_requested' },
  { label: 'Approved', value: 'approved' },
  { label: 'Published', value: 'published' },
];

export default function AiCurriculumList() {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const isAdmin = user?.role === 'admin';
  const base = isAdmin ? '/dashboard/admin' : '/dashboard/facilitator';

  const [courses, setCourses] = useState<AiCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    aiCurriculumApi
      .list(filter ? { status: filter } : undefined)
      .then((res) => setCourses(res.data.data))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleDelete = (id: string) => {
    setCourses((cs) => cs.filter((c) => c.id !== id));
  };

  const pendingReview = isAdmin ? courses.filter((c) => c.status === 'in_review') : [];

  return (
    <div className='max-w-5xl mx-auto px-4 py-6'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <div className='flex items-center gap-2'>
            <Sparkles className='w-5 h-5 text-blue-600' />
            <h1 className='text-2xl font-bold text-[#1e2653]'>AI Curriculum Builder</h1>
          </div>
          <p className='text-sm text-slate-500 mt-0.5'>
            {isAdmin ? 'Manage and review AI-generated courses' : 'Create and manage your AI-generated courses'}
          </p>
        </div>
        <button
          onClick={() => navigate(`${base}/ai-curriculum/new`)}
          className='flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm'
        >
          <Plus className='w-4 h-4' /> New Course
        </button>
      </div>

      {/* Pending review alert (admin) */}
      {isAdmin && pendingReview.length > 0 && (
        <div className='mb-5 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <AlertCircle className='w-4 h-4 text-yellow-600' />
            <span className='text-sm font-semibold text-yellow-800'>
              {pendingReview.length} course{pendingReview.length > 1 ? 's' : ''} waiting for review
            </span>
          </div>
          <button
            onClick={() => setFilter('in_review')}
            className='text-xs font-bold text-yellow-700 underline'
          >
            View
          </button>
        </div>
      )}

      {/* Filters */}
      <div className='flex gap-2 flex-wrap mb-5'>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 text-slate-600 hover:border-blue-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className='flex items-center justify-center h-48'>
          <Loader2 className='w-6 h-6 animate-spin text-blue-500' />
        </div>
      ) : courses.length === 0 ? (
        <div className='text-center py-20 bg-white rounded-2xl border border-slate-100'>
          <Sparkles className='w-10 h-10 text-slate-200 mx-auto mb-3' />
          <h3 className='text-base font-bold text-slate-500 mb-1'>No courses yet</h3>
          <p className='text-sm text-slate-400 mb-5'>
            {filter ? 'No courses match this filter.' : 'Start building your first AI-powered curriculum.'}
          </p>
          {!filter && (
            <button
              onClick={() => navigate(`${base}/ai-curriculum/new`)}
              className='inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors'
            >
              <Plus className='w-4 h-4' /> Create First Course
            </button>
          )}
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
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
