import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, ChevronDown, ChevronRight, CheckCircle,
  XCircle, MessageSquare, Loader2, Sparkles,
} from 'lucide-react';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';
import type { AiCourse, AiModule, ReviewFeedback, CourseAction } from '@/features/aiCurriculum/types';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

// ─── Curriculum tree (read-only) ─────────────────────────────────────────────

function LessonView({ lesson }: { lesson: AiModule['topics'][0]['lessons'][0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className='border border-slate-100 rounded-lg overflow-hidden'>
      <button
        className='w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50'
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className='w-3.5 h-3.5 text-slate-400' /> : <ChevronRight className='w-3.5 h-3.5 text-slate-400' />}
        <span className='text-sm text-slate-700'>{lesson.title}</span>
      </button>
      {open && (
        <div className='px-4 pb-4 pt-1 bg-slate-50 border-t border-slate-100 space-y-3'>
          {lesson.explanation && (
            <div>
              <p className='text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5'>Explanation</p>
              <p className='text-sm text-slate-700'>{lesson.explanation}</p>
            </div>
          )}
          {lesson.example && (
            <div>
              <p className='text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5'>Example</p>
              <p className='text-sm text-slate-700'>{lesson.example}</p>
            </div>
          )}
          {lesson.activity && (
            <div>
              <p className='text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5'>Activity</p>
              <p className='text-sm text-slate-700'>{lesson.activity}</p>
            </div>
          )}
          {lesson.interview_questions?.length > 0 && (
            <div>
              <p className='text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1'>Interview Questions</p>
              <ul className='space-y-1'>
                {lesson.interview_questions.map((q, i) => (
                  <li key={i} className='text-sm text-slate-600 flex gap-1.5'>
                    <span className='text-blue-400 font-bold flex-shrink-0'>Q{i + 1}.</span>{q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleView({ mod }: { mod: AiModule }) {
  const [open, setOpen] = useState(true);
  return (
    <div className='bg-white border-2 border-slate-100 rounded-xl overflow-hidden'>
      <button
        className='w-full flex items-center gap-3 px-5 py-4 text-left bg-blue-50/60 hover:bg-blue-50 transition-colors border-b border-slate-100'
        onClick={() => setOpen((v) => !v)}
      >
        <span className='w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0'>
          {mod.order_index + 1}
        </span>
        <span className='font-bold text-slate-800 flex-1'>{mod.title}</span>
        <span className='text-xs text-slate-400'>{mod.topics.length} topics</span>
        {open ? <ChevronDown className='w-4 h-4 text-slate-400' /> : <ChevronRight className='w-4 h-4 text-slate-400' />}
      </button>

      {open && (
        <div className='px-5 py-4 space-y-4'>
          {mod.description && <p className='text-sm text-slate-600'>{mod.description}</p>}

          {mod.practice_tasks?.length > 0 && (
            <div>
              <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5'>Practice Tasks</p>
              <ul className='space-y-1'>
                {mod.practice_tasks.map((t, i) => (
                  <li key={i} className='text-sm text-slate-600 flex gap-1.5'>
                    <span className='text-green-500 font-bold flex-shrink-0'>→</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mod.topics.map((topic) => (
            <div key={topic.id}>
              <div className='flex items-center gap-2 mb-2'>
                <ChevronRight className='w-3.5 h-3.5 text-slate-400' />
                <span className='text-sm font-semibold text-slate-700'>{topic.title}</span>
                <span className='text-xs text-slate-400'>({topic.lessons.length} lessons)</span>
              </div>
              <div className='ml-5 space-y-1.5'>
                {topic.lessons.map((lesson) => (
                  <LessonView key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── JD Alignment panel ───────────────────────────────────────────────────────

function JDAlignmentPanel({ course }: { course: AiCourse }) {
  const technicalSkills = course.skills.filter((s) => s.category === 'technical');
  const toolSkills = course.skills.filter((s) => s.category === 'tools');
  const softSkills = course.skills.filter((s) => s.category === 'soft');

  return (
    <div className='grid grid-cols-2 gap-4'>
      {/* JD */}
      <div className='bg-slate-50 rounded-xl p-4 border border-slate-100'>
        <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-2'>Job Description</p>
        {course.jd_text ? (
          <p className='text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto'>{course.jd_text}</p>
        ) : (
          <p className='text-sm text-slate-400 italic'>No JD provided</p>
        )}
      </div>

      {/* Skills */}
      <div className='bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4'>
        <p className='text-xs font-bold text-slate-500 uppercase tracking-wide'>Extracted Skills</p>
        {technicalSkills.length > 0 && (
          <div>
            <p className='text-xs font-semibold text-blue-600 mb-1.5'>Technical</p>
            <div className='flex flex-wrap gap-1.5'>
              {technicalSkills.map((s, i) => (
                <span key={i} className='text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium'>{s.name}</span>
              ))}
            </div>
          </div>
        )}
        {toolSkills.length > 0 && (
          <div>
            <p className='text-xs font-semibold text-purple-600 mb-1.5'>Tools</p>
            <div className='flex flex-wrap gap-1.5'>
              {toolSkills.map((s, i) => (
                <span key={i} className='text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium'>{s.name}</span>
              ))}
            </div>
          </div>
        )}
        {softSkills.length > 0 && (
          <div>
            <p className='text-xs font-semibold text-green-600 mb-1.5'>Soft Skills</p>
            <div className='flex flex-wrap gap-1.5'>
              {softSkills.map((s, i) => (
                <span key={i} className='text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium'>{s.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Review form ──────────────────────────────────────────────────────────────

function ReviewForm({
  onSubmit, submitting,
}: {
  onSubmit: (action: CourseAction, feedback: ReviewFeedback) => void;
  submitting: boolean;
}) {
  const [action, setAction] = useState<CourseAction | ''>('');
  const [feedback, setFeedback] = useState<ReviewFeedback>({
    missing_skills: '', incorrect_content: '',
    difficulty_issues: '', suggestions: '', inline_comments: '',
  });

  const handleSubmit = () => {
    if (!action) { toast.error('Select an action'); return; }
    onSubmit(action as CourseAction, feedback);
  };

  return (
    <div className='bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-5'>
      <div className='flex items-center gap-2'>
        <MessageSquare className='w-4 h-4 text-slate-500' />
        <h3 className='font-bold text-slate-800'>Reviewer Decision</h3>
      </div>

      {/* Action selector */}
      <div className='grid grid-cols-3 gap-3'>
        {([
          { value: 'approved', label: 'Approve', icon: CheckCircle, color: 'border-green-500 bg-green-50 text-green-700' },
          { value: 'changes_requested', label: 'Request Changes', icon: MessageSquare, color: 'border-orange-400 bg-orange-50 text-orange-700' },
          { value: 'rejected', label: 'Reject', icon: XCircle, color: 'border-red-400 bg-red-50 text-red-700' },
        ] as const).map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            onClick={() => setAction(value)}
            className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
              action === value ? color : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <Icon className='w-4 h-4' /> {label}
          </button>
        ))}
      </div>

      {/* Feedback fields */}
      <div className='space-y-3'>
        {[
          { key: 'missing_skills', label: 'Missing Skills' },
          { key: 'incorrect_content', label: 'Incorrect Content' },
          { key: 'difficulty_issues', label: 'Difficulty Issues' },
          { key: 'suggestions', label: 'Suggestions (required for changes)' },
          { key: 'inline_comments', label: 'Additional Comments' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className='block text-xs font-semibold text-slate-600 mb-1'>{label}</label>
            <textarea
              rows={2}
              className='w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none'
              value={feedback[key as keyof ReviewFeedback] || ''}
              onChange={(e) => setFeedback((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!action || submitting}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          action === 'approved'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : action === 'rejected'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {submitting ? (
          <span className='flex items-center justify-center gap-2'>
            <Loader2 className='w-4 h-4 animate-spin' /> Submitting…
          </span>
        ) : (
          'Submit Review'
        )}
      </button>
    </div>
  );
}

// ─── Main review page ─────────────────────────────────────────────────────────

export default function AiCurriculumReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const isAdmin = user?.role === 'admin';

  const [course, setCourse] = useState<AiCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await aiCurriculumApi.get(id);
      setCourse(res.data.data);
    } catch {
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (action: CourseAction, feedback: ReviewFeedback) => {
    setSubmitting(true);
    try {
      await aiCurriculumApi.review(id!, action, feedback);
      toast.success(`Course ${action.replace('_', ' ')}`);
      navigate('/dashboard/admin/ai-curriculum');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Review failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='w-6 h-6 animate-spin text-blue-500' />
      </div>
    );
  }

  if (!course) return <div className='p-8 text-slate-500'>Course not found.</div>;

  return (
    <div className='max-w-5xl mx-auto px-4 py-6'>
      {/* Header */}
      <div className='flex items-center gap-3 mb-6'>
        <button
          onClick={() => navigate('/dashboard/admin/ai-curriculum')}
          className='p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors'
        >
          <ArrowLeft className='w-4 h-4' />
        </button>
        <div>
          <div className='flex items-center gap-2'>
            <Sparkles className='w-4 h-4 text-blue-500' />
            <h1 className='text-xl font-bold text-[#1e2653]'>Course Review</h1>
          </div>
          <p className='text-xs text-slate-500 mt-0.5'>
            {course.title} · by {course.creator_name} · {course.role_focus}
          </p>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-6'>
        {/* Left: curriculum */}
        <div className='col-span-2 space-y-5'>
          {/* JD alignment */}
          <section>
            <h2 className='text-sm font-bold text-slate-700 mb-3'>JD Alignment</h2>
            <JDAlignmentPanel course={course} />
          </section>

          {/* Curriculum tree */}
          <section>
            <h2 className='text-sm font-bold text-slate-700 mb-3'>
              Curriculum ({course.modules.length} modules)
            </h2>
            <div className='space-y-3'>
              {course.modules.map((mod) => (
                <ModuleView key={mod.id} mod={mod} />
              ))}
            </div>
          </section>
        </div>

        {/* Right: review form + metadata */}
        <div className='space-y-4'>
          {/* Course info */}
          <div className='bg-white border border-slate-200 rounded-xl p-4 space-y-2'>
            <h3 className='text-xs font-bold text-slate-500 uppercase tracking-wide'>Course Info</h3>
            {[
              ['Domain', course.domain],
              ['Audience', course.audience],
              ['Level', course.level],
              ['Goal', course.learning_goal],
              ['Duration', course.duration_weeks ? `${course.duration_weeks} weeks` : '—'],
              ['Style', course.content_preference || '—'],
            ].map(([k, v]) => (
              <div key={k} className='flex justify-between text-sm'>
                <span className='text-slate-500'>{k}</span>
                <span className='font-medium text-slate-700 capitalize'>{v}</span>
              </div>
            ))}
          </div>

          {/* Review history */}
          {course.reviews?.length > 0 && (
            <div className='bg-white border border-slate-200 rounded-xl p-4'>
              <h3 className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-3'>Review History</h3>
              <div className='space-y-2'>
                {course.reviews.map((r) => (
                  <div key={r.id} className='text-xs border border-slate-100 rounded-lg p-2.5'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='font-semibold text-slate-700'>{r.reviewer_name}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-bold ${
                        r.action === 'approved' ? 'bg-green-100 text-green-700' :
                        r.action === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {r.action.replace('_', ' ')}
                      </span>
                    </div>
                    {r.feedback?.suggestions && (
                      <p className='text-slate-600'>{r.feedback.suggestions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review form — only admin, only when in_review */}
          {isAdmin && course.status === 'in_review' && (
            <ReviewForm onSubmit={handleReview} submitting={submitting} />
          )}
        </div>
      </div>
    </div>
  );
}
