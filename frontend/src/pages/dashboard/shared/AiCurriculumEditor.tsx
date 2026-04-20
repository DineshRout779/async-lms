import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronDown, ChevronRight, Edit2, Check, X, Sparkles,
  Loader2, Send, Eye, ArrowLeft, GripVertical, Trash2, RotateCcw,
} from 'lucide-react';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';
import type { AiCourse, AiModule, AiTopic, AiLesson } from '@/features/aiCurriculum/types';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  in_review: 'bg-yellow-100 text-yellow-700',
  changes_requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-blue-100 text-blue-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  published: 'Published',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Inline text editor ───────────────────────────────────────────────────────

function InlineEdit({
  value, onSave, multiline = false, className = '',
}: {
  value: string; onSave: (v: string) => Promise<void>; multiline?: boolean; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <span
        className={`group/edit cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 transition-colors ${className}`}
        onClick={() => { setDraft(value); setEditing(true); }}
      >
        {value || <span className='text-slate-300 italic'>click to edit</span>}
        <Edit2 className='w-3 h-3 inline-block ml-1 opacity-0 group-hover/edit:opacity-60 text-blue-500' />
      </span>
    );
  }

  return (
    <span className='flex items-start gap-1'>
      {multiline ? (
        <textarea
          autoFocus
          rows={4}
          className={`border border-blue-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ${className}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      ) : (
        <input
          autoFocus
          className={`border border-blue-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        />
      )}
      <button onClick={save} disabled={saving} className='p-1 text-green-600 hover:bg-green-50 rounded flex-shrink-0 mt-0.5'>
        {saving ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Check className='w-3.5 h-3.5' />}
      </button>
      <button onClick={() => setEditing(false)} className='p-1 text-slate-400 hover:bg-slate-100 rounded flex-shrink-0 mt-0.5'>
        <X className='w-3.5 h-3.5' />
      </button>
    </span>
  );
}

// ─── Lesson panel ─────────────────────────────────────────────────────────────

function LessonRow({
  lesson, roleFocus, level, onUpdate,
}: {
  lesson: AiLesson;
  roleFocus: string;
  level: string;
  onUpdate: (updated: Partial<AiLesson>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [showRegenInput, setShowRegenInput] = useState(false);

  const save = async (field: keyof AiLesson, value: string | string[]) => {
    await aiCurriculumApi.updateLesson(lesson.id, { [field]: value });
    onUpdate({ [field]: value });
  };

  const handleRegenerate = async () => {
    if (!instruction.trim()) { toast.error('Enter an instruction'); return; }
    setRegenerating(true);
    try {
      const res = await aiCurriculumApi.regenerateLesson(lesson.id, instruction);
      onUpdate(res.data.data);
      setShowRegenInput(false);
      setInstruction('');
      toast.success('Lesson regenerated');
    } catch {
      toast.error('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className='border border-slate-100 rounded-lg overflow-hidden'>
      {/* Header */}
      <button
        className='w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors'
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className='w-4 h-4 text-slate-400 flex-shrink-0' /> : <ChevronRight className='w-4 h-4 text-slate-400 flex-shrink-0' />}
        <span className='text-sm font-medium text-slate-700 flex-1'>{lesson.title}</span>
        <span className='text-xs text-slate-400 flex-shrink-0'>Lesson</span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className='px-4 pb-4 space-y-4 bg-slate-50 border-t border-slate-100'>
          <div className='pt-3'>
            <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1'>Title</p>
            <InlineEdit value={lesson.title} onSave={(v) => save('title', v)} className='text-sm font-semibold text-slate-800' />
          </div>

          <div>
            <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1'>Explanation</p>
            <InlineEdit value={lesson.explanation} onSave={(v) => save('explanation', v)} multiline className='text-sm text-slate-700' />
          </div>

          <div>
            <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1'>Example</p>
            <InlineEdit value={lesson.example} onSave={(v) => save('example', v)} multiline className='text-sm text-slate-700' />
          </div>

          <div>
            <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1'>Activity</p>
            <InlineEdit value={lesson.activity} onSave={(v) => save('activity', v)} multiline className='text-sm text-slate-700' />
          </div>

          {lesson.interview_questions?.length > 0 && (
            <div>
              <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1'>Interview Questions</p>
              <ul className='space-y-1'>
                {lesson.interview_questions.map((q, i) => (
                  <li key={i} className='text-sm text-slate-700 flex items-start gap-1.5'>
                    <span className='text-blue-400 font-bold flex-shrink-0 mt-0.5'>Q{i + 1}.</span> {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI regenerate controls */}
          <div className='pt-2 border-t border-slate-200'>
            {showRegenInput ? (
              <div className='flex gap-2'>
                <input
                  className='flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400'
                  placeholder='e.g. "simplify the explanation", "add a real-world example", "make it more advanced"'
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRegenerate(); }}
                  autoFocus
                />
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className='flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'
                >
                  {regenerating ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Sparkles className='w-3.5 h-3.5' />}
                  Go
                </button>
                <button onClick={() => setShowRegenInput(false)} className='p-2 text-slate-400 hover:text-slate-600'>
                  <X className='w-3.5 h-3.5' />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowRegenInput(true)}
                className='flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700'
              >
                <RotateCcw className='w-3.5 h-3.5' /> Regenerate with AI
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Topic section ────────────────────────────────────────────────────────────

function TopicSection({
  topic, roleFocus, level, onUpdate,
}: {
  topic: AiTopic; roleFocus: string; level: string;
  onUpdate: (updated: Partial<AiTopic>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [lessons, setLessons] = useState(topic.lessons);

  const saveField = async (field: keyof AiTopic, value: string) => {
    await aiCurriculumApi.updateTopic(topic.id, { [field]: value });
    onUpdate({ [field]: value });
  };

  const updateLesson = (lessonId: string, updated: Partial<AiLesson>) => {
    setLessons((ls) => ls.map((l) => l.id === lessonId ? { ...l, ...updated } : l));
  };

  return (
    <div className='border border-slate-200 rounded-xl overflow-hidden'>
      <button
        className='w-full flex items-center gap-3 px-4 py-3 text-left bg-white hover:bg-slate-50 transition-colors'
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className='w-4 h-4 text-slate-400' /> : <ChevronRight className='w-4 h-4 text-slate-400' />}
        <span className='flex-1 text-sm font-semibold text-slate-700'>{topic.title}</span>
        <span className='text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full'>{lessons.length} lessons</span>
      </button>

      {open && (
        <div className='px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-3'>
          <div>
            <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1'>Topic Title</p>
            <InlineEdit value={topic.title} onSave={(v) => saveField('title', v)} className='text-sm font-semibold' />
          </div>
          {topic.description && (
            <div>
              <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1'>Description</p>
              <InlineEdit value={topic.description} onSave={(v) => saveField('description', v)} multiline className='text-sm text-slate-600' />
            </div>
          )}
          <div className='space-y-2 pt-1'>
            {lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                roleFocus={roleFocus}
                level={level}
                onUpdate={(u) => updateLesson(lesson.id, u)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module card ──────────────────────────────────────────────────────────────

function ModuleCard({
  module: mod, roleFocus, level, onUpdate,
}: {
  module: AiModule; roleFocus: string; level: string;
  onUpdate: (updated: Partial<AiModule>) => void;
}) {
  const [open, setOpen] = useState(true);
  const [topics, setTopics] = useState(mod.topics);

  const saveField = async (field: keyof AiModule, value: any) => {
    await aiCurriculumApi.updateModule(mod.id, { [field]: value });
    onUpdate({ [field]: value });
  };

  const updateTopic = (topicId: string, updated: Partial<AiTopic>) => {
    setTopics((ts) => ts.map((t) => t.id === topicId ? { ...t, ...updated } : t));
  };

  return (
    <div className='bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm'>
      {/* Module header */}
      <div className='flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-slate-100'>
        <GripVertical className='w-4 h-4 text-slate-300 flex-shrink-0 cursor-grab' />
        <button onClick={() => setOpen((v) => !v)} className='flex-1 flex items-center gap-2 text-left'>
          <span className='w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0'>
            {mod.order_index + 1}
          </span>
          <span className='font-bold text-slate-800'>{mod.title}</span>
          {open ? <ChevronDown className='w-4 h-4 text-slate-400 ml-auto' /> : <ChevronRight className='w-4 h-4 text-slate-400 ml-auto' />}
        </button>
        <span className='text-xs text-slate-400 flex-shrink-0'>{topics.length} topics</span>
      </div>

      {open && (
        <div className='px-5 py-4 space-y-4'>
          {/* Module meta */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1'>Module Title</p>
              <InlineEdit value={mod.title} onSave={(v) => saveField('title', v)} className='text-sm font-semibold text-slate-800' />
            </div>
            <div>
              <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1'>Description</p>
              <InlineEdit value={mod.description || ''} onSave={(v) => saveField('description', v)} multiline className='text-sm text-slate-600' />
            </div>
          </div>

          {/* Practice tasks */}
          {mod.practice_tasks?.length > 0 && (
            <div>
              <p className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5'>Practice Tasks</p>
              <ul className='space-y-1'>
                {mod.practice_tasks.map((t, i) => (
                  <li key={i} className='text-sm text-slate-600 flex items-start gap-1.5'>
                    <span className='text-green-500 font-bold flex-shrink-0'>→</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Topics */}
          <div className='space-y-2'>
            <p className='text-xs font-bold text-slate-500 uppercase tracking-wide'>Topics</p>
            {topics.map((topic) => (
              <TopicSection
                key={topic.id}
                topic={topic}
                roleFocus={roleFocus}
                level={level}
                onUpdate={(u) => updateTopic(topic.id, u)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function AiCurriculumEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const isAdmin = user?.role === 'admin';

  const [course, setCourse] = useState<AiCourse | null>(null);
  const [modules, setModules] = useState<AiModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await aiCurriculumApi.get(id);
      setCourse(res.data.data);
      setModules(res.data.data.modules);
    } catch {
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateModule = (moduleId: string, updated: Partial<AiModule>) => {
    setModules((ms) => ms.map((m) => m.id === moduleId ? { ...m, ...updated } : m));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await aiCurriculumApi.submit(id!);
      toast.success('Submitted for review');
      setCourse((c) => c ? { ...c, status: 'in_review' } : c);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await aiCurriculumApi.publish(id!);
      toast.success('Course published! Subject created.');
      navigate('/dashboard/admin/subjects');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const base = isAdmin ? '/dashboard/admin' : '/dashboard/facilitator';

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='w-6 h-6 animate-spin text-blue-500' />
      </div>
    );
  }

  if (!course) return <div className='p-8 text-slate-500'>Course not found.</div>;

  const canEdit = ['draft', 'changes_requested'].includes(course.status);
  const canSubmit = canEdit;
  const canPublish = isAdmin && course.status === 'approved';

  return (
    <div className='max-w-4xl mx-auto px-4 py-6'>
      {/* Topbar */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => navigate(`${base}/ai-curriculum`)}
            className='p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-bold text-[#1e2653]'>{course.title}</h1>
              <StatusBadge status={course.status} />
            </div>
            <p className='text-xs text-slate-500 mt-0.5'>
              {course.role_focus} · {course.domain} · {course.level}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {canEdit && (
            <button
              onClick={() => navigate(`${base}/ai-curriculum/${id}/review`)}
              className='flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors'
            >
              <Eye className='w-4 h-4' /> Preview
            </button>
          )}

          {isAdmin && course.status === 'in_review' && (
            <button
              onClick={() => navigate(`${base}/ai-curriculum/${id}/review`)}
              className='flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors'
            >
              Review Course
            </button>
          )}

          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className='flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'
            >
              {submitting ? <Loader2 className='w-4 h-4 animate-spin' /> : <Send className='w-4 h-4' />}
              Submit for Review
            </button>
          )}

          {canPublish && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className='flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors'
            >
              {publishing ? <Loader2 className='w-4 h-4 animate-spin' /> : <Sparkles className='w-4 h-4' />}
              Publish Course
            </button>
          )}
        </div>
      </div>

      {/* Review feedback banner */}
      {course.status === 'changes_requested' && course.reviews?.[0] && (
        <div className='mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4'>
          <p className='text-sm font-bold text-orange-800 mb-1'>Changes Requested by Reviewer</p>
          {course.reviews[0].feedback?.suggestions && (
            <p className='text-sm text-orange-700'>{course.reviews[0].feedback.suggestions}</p>
          )}
          {course.reviews[0].feedback?.missing_skills && (
            <p className='text-sm text-orange-700 mt-1'><strong>Missing skills:</strong> {course.reviews[0].feedback.missing_skills}</p>
          )}
        </div>
      )}

      {/* Modules */}
      {!canEdit && (
        <div className='mb-4 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5'>
          This course is <strong>{STATUS_LABELS[course.status]}</strong>. Editing is locked.
        </div>
      )}

      <div className='space-y-4'>
        {modules.map((mod) => (
          <ModuleCard
            key={mod.id}
            module={mod}
            roleFocus={course.role_focus}
            level={course.level}
            onUpdate={(u) => updateModule(mod.id, u)}
          />
        ))}
      </div>
    </div>
  );
}
