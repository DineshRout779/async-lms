import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, ChevronLeft, Sparkles, Loader2, Plus, X, Check } from 'lucide-react';
import { aiCurriculumApi } from '@/features/aiCurriculum/aiCurriculumApi';
import type { CourseFormData } from '@/features/aiCurriculum/types';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Course Info' },
  { id: 2, label: 'Job Description' },
  { id: 3, label: 'Skills' },
  { id: 4, label: 'Learner' },
  { id: 5, label: 'Constraints' },
  { id: 6, label: 'Content Style' },
];

const DOMAINS = ['tech', 'business', 'creative', 'non-IT', 'data'];
const AUDIENCES = ['student', 'fresher', 'professional'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const GOALS = ['interview_prep', 'job_readiness', 'skill_building', 'certification'];
const GOAL_LABELS: Record<string, string> = {
  interview_prep: 'Interview Prep',
  job_readiness: 'Job Readiness',
  skill_building: 'Skill Building',
  certification: 'Certification',
};
const CONTENT_PREFS = ['practice-heavy', 'theory-heavy', 'interview-focused', 'balanced'];
const SKILL_CATEGORIES = ['technical', 'tools', 'soft'] as const;

const EMPTY_FORM: CourseFormData = {
  title: '', domain: '', role_focus: '', jd_text: '',
  skills: [], audience: '', level: '', learning_goal: '',
  duration_weeks: '', daily_hours: '', content_preference: '',
};

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ form, set }: { form: CourseFormData; set: (f: Partial<CourseFormData>) => void }) {
  return (
    <div className='space-y-5'>
      <div>
        <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Course Title *</label>
        <input
          className='w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          placeholder='e.g. Full-Stack Web Development for Freshers'
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>
      <div>
        <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Domain *</label>
        <div className='flex flex-wrap gap-2'>
          {DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => set({ domain: d })}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors capitalize ${
                form.domain === d
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Target Role *</label>
        <input
          className='w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          placeholder='e.g. React Developer, Data Analyst, Prompt Engineer'
          value={form.role_focus}
          onChange={(e) => set({ role_focus: e.target.value })}
        />
      </div>
    </div>
  );
}

function Step2({
  form, set, onExtract, extracting,
}: {
  form: CourseFormData;
  set: (f: Partial<CourseFormData>) => void;
  onExtract: () => void;
  extracting: boolean;
}) {
  return (
    <div className='space-y-4'>
      <p className='text-sm text-slate-500'>
        Paste a job description. AI will extract the required skills to align your curriculum.
      </p>
      <textarea
        rows={12}
        className='w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono'
        placeholder='Paste job description here...'
        value={form.jd_text}
        onChange={(e) => set({ jd_text: e.target.value })}
      />
      <button
        onClick={onExtract}
        disabled={!form.jd_text.trim() || extracting}
        className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
      >
        {extracting ? <Loader2 className='w-4 h-4 animate-spin' /> : <Sparkles className='w-4 h-4' />}
        {extracting ? 'Extracting Skills…' : 'Extract Skills from JD'}
      </button>
    </div>
  );
}

function Step3({ form, set }: { form: CourseFormData; set: (f: Partial<CourseFormData>) => void }) {
  const [newSkill, setNewSkill] = useState('');
  const [newCat, setNewCat] = useState<'technical' | 'tools' | 'soft'>('technical');

  const addSkill = () => {
    const name = newSkill.trim();
    if (!name) return;
    if (form.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    set({ skills: [...form.skills, { name, category: newCat }] });
    setNewSkill('');
  };

  const removeSkill = (i: number) => {
    set({ skills: form.skills.filter((_, idx) => idx !== i) });
  };

  const CAT_COLORS: Record<string, string> = {
    technical: 'bg-blue-100 text-blue-700',
    tools: 'bg-purple-100 text-purple-700',
    soft: 'bg-green-100 text-green-700',
  };

  return (
    <div className='space-y-5'>
      <p className='text-sm text-slate-500'>
        Review and edit the extracted skills, or add your own. The AI curriculum will be built around these.
      </p>

      {/* Existing skills */}
      <div className='flex flex-wrap gap-2 min-h-[60px]'>
        {form.skills.length === 0 && (
          <p className='text-sm text-slate-400 italic'>No skills yet — extract from JD or add manually.</p>
        )}
        {form.skills.map((s, i) => (
          <span key={i} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${CAT_COLORS[s.category]}`}>
            {s.name}
            <button onClick={() => removeSkill(i)} className='opacity-60 hover:opacity-100'>
              <X className='w-3 h-3' />
            </button>
          </span>
        ))}
      </div>

      {/* Add skill */}
      <div className='flex gap-2'>
        <select
          value={newCat}
          onChange={(e) => setNewCat(e.target.value as typeof newCat)}
          className='border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
        >
          {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          className='flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          placeholder='Add a skill...'
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
        />
        <button
          onClick={addSkill}
          className='p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        >
          <Plus className='w-4 h-4' />
        </button>
      </div>
    </div>
  );
}

function Step4({ form, set }: { form: CourseFormData; set: (f: Partial<CourseFormData>) => void }) {
  return (
    <div className='space-y-6'>
      <div>
        <label className='block text-sm font-semibold text-slate-700 mb-2'>Target Audience *</label>
        <div className='flex gap-3'>
          {AUDIENCES.map((a) => (
            <button
              key={a}
              onClick={() => set({ audience: a })}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 capitalize transition-all ${
                form.audience === a
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-blue-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className='block text-sm font-semibold text-slate-700 mb-2'>Difficulty Level *</label>
        <div className='flex gap-3'>
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => set({ level: l })}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 capitalize transition-all ${
                form.level === l
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-blue-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className='block text-sm font-semibold text-slate-700 mb-2'>Learning Goal *</label>
        <div className='grid grid-cols-2 gap-3'>
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => set({ learning_goal: g })}
              className={`py-3 px-4 rounded-xl text-sm font-semibold border-2 text-left transition-all ${
                form.learning_goal === g
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-blue-200'
              }`}
            >
              {GOAL_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step5({ form, set }: { form: CourseFormData; set: (f: Partial<CourseFormData>) => void }) {
  return (
    <div className='space-y-5'>
      <p className='text-sm text-slate-500'>These are optional but help the AI calibrate pacing and depth.</p>
      <div className='grid grid-cols-2 gap-5'>
        <div>
          <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Duration (weeks)</label>
          <input
            type='number'
            min={1}
            max={52}
            className='w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            placeholder='e.g. 8'
            value={form.duration_weeks}
            onChange={(e) => set({ duration_weeks: e.target.value ? Number(e.target.value) : '' })}
          />
        </div>
        <div>
          <label className='block text-sm font-semibold text-slate-700 mb-1.5'>Daily Study Hours</label>
          <input
            type='number'
            min={0.5}
            max={12}
            step={0.5}
            className='w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            placeholder='e.g. 2'
            value={form.daily_hours}
            onChange={(e) => set({ daily_hours: e.target.value ? Number(e.target.value) : '' })}
          />
        </div>
      </div>
    </div>
  );
}

function Step6({ form, set }: { form: CourseFormData; set: (f: Partial<CourseFormData>) => void }) {
  return (
    <div className='space-y-4'>
      <p className='text-sm text-slate-500'>How should the AI balance the content in this course?</p>
      <div className='grid grid-cols-2 gap-3'>
        {CONTENT_PREFS.map((p) => {
          const labels: Record<string, { title: string; desc: string }> = {
            'practice-heavy': { title: 'Practice Heavy', desc: 'More tasks, projects, and hands-on work' },
            'theory-heavy': { title: 'Theory Heavy', desc: 'Deep concepts, explanations, and examples' },
            'interview-focused': { title: 'Interview Focused', desc: 'Mock Qs, common patterns, and prep' },
            'balanced': { title: 'Balanced', desc: 'Equal mix of theory and practice' },
          };
          const l = labels[p];
          return (
            <button
              key={p}
              onClick={() => set({ content_preference: p })}
              className={`p-4 rounded-xl text-left border-2 transition-all ${
                form.content_preference === p
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-200'
              }`}
            >
              <p className={`text-sm font-bold ${form.content_preference === p ? 'text-blue-700' : 'text-slate-700'}`}>
                {l.title}
              </p>
              <p className='text-xs text-slate-500 mt-0.5'>{l.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Generating overlay ───────────────────────────────────────────────────────

function GeneratingOverlay() {
  return (
    <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center'>
      <div className='bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl'>
        <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
          <Sparkles className='w-8 h-8 text-blue-600 animate-pulse' />
        </div>
        <h3 className='text-lg font-bold text-slate-800 mb-2'>Building Your Curriculum</h3>
        <p className='text-sm text-slate-500 mb-4'>
          AI is generating a job-aligned curriculum with modules, topics, and lessons…
        </p>
        <div className='flex items-center justify-center gap-1'>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className='w-2 h-2 bg-blue-600 rounded-full animate-bounce'
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function AiCurriculumBuilder() {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const isAdmin = user?.role === 'admin';

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CourseFormData>(EMPTY_FORM);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (partial: Partial<CourseFormData>) => setForm((f) => ({ ...f, ...partial }));

  const handleExtractSkills = async () => {
    setExtracting(true);
    try {
      const res = await aiCurriculumApi.extractSkills(form.jd_text);
      set({ skills: res.data.data });
      toast.success(`Extracted ${res.data.data.length} skills`);
    } catch {
      toast.error('Failed to extract skills');
    } finally {
      setExtracting(false);
    }
  };

  const canNext = () => {
    if (step === 1) return form.title.trim() && form.domain && form.role_focus.trim();
    if (step === 4) return form.audience && form.level && form.learning_goal;
    return true;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const genRes = await aiCurriculumApi.generate(form);
      const curriculum = genRes.data.data;

      setSaving(true);
      setGenerating(false);

      const saveRes = await aiCurriculumApi.save({ ...form, modules: curriculum.modules });
      const courseId = saveRes.data.data.id;

      toast.success('Curriculum generated and saved!');
      const base = isAdmin ? '/dashboard/admin' : '/dashboard/facilitator';
      navigate(`${base}/ai-curriculum/${courseId}/edit`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate curriculum');
    } finally {
      setGenerating(false);
      setSaving(false);
    }
  };

  const stepContent = () => {
    switch (step) {
      case 1: return <Step1 form={form} set={set} />;
      case 2: return <Step2 form={form} set={set} onExtract={handleExtractSkills} extracting={extracting} />;
      case 3: return <Step3 form={form} set={set} />;
      case 4: return <Step4 form={form} set={set} />;
      case 5: return <Step5 form={form} set={set} />;
      case 6: return <Step6 form={form} set={set} />;
      default: return null;
    }
  };

  return (
    <>
      {(generating || saving) && <GeneratingOverlay />}

      <div className='max-w-2xl mx-auto px-4 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center gap-2 mb-1'>
            <Sparkles className='w-5 h-5 text-blue-600' />
            <h1 className='text-2xl font-bold text-[#1e2653]'>AI Curriculum Builder</h1>
          </div>
          <p className='text-sm text-slate-500'>Build a job-aligned course in minutes using AI.</p>
        </div>

        {/* Step indicator */}
        <div className='flex items-center gap-1 mb-8'>
          {STEPS.map((s, i) => (
            <div key={s.id} className='flex items-center gap-1 flex-1'>
              <div className='flex flex-col items-center gap-1'>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s.id
                      ? 'bg-blue-600 text-white'
                      : step > s.id
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.id ? <Check className='w-4 h-4' /> : s.id}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${step === s.id ? 'text-blue-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 mx-1 transition-colors ${step > s.id ? 'bg-green-400' : 'bg-slate-100'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className='bg-white rounded-2xl border border-slate-100 shadow-sm p-6'>
          <h2 className='text-base font-bold text-slate-800 mb-5'>{STEPS[step - 1].label}</h2>
          {stepContent()}
        </div>

        {/* Navigation */}
        <div className='flex justify-between mt-6'>
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
            className='flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
          >
            <ChevronLeft className='w-4 h-4' /> Back
          </button>

          {step < 6 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className='flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            >
              Continue <ChevronRight className='w-4 h-4' />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating || saving}
              className='flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              <Sparkles className='w-4 h-4' />
              Generate Curriculum
            </button>
          )}
        </div>
      </div>
    </>
  );
}
