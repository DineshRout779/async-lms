import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';
import type { CourseFormData } from '@/features/aiCurriculum/types';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

// ─── Options ──────────────────────────────────────────────────────────────────

const DOMAINS = ['tech', 'business', 'creative', 'non-IT', 'data'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const CONTENT_PREF_LABELS: Record<string, string> = {
  'practice-heavy': 'Practice Heavy',
  'theory-heavy': 'Theory Heavy',
  'interview-focused': 'Interview Focused',
  balanced: 'Balanced',
};
const DURATIONS = [4, 6, 8, 10, 12, 16, 20, 24];
const DAILY_EFFORTS = [0.5, 1, 1.5, 2, 3, 4, 5, 6];

const EMPTY_FORM: CourseFormData = {
  title: '',
  domain: '',
  role_focus: 'student',
  jd_text: '',
  skills: [],
  audience: [],
  level: '',
  learning_goal: '',
  duration_weeks: '',
  daily_hours: '',
  content_preference: '',
  num_modules: '',
};

// ─── Shared field components ──────────────────────────────────────────────────

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className='block text-xs font-semibold text-slate-600 mb-1.5'>
      {children}
      {required && <span className='text-red-400 ml-0.5'>*</span>}
    </label>
  );
}

function TextInput({
  placeholder,
  value,
  onChange,
  className = '',
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type='text'
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${className}`}
    />
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder: string;
  options: { label: string; value: string | number }[];
}) {
  return (
    <div className='relative'>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8'
      >
        <option value=''>{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400'>▾</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className='bg-white border border-slate-200 rounded-xl p-6'>
      <h2 className='text-sm font-bold text-slate-700 mb-4'>{title}</h2>
      {children}
    </div>
  );
}

// ─── Generating overlay ───────────────────────────────────────────────────────

const STAGES = [
  { at: 0, label: 'Analysing job description…' },
  { at: 15, label: 'Extracting skill requirements…' },
  { at: 30, label: 'Designing course structure…' },
  { at: 50, label: 'Structuring topics and units…' },
  { at: 68, label: 'Writing subtopics and activities…' },
  { at: 85, label: 'Adding interview questions…' },
  { at: 95, label: 'Finalising curriculum…' },
];

function GeneratingOverlay({ courseTitle }: { courseTitle: string }) {
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState(STAGES[0].label);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev >= 95 ? 95 : prev + 1;
        const stage = [...STAGES].reverse().find((s) => next >= s.at);
        if (stage) setStageLabel(stage.label);
        return next;
      });
    }, 400);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className='fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center'>
      <div className='bg-white rounded-2xl px-12 py-10 max-w-125 w-full mx-4 text-center shadow-xl border border-slate-100'>
        {/* Icon */}
        <div className='relative w-18 h-18 mx-auto mb-8 flex items-center justify-center'>
          <div className='absolute inset-0 border-[3px] border-slate-200 rounded-full'></div>
          <div className='absolute inset-0 border-[3px] border-transparent border-t-[#3843d0] rounded-full animate-[spin_1.5s_linear_infinite]'></div>
          <Sparkles className='w-8 h-8 text-[#1e2653] ml-1' />
        </div>

        {/* Title */}
        <h3 className='text-[20px] font-extrabold text-slate-800 mb-1.5 tracking-tight'>
          Generating Curriculum with AI
        </h3>
        <p className='text-[14px] text-slate-500 mb-6 truncate font-medium'>
          {courseTitle || 'New Course'}
        </p>

        {/* Status label */}
        <p className='text-[13px] text-[#3843d0] font-bold mb-3'>
          {stageLabel}
        </p>

        {/* Progress bar */}
        <div className='w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3'>
          <div
            className='h-full bg-[#1e2653] transition-all duration-300 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Percentage */}
        <p className='text-[12px] text-slate-400 font-semibold'>
          {progress}% complete
        </p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AiCurriculumBuilder() {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const isAdmin = user?.role === 'admin';
  const base = isAdmin ? '/dashboard/admin' : '/dashboard/facilitator';

  const [form, setForm] = useState<CourseFormData>(EMPTY_FORM);
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  const set = (partial: Partial<CourseFormData>) =>
    setForm((f) => ({ ...f, ...partial }));

  const isValid =
    form.title.trim() &&
    form.domain &&
    form.level &&
    form.content_preference &&
    form.learning_goal.trim();

  const handleGenerate = async () => {
    if (!isValid) {
      toast.error('Please fill in all required fields');
      return;
    }
    setGenerating(true);
    try {
      // Extract skills from JD if provided, then generate
      let skills = form.skills;
      if (form.jd_text.trim() && !skills.length) {
        try {
          const skillRes = await aiCurriculumApi.extractSkills(form.jd_text);
          skills = skillRes.data.data;
          set({ skills });
        } catch {
          /* proceed without skills */
        }
      }

      const genRes = await aiCurriculumApi.generate({ ...form, skills });
      const curriculum = genRes.data.data;

      const saveRes = await aiCurriculumApi.save({
        ...form,
        skills,
        modules: curriculum.modules,
        capstone_project: curriculum.capstone_project,
      });
      toast.success('Curriculum generated!');
      navigate(`${base}/ai-curriculum/${saveRes.data.data.id}/edit`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || 'Failed to generate curriculum');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {generating && <GeneratingOverlay courseTitle={form.title} />}

      <div className='max-w-2xl mx-auto px-4 py-6'>
        {/* Breadcrumb */}
        <div className='flex items-center gap-1.5 text-xs text-slate-400 mb-5'>
          <span
            className='hover:text-slate-600 cursor-pointer'
            onClick={() => navigate(`${base}`)}
          >
            Dashboard
          </span>
          <span>/</span>
          <span
            className='hover:text-slate-600 cursor-pointer'
            onClick={() => navigate(`${base}/ai-curriculum`)}
          >
            Courses
          </span>
          <span>/</span>
          <span className='text-slate-600 font-medium'>Create Course</span>
        </div>

        {/* Page header */}
        <div className='flex items-center gap-3 mb-6'>
          <button
            onClick={() => navigate(`${base}/ai-curriculum`)}
            className='p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>
          <div>
            <h1 className='text-xl font-bold text-slate-800'>
              Create New Course
            </h1>
            <p className='text-xs text-slate-500 mt-0.5'>
              Step 1: Define course metadata for AI generation
            </p>
          </div>
        </div>

        <div className='space-y-4'>
          {/* ── Section 1: Course Information ── */}
          <Section title='Course Information'>
            <div className='space-y-4'>
              <div>
                <Label required>Course Title</Label>
                <TextInput
                  placeholder='e.g. Full-Stack Web Development'
                  value={form.title}
                  onChange={(v) => set({ title: v })}
                />
              </div>

              <div>
                <Label required>Domain</Label>
                <Select
                  value={form.domain}
                  onChange={(v) => set({ domain: v })}
                  placeholder='Select Domain'
                  options={DOMAINS.map((d) => ({
                    label: d.charAt(0).toUpperCase() + d.slice(1),
                    value: d,
                  }))}
                />
              </div>
            </div>
          </Section>

          {/* ── Section 2: Job Description ── */}
          <Section title='Job Description (for AI Alignment)'>
            <div className='space-y-4'>
              <div>
                <Label>Paste or describe the target job description</Label>
                <textarea
                  rows={5}
                  placeholder='Paste the job description here or describe the role requirements...'
                  value={form.jd_text}
                  onChange={(e) => set({ jd_text: e.target.value })}
                  className='w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none'
                />
                {form.jd_text.trim() && !form.skills.length && (
                  <button
                    type='button'
                    disabled={extracting}
                    onClick={async () => {
                      setExtracting(true);
                      try {
                        const res = await aiCurriculumApi.extractSkills(form.jd_text);
                        set({ skills: res.data.data });
                      } catch { /* silent */ }
                      finally { setExtracting(false); }
                    }}
                    className='mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50'
                  >
                    {extracting ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Sparkles className='w-3.5 h-3.5' />}
                    {extracting ? 'Extracting skills...' : 'Extract Skills from JD'}
                  </button>
                )}
              </div>

              {/* Skills chips */}
              {form.skills.length > 0 && (
                <div>
                  <Label>Extracted Skills <span className='font-normal text-slate-400'>(click × to remove)</span></Label>
                  <div className='flex flex-wrap gap-2 mt-1'>
                    {form.skills.map((s, i) => (
                      <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold border ${s.category === 'technical' ? 'bg-blue-50 text-blue-700 border-blue-200' : s.category === 'tools' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {s.name}
                        <button onClick={() => set({ skills: form.skills.filter((_, j) => j !== i) })} className='hover:text-red-500 transition-colors'>×</button>
                      </span>
                    ))}
                  </div>
                  <div className='flex items-center gap-2 mt-2'>
                    <input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSkill.trim()) {
                          set({ skills: [...form.skills, { name: newSkill.trim(), category: 'technical' }] });
                          setNewSkill('');
                        }
                      }}
                      placeholder='Add skill + Enter'
                      className='border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                    />
                  </div>
                </div>
              )}

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label required>Experience Level</Label>
                  <Select
                    value={form.level}
                    onChange={(v) => set({ level: v })}
                    placeholder='Select Level'
                    options={LEVELS.map((l) => ({
                      label: l.charAt(0).toUpperCase() + l.slice(1),
                      value: l,
                    }))}
                  />
                </div>
                <div>
                  <Label required>Content Style</Label>
                  <Select
                    value={form.content_preference}
                    onChange={(v) => set({ content_preference: v })}
                    placeholder='Select Preference'
                    options={Object.entries(CONTENT_PREF_LABELS).map(
                      ([v, l]) => ({ label: l, value: v }),
                    )}
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ── Section 3: Learning Parameters ── */}
          <Section title='Learning Parameters'>
            <div className='space-y-4'>
              <div>
                <Label required>Learning Goals</Label>
                <TextInput
                  placeholder='What should students be able to do after completing this course?'
                  value={form.learning_goal}
                  onChange={(v) => set({ learning_goal: v })}
                />
              </div>

              <div className='grid grid-cols-3 gap-4'>
                <div>
                  <Label>Course Duration</Label>
                  <Select
                    value={form.duration_weeks}
                    onChange={(v) => set({ duration_weeks: v ? Number(v) : '' })}
                    placeholder='Select Duration'
                    options={DURATIONS.map((d) => ({ label: `${d} weeks`, value: d }))}
                  />
                </div>
                <div>
                  <Label>Daily Effort</Label>
                  <Select
                    value={form.daily_hours}
                    onChange={(v) => set({ daily_hours: v ? Number(v) : '' })}
                    placeholder='Select Effort'
                    options={DAILY_EFFORTS.map((h) => ({ label: `${h} hr${h !== 1 ? 's' : ''}/day`, value: h }))}
                  />
                </div>
                <div>
                  <Label>No. of Topics</Label>
                  <input
                    type='number'
                    min={1}
                    max={12}
                    placeholder='Auto (4–7)'
                    value={form.num_modules}
                    onChange={(e) => set({ num_modules: e.target.value ? Number(e.target.value) : '' })}
                    className='w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                  />
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Footer actions */}
        <div className='flex items-center justify-end gap-3 mt-6'>
          <button
            onClick={() => navigate(`${base}/ai-curriculum`)}
            className='px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!isValid || generating}
            className='flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[#1e2653] text-white rounded-lg hover:bg-[#16203f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm'
          >
            {generating ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Sparkles className='w-4 h-4' />
            )}
            Generate Curriculum
          </button>
        </div>
      </div>
    </>
  );
}
