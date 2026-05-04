import { useState, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Loader2,
  Download,
  Wand2,
  GripVertical,
  Plus,
  CheckSquare,
  Send,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Briefcase,
  GraduationCap,
  Code2,
  Award,
  FileText,
  User,
  Lightbulb,
  Maximize2,
  X,
} from 'lucide-react';
import apiClient from '@/services/api';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkExperience {
  title: string;
  company: string;
  duration: string;
  points: string[];
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
  score?: number;
}

interface Education {
  degree: string;
  institution: string;
  year: string;
  details: string;
}

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  college: string;
  degree: string;
  year: string;
  title: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  education: Education[];
  skills: string[];
  projects: Project[];
  achievements: string[];
  experience: WorkExperience[];
  certifications?: string[];
}

interface ATSResult {
  atsScore: number;
  keywordMatch: number;
  contentQuality: number;
  formatting: number;
  missingKeywords: string[];
  suggestions: string[];
  optimizedSummary?: string;
}

type SectionKey =
  | 'summary'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'education'
  | 'certifications';

interface Section {
  id: SectionKey;
  label: string;
  icon: React.ElementType;
}

const DEFAULT_SECTIONS: Section[] = [
  { id: 'summary', label: 'Summary', icon: User },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'projects', label: 'Projects', icon: Code2 },
  { id: 'skills', label: 'Skills', icon: Lightbulb },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'certifications', label: 'Certifications', icon: Award },
];

// ── ATS helpers ───────────────────────────────────────────────────────────────

function calcLocalATS(data: ResumeData | null) {
  if (!data)
    return { atsScore: 0, keywordMatch: 0, contentQuality: 0, formatting: 0 };
  let content = 0;
  if (data.summary) content += 20;
  if (data.experience?.length) content += 25;
  if (data.projects?.length) content += 20;
  if ((data.skills?.length ?? 0) >= 5) content += 20;
  if (data.education?.length) content += 15;
  const formatting =
    data.personalInfo.name && data.personalInfo.email ? 92 : 60;
  const keywordMatch = Math.min(100, Math.round(content * 0.75));
  const atsScore = Math.round((content + formatting + keywordMatch) / 3);
  return { atsScore, keywordMatch, contentQuality: content, formatting };
}

// ── Score Bar ─────────────────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className='mb-2'>
      <div className='flex justify-between text-[11px] text-slate-500 mb-1'>
        <span>{label}</span>
        <span className='font-semibold text-slate-700'>{value}%</span>
      </div>
      <div className='h-1.5 bg-slate-100 rounded-full overflow-hidden'>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            color,
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ── Sortable Section Item ─────────────────────────────────────────────────────

function SortableSectionItem({ section }: { section: Section }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });
  const Icon = section.icon;
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className='flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 group'
    >
      <button
        {...attributes}
        {...listeners}
        className='text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing'
      >
        <GripVertical size={14} />
      </button>
      <Icon size={14} className='text-slate-400' />
      <span className='flex-1 text-[13px] font-medium'>{section.label}</span>
      <div className='w-2 h-2 rounded-full bg-[#333d7c]' />
    </div>
  );
}

// ── Resume Document ───────────────────────────────────────────────────────────

function ResumeDocument({
  data,
  sections,
}: {
  data: ResumeData;
  sections: Section[];
}) {
  const pi = data.personalInfo;
  return (
    <div className='font-sans text-[#1a1a2e] text-[13px] leading-relaxed'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-[26px] font-black tracking-wide text-[#1a1a2e] uppercase'>
          {pi.name || 'YOUR NAME'}
        </h1>
        {pi.title && (
          <p className='text-[13px] text-slate-500 font-medium mt-0.5'>
            {pi.title}
          </p>
        )}
        <div className='flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] text-slate-500'>
          {pi.email && (
            <span className='flex items-center gap-1'>
              <Mail size={11} />
              {pi.email}
            </span>
          )}
          {pi.phone && (
            <span className='flex items-center gap-1'>
              <Phone size={11} />
              {pi.phone}
            </span>
          )}
          {pi.location && (
            <span className='flex items-center gap-1'>
              <MapPin size={11} />
              {pi.location}
            </span>
          )}
          {pi.linkedin && (
            <span className='flex items-center gap-1'>
              <Linkedin size={11} />
              {pi.linkedin}
            </span>
          )}
        </div>
      </div>

      {sections.map((s) => {
        switch (s.id) {
          case 'summary':
            return data.summary ? (
              <ResumeSection key='summary' title='CAREER OBJECTIVE'>
                <p className='text-slate-700 text-[12.5px]'>{data.summary}</p>
              </ResumeSection>
            ) : null;

          case 'experience':
            return (data.experience?.length ?? 0) > 0 ? (
              <ResumeSection key='experience' title='WORK EXPERIENCE'>
                {data.experience.map((exp, i) => (
                  <div key={i} className='mb-4'>
                    <div className='flex justify-between items-baseline'>
                      <span className='font-bold text-[13px]'>{exp.title}</span>
                      <span className='text-[11px] text-slate-400'>
                        {exp.duration}
                      </span>
                    </div>
                    <div className='text-[12px] text-slate-500 mb-1.5'>
                      {exp.company}
                    </div>
                    <ul className='space-y-1'>
                      {exp.points.map((p, j) => (
                        <li
                          key={j}
                          className='flex gap-2 text-[12px] text-slate-600'
                        >
                          <span className='mt-1.5 w-1 h-1 rounded-full bg-slate-400 shrink-0' />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </ResumeSection>
            ) : null;

          case 'projects':
            return (data.projects?.length ?? 0) > 0 ? (
              <ResumeSection key='projects' title='PROJECTS'>
                {data.projects.map((proj, i) => (
                  <div key={i} className='mb-4'>
                    <div className='flex justify-between items-baseline'>
                      <span className='font-bold text-[13px]'>{proj.name}</span>
                      {proj.score && (
                        <span className='text-[11px] text-slate-400'>
                          Verified · {proj.score}/100
                        </span>
                      )}
                    </div>
                    <p className='text-[12px] text-slate-500 italic mb-1.5'>
                      {proj.description}
                    </p>
                    {(proj.technologies?.length ?? 0) > 0 && (
                      <p className='text-[11px] text-slate-400'>
                        <span className='font-medium text-slate-500'>
                          Tools:{' '}
                        </span>
                        {proj.technologies.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </ResumeSection>
            ) : null;

          case 'skills':
            return (data.skills?.length ?? 0) > 0 ? (
              <ResumeSection key='skills' title='SKILLS'>
                <div className='grid grid-cols-2 gap-x-8 gap-y-1'>
                  {data.skills.map((s, i) => (
                    <div
                      key={i}
                      className='flex items-center gap-2 text-[12px] text-slate-700'
                    >
                      <span className='w-1 h-1 rounded-full bg-slate-400' />
                      {s}
                    </div>
                  ))}
                </div>
              </ResumeSection>
            ) : null;

          case 'education':
            return (data.education?.length ?? 0) > 0 ? (
              <ResumeSection key='education' title='EDUCATION'>
                {data.education.map((e, i) => (
                  <div key={i} className='mb-2'>
                    <div className='font-bold text-[13px]'>{e.degree}</div>
                    <div className='text-[12px] text-slate-500'>
                      {e.institution}
                    </div>
                    {e.details && (
                      <div className='text-[11px] text-slate-400 mt-0.5'>
                        {e.details}
                      </div>
                    )}
                  </div>
                ))}
              </ResumeSection>
            ) : null;

          case 'certifications':
            return (data.certifications?.length ?? 0) > 0 ? (
              <ResumeSection key='certifications' title='CERTIFICATIONS'>
                <ul className='space-y-1'>
                  {data.certifications!.map((c, i) => (
                    <li
                      key={i}
                      className='flex items-center gap-2 text-[12px] text-slate-700'
                    >
                      <span className='w-1 h-1 rounded-full bg-slate-400' />
                      {c}
                    </li>
                  ))}
                </ul>
              </ResumeSection>
            ) : null;

          default:
            return null;
        }
      })}
    </div>
  );
}

function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className='mb-5'>
      <div className='text-[11px] font-bold tracking-[0.15em] text-slate-800 border-b border-slate-200 pb-1 mb-3'>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Input Form Modal ──────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#333d7c]/20';

interface InputFormProps {
  careerObjective: string;
  setCareerObjective: (v: string) => void;
  extraSkills: string[];
  setExtraSkills: (v: string[]) => void;
  workExperience: WorkExperience[];
  setWorkExperience: (v: WorkExperience[]) => void;
  phone: string;
  setPhone: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  linkedin: string;
  setLinkedin: (v: string) => void;
  jobTitle: string;
  setJobTitle: (v: string) => void;
  onGenerate: () => void;
  loading: boolean;
  onClose: () => void;
}

function InputForm(props: InputFormProps) {
  const {
    careerObjective,
    setCareerObjective,
    extraSkills,
    setExtraSkills,
    workExperience,
    setWorkExperience,
    phone,
    setPhone,
    location,
    setLocation,
    linkedin,
    setLinkedin,
    jobTitle,
    setJobTitle,
    onGenerate,
    loading,
    onClose,
  } = props;

  const addExp = () =>
    setWorkExperience([
      ...workExperience,
      { title: '', company: '', duration: '', points: [''] },
    ]);
  const removeExp = (idx: number) =>
    setWorkExperience(workExperience.filter((_, i) => i !== idx));
  const updateExp = (
    idx: number,
    field: keyof Omit<WorkExperience, 'points'>,
    val: string,
  ) =>
    setWorkExperience(
      workExperience.map((e, i) => (i === idx ? { ...e, [field]: val } : e)),
    );
  const updatePoint = (ei: number, pi: number, val: string) =>
    setWorkExperience(
      workExperience.map((e, i) =>
        i === ei
          ? { ...e, points: e.points.map((p, j) => (j === pi ? val : p)) }
          : e,
      ),
    );
  const addPoint = (ei: number) =>
    setWorkExperience(
      workExperience.map((e, i) =>
        i === ei ? { ...e, points: [...e.points, ''] } : e,
      ),
    );
  const removePoint = (ei: number, pi: number) =>
    setWorkExperience(
      workExperience.map((e, i) =>
        i === ei ? { ...e, points: e.points.filter((_, j) => j !== pi) } : e,
      ),
    );

  return (
    <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-md shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col'>
        <div className='flex items-center justify-between p-6 border-b border-slate-100'>
          <div>
            <h2 className='font-bold text-[#1e2653] text-lg'>
              Build Your Resume
            </h2>
            <p className='text-xs text-slate-400 mt-0.5'>
              Profile & course data will be auto-fetched
            </p>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-600'
          >
            <X size={20} />
          </button>
        </div>

        <div className='overflow-y-auto flex-1 px-6 py-4 space-y-5'>
          {/* Personal details */}
          <div>
            <h3 className='text-sm font-semibold text-slate-700 mb-3'>
              Personal Details
            </h3>
            <div className='grid grid-cols-2 gap-3'>
              {[
                {
                  label: 'Job Title / Role',
                  placeholder: 'e.g. Full Stack Developer',
                  value: jobTitle,
                  set: setJobTitle,
                },
                {
                  label: 'Phone',
                  placeholder: '+91 9876543210',
                  value: phone,
                  set: setPhone,
                },
                {
                  label: 'Location',
                  placeholder: 'City, State',
                  value: location,
                  set: setLocation,
                },
                {
                  label: 'LinkedIn',
                  placeholder: 'linkedin.com/in/yourprofile',
                  value: linkedin,
                  set: setLinkedin,
                },
              ].map(({ label, placeholder, value, set }) => (
                <div key={label}>
                  <label className='text-xs text-slate-500 mb-1 block'>
                    {label}
                  </label>
                  <input
                    className={inputCls}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Career Objective */}
          <div>
            <label className='text-sm font-semibold text-slate-700 mb-1 block'>
              Career Objective
            </label>
            <textarea
              className={cn(inputCls, 'min-h-[80px] resize-none')}
              placeholder='e.g. Aspiring full-stack developer looking to apply my skills...'
              value={careerObjective}
              onChange={(e) => setCareerObjective(e.target.value)}
            />
          </div>

          {/* Extra Skills */}
          <div>
            <label className='text-sm font-semibold text-slate-700 mb-1 block'>
              Additional Skills
            </label>
            <p className='text-xs text-slate-400 mb-2'>
              Skills from your courses are auto-detected. Add extras here.
            </p>
            <div className='flex flex-wrap gap-2'>
              {extraSkills.map((skill, idx) => (
                <div
                  key={idx}
                  className='flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full px-3 py-1'
                >
                  <input
                    className='text-xs outline-none bg-transparent w-24'
                    placeholder='e.g. Docker'
                    value={skill}
                    onChange={(e) =>
                      setExtraSkills(
                        extraSkills.map((s, i) =>
                          i === idx ? e.target.value : s,
                        ),
                      )
                    }
                  />
                  <button
                    onClick={() =>
                      setExtraSkills(extraSkills.filter((_, i) => i !== idx))
                    }
                    className='text-slate-300 hover:text-red-400'
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setExtraSkills([...extraSkills, ''])}
                className='flex items-center gap-1 text-xs text-[#333d7c] border border-dashed border-[#333d7c]/40 rounded-full px-3 py-1 hover:bg-[#eef0fb]'
              >
                <Plus size={12} /> Add
              </button>
            </div>
          </div>

          {/* Work Experience */}
          <div>
            <label className='text-sm font-semibold text-slate-700 mb-1 block'>
              Work Experience
            </label>
            <p className='text-xs text-slate-400 mb-3'>
              Optional — leave blank if no experience yet.
            </p>
            <div className='space-y-4'>
              {workExperience.map((exp, idx) => (
                <div
                  key={idx}
                  className='border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-2'
                >
                  <div className='grid grid-cols-2 gap-2'>
                    <input
                      className={inputCls}
                      placeholder='Job Title'
                      value={exp.title}
                      onChange={(e) => updateExp(idx, 'title', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      placeholder='Company'
                      value={exp.company}
                      onChange={(e) =>
                        updateExp(idx, 'company', e.target.value)
                      }
                    />
                  </div>
                  <input
                    className={inputCls}
                    placeholder='Duration (e.g. Jun 2024 – Aug 2024)'
                    value={exp.duration}
                    onChange={(e) => updateExp(idx, 'duration', e.target.value)}
                  />
                  <div className='space-y-1.5'>
                    {exp.points.map((pt, pi) => (
                      <div key={pi} className='flex gap-2'>
                        <input
                          className={cn(inputCls, 'flex-1')}
                          placeholder='Key responsibility'
                          value={pt}
                          onChange={(e) => updatePoint(idx, pi, e.target.value)}
                        />
                        {exp.points.length > 1 && (
                          <button
                            onClick={() => removePoint(idx, pi)}
                            className='text-slate-300 hover:text-red-400'
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addPoint(idx)}
                      className='text-xs text-[#333d7c] hover:underline flex items-center gap-1'
                    >
                      <Plus size={12} /> Add point
                    </button>
                  </div>
                  <button
                    onClick={() => removeExp(idx)}
                    className='text-xs text-red-400 hover:text-red-600 flex items-center gap-1'
                  >
                    <X size={12} /> Remove
                  </button>
                </div>
              ))}
              <button
                onClick={addExp}
                className='text-xs text-[#333d7c] hover:underline flex items-center gap-1'
              >
                <Plus size={13} /> Add work experience
              </button>
            </div>
          </div>
        </div>

        <div className='px-6 py-4 border-t border-slate-100'>
          <button
            onClick={onGenerate}
            disabled={loading}
            className='w-full bg-[#333d7c] hover:bg-[#1e2653] text-white h-11 rounded-md text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors'
          >
            {loading ? (
              <>
                <Loader2 size={16} className='animate-spin' />
                Generating...
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Generate Resume with AI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Full Preview Modal ────────────────────────────────────────────────────────

function FullPreviewModal({
  data,
  sections,
  onClose,
}: {
  data: ResumeData;
  sections: Section[];
  onClose: () => void;
}) {
  return (
    <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col'>
        <div className='flex items-center justify-between px-6 py-3 border-b border-slate-100'>
          <span className='font-semibold text-[#1e2653]'>Full Preview</span>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-600'
          >
            <X size={20} />
          </button>
        </div>
        <div className='overflow-y-auto flex-1 p-10'>
          <ResumeDocument data={data} sections={sections} />
        </div>
      </div>
    </div>
  );
}

// ── Action Button ─────────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className='flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
    >
      {icon} {label}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ResumeBuilder() {
  const [careerObjective, setCareerObjective] = useState('');
  const [extraSkills, setExtraSkills] = useState<string[]>(['']);
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [jdText, setJdText] = useState('');
  const [jdLoading, setJdLoading] = useState(false);

  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);

  const previewRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((prev) => {
        const oldIdx = prev.findIndex((s) => s.id === active.id);
        const newIdx = prev.findIndex((s) => s.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/assistant/resume', {
        careerObjective,
        extraSkills: extraSkills.filter(Boolean),
        workExperience,
      });
      const data = res.data.data as ResumeData;
      data.personalInfo = {
        ...data.personalInfo,
        phone,
        location,
        linkedin,
        title: jobTitle,
      };
      setResumeData(data);
      setAtsResult(null);
      setShowForm(false);
      toast.success('Resume generated!');
    } catch {
      toast.error('Failed to generate resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeJD = async () => {
    if (!resumeData) return toast.error('Generate your resume first.');
    if (!jdText.trim()) return toast.error('Paste a job description first.');
    setJdLoading(true);
    try {
      const res = await apiClient.post('/assistant/resume/optimize', {
        resumeData,
        jobDescription: jdText,
      });
      const result = res.data.data as ATSResult;
      setAtsResult(result);
      if (result.optimizedSummary) {
        setResumeData((prev) =>
          prev ? { ...prev, summary: result.optimizedSummary! } : prev,
        );
      }
      toast.success('Resume optimized for the JD!');
    } catch {
      toast.error('Optimization failed.');
    } finally {
      setJdLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf()
      .set({
        margin: 14,
        filename: `${resumeData?.personalInfo.name || 'resume'}_resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(previewRef.current)
      .save();
  };

  const localATS = atsResult ?? calcLocalATS(resumeData);

  return (
    <div className='flex flex-col h-full bg-[#f7f8fc]'>
      {/* Header */}
      <div className='flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0'>
        <div>
          <h1 className='text-lg font-bold text-[#1e2653]'>Resume Workspace</h1>
          <p className='text-xs text-slate-400 mt-0.5'>
            ATS-optimized resume builder with AI assistance
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <ActionBtn
            icon={<Maximize2 size={14} />}
            label='Full Preview'
            onClick={() => setShowFullPreview(true)}
            disabled={!resumeData}
          />
          <ActionBtn
            icon={<CheckSquare size={14} />}
            label='Check ATS Score'
            onClick={() => {
              if (resumeData) setAtsResult(calcLocalATS(resumeData));
              else toast.error('Generate resume first.');
            }}
            disabled={!resumeData}
          />
          <ActionBtn
            icon={<Download size={14} />}
            label='Download PDF'
            onClick={handleExportPDF}
            disabled={!resumeData}
          />
          <button
            onClick={() => setShowForm(true)}
            className='flex items-center gap-2 bg-[#333d7c] hover:bg-[#1e2653] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors'
          >
            <Send size={14} />
            {resumeData ? 'Regenerate' : 'Build Resume'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Left Sidebar */}
        <aside className='w-72 shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-y-auto'>
          {/* ATS Score Panel */}
          <div className='p-4 border-b border-slate-100'>
            <div className='flex items-center justify-between mb-3'>
              <span className='text-xs font-semibold text-slate-700'>
                ATS Score
              </span>
              <div className='flex items-baseline gap-1'>
                <span className='text-2xl font-black text-[#333d7c]'>
                  {localATS.atsScore}
                </span>
                <span className='text-xs text-slate-400'>/100</span>
              </div>
            </div>
            <ScoreBar
              label='Keyword match'
              value={localATS.keywordMatch}
              color='bg-blue-400'
            />
            <ScoreBar
              label='Content quality'
              value={localATS.contentQuality}
              color='bg-emerald-400'
            />
            <ScoreBar
              label='Formatting'
              value={localATS.formatting}
              color='bg-green-400'
            />

            {atsResult?.suggestions?.length ||
            atsResult?.missingKeywords?.length ? (
              <div className='mt-3 space-y-1.5'>
                {atsResult?.missingKeywords?.slice(0, 2).map((kw, i) => (
                  <div
                    key={i}
                    className='flex items-start gap-2 text-[11px] text-amber-700'
                  >
                    <span className='mt-1 w-2 h-2 rounded-full bg-amber-400 shrink-0' />
                    Add keyword: <span className='font-semibold'>{kw}</span>
                  </div>
                ))}
                {atsResult?.suggestions?.slice(0, 2).map((s, i) => (
                  <div
                    key={i}
                    className='flex items-start gap-2 text-[11px] text-amber-700'
                  >
                    <span className='mt-1 w-2 h-2 rounded-full bg-amber-400 shrink-0' />
                    {s}
                  </div>
                ))}
              </div>
            ) : resumeData ? (
              <div className='mt-3'>
                <div className='flex items-start gap-2 text-[11px] text-amber-700'>
                  <span className='mt-1 w-2 h-2 rounded-full bg-amber-400 shrink-0' />
                  Paste a JD below to get tailored suggestions
                </div>
              </div>
            ) : null}
          </div>

          {/* AI Tools */}
          <div className='p-4 border-b border-slate-100'>
            <div className='flex items-center gap-1.5 mb-3'>
              <Wand2 size={13} className='text-[#333d7c]' />
              <span className='text-xs font-semibold text-slate-700'>
                AI Tools
              </span>
            </div>
            <label className='text-[11px] text-slate-500 mb-1 block'>
              Job Description
            </label>
            <textarea
              className='w-full border border-slate-200 rounded-lg px-2.5 py-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-[#333d7c]/20 min-h-[90px]'
              placeholder='Paste job description here...'
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
            <button
              onClick={handleOptimizeJD}
              disabled={jdLoading || !jdText.trim()}
              className='mt-2 w-full flex items-center justify-center gap-2 bg-[#333d7c] hover:bg-[#1e2653] text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors'
            >
              {jdLoading ? (
                <Loader2 size={13} className='animate-spin' />
              ) : (
                <Wand2 size={13} />
              )}
              Optimize with JD
            </button>
          </div>

          {/* Sections */}
          <div className='p-4 flex-1'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-xs font-semibold text-slate-700'>
                Sections
              </span>
              <span className='text-[10px] text-slate-400'>
                Drag to reorder · Click to edit on the right
              </span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className='space-y-0.5'>
                  {sections.map((section) => (
                    <SortableSectionItem key={section.id} section={section} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </aside>

        {/* Resume Canvas */}
        <main className='flex-1 overflow-y-auto p-8'>
          {resumeData ? (
            <div
              className='max-w-3xl mx-auto bg-white shadow-sm rounded-lg p-10 min-h-[900px]'
              ref={previewRef}
            >
              <ResumeDocument data={resumeData} sections={sections} />
            </div>
          ) : (
            <div className='max-w-3xl mx-auto h-full min-h-[600px] flex flex-col items-center justify-center'>
              <div className='w-20 h-20 rounded-full bg-[#eef0fb] flex items-center justify-center mb-5'>
                <FileText size={36} className='text-[#333d7c]' />
              </div>
              <h2 className='text-xl font-bold text-[#1e2653] mb-2'>
                Start building your resume
              </h2>
              <p className='text-sm text-slate-400 text-center max-w-sm mb-8'>
                Your profile, course completions, and earned badges will be
                auto-fetched. Add a few extra details and let AI do the rest.
              </p>
              <div className='grid grid-cols-3 gap-4 mb-8'>
                {[
                  {
                    icon: <User size={18} className='text-[#333d7c]' />,
                    text: 'Profile auto-fetched',
                  },
                  {
                    icon: (
                      <GraduationCap size={18} className='text-[#333d7c]' />
                    ),
                    text: 'Courses & skills detected',
                  },
                  {
                    icon: <Award size={18} className='text-[#333d7c]' />,
                    text: 'Badges included',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className='bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 text-center'
                  >
                    <div className='w-9 h-9 rounded-full bg-[#eef0fb] flex items-center justify-center'>
                      {item.icon}
                    </div>
                    <span className='text-xs text-slate-500'>{item.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowForm(true)}
                className='flex items-center gap-2 bg-[#333d7c] hover:bg-[#1e2653] text-white font-semibold px-6 py-3 rounded-xl transition-colors'
              >
                <Wand2 size={18} /> Build My Resume
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showForm && (
        <InputForm
          careerObjective={careerObjective}
          setCareerObjective={setCareerObjective}
          extraSkills={extraSkills}
          setExtraSkills={setExtraSkills}
          workExperience={workExperience}
          setWorkExperience={setWorkExperience}
          phone={phone}
          setPhone={setPhone}
          location={location}
          setLocation={setLocation}
          linkedin={linkedin}
          setLinkedin={setLinkedin}
          jobTitle={jobTitle}
          setJobTitle={setJobTitle}
          onGenerate={handleGenerate}
          loading={loading}
          onClose={() => setShowForm(false)}
        />
      )}

      {showFullPreview && resumeData && (
        <FullPreviewModal
          data={resumeData}
          sections={sections}
          onClose={() => setShowFullPreview(false)}
        />
      )}
    </div>
  );
}
