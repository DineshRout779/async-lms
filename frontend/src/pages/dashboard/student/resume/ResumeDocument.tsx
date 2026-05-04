import { Mail, Phone, MapPin, Linkedin } from 'lucide-react';
import type { PersonalInfo, ResumeData, Section } from './types';
import { InlineText, InlineTextarea } from './InlineEdit';

function ResumeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='mb-5'>
      <div className='text-[11px] font-bold tracking-[0.15em] text-slate-800 border-b border-slate-200 pb-1 mb-3'>
        {title}
      </div>
      {children}
    </div>
  );
}

interface ResumeDocumentProps {
  data: ResumeData;
  sections: Section[];
  onUpdate?: (updated: ResumeData) => void;
}

export function ResumeDocument({ data, sections, onUpdate }: ResumeDocumentProps) {
  const pi = data.personalInfo;
  const upPI = (patch: Partial<PersonalInfo>) =>
    onUpdate?.({ ...data, personalInfo: { ...pi, ...patch } });

  return (
    <div className='font-sans text-[#1a1a2e] text-[13px] leading-relaxed'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-[26px] font-black tracking-wide text-[#1a1a2e] uppercase'>
          <InlineText
            value={pi.name}
            onChange={onUpdate ? (v) => upPI({ name: v }) : undefined}
            className='text-[26px] font-black tracking-wide text-[#1a1a2e] uppercase'
          />
        </h1>
        <p className='text-[13px] text-slate-500 font-medium mt-0.5'>
          <InlineText
            value={pi.title}
            onChange={onUpdate ? (v) => upPI({ title: v }) : undefined}
            placeholder='Job Title'
            className='text-[13px] text-slate-500 font-medium'
          />
        </p>
        <div className='flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] text-slate-500'>
          {[
            { Icon: Mail, field: 'email' as const },
            { Icon: Phone, field: 'phone' as const },
            { Icon: MapPin, field: 'location' as const },
            { Icon: Linkedin, field: 'linkedin' as const },
          ].map(({ Icon, field }) => (
            <span key={field} className='flex items-center gap-1'>
              <Icon size={11} />
              <InlineText
                value={pi[field]}
                onChange={onUpdate ? (v) => upPI({ [field]: v }) : undefined}
                placeholder={field}
                className='text-[11px]'
              />
            </span>
          ))}
        </div>
      </div>

      {sections.map((s) => {
        switch (s.id) {
          case 'summary':
            return (
              <ResumeSection key='summary' title='CAREER OBJECTIVE'>
                <InlineTextarea
                  value={data.summary}
                  onChange={onUpdate ? (v) => onUpdate({ ...data, summary: v }) : undefined}
                  className='text-slate-700 text-[12.5px]'
                />
              </ResumeSection>
            );

          case 'experience':
            return (data.experience?.length ?? 0) > 0 ? (
              <ResumeSection key='experience' title='WORK EXPERIENCE'>
                {data.experience.map((exp, i) => (
                  <div key={i} className='mb-4'>
                    <div className='flex justify-between items-baseline'>
                      <InlineText
                        value={exp.title}
                        onChange={onUpdate ? (v) => onUpdate({ ...data, experience: data.experience.map((e, j) => j === i ? { ...e, title: v } : e) }) : undefined}
                        className='font-bold text-[13px]'
                      />
                      <InlineText
                        value={exp.duration}
                        onChange={onUpdate ? (v) => onUpdate({ ...data, experience: data.experience.map((e, j) => j === i ? { ...e, duration: v } : e) }) : undefined}
                        className='text-[11px] text-slate-400'
                        placeholder='duration'
                      />
                    </div>
                    <div className='text-[12px] text-slate-500 mb-1.5'>
                      <InlineText
                        value={exp.company}
                        onChange={onUpdate ? (v) => onUpdate({ ...data, experience: data.experience.map((e, j) => j === i ? { ...e, company: v } : e) }) : undefined}
                        className='text-[12px] text-slate-500'
                        placeholder='company'
                      />
                    </div>
                    <ul className='space-y-1'>
                      {exp.points.map((p, j) => (
                        <li key={j} className='flex gap-2 text-[12px] text-slate-600'>
                          <span className='mt-1.5 w-1 h-1 rounded-full bg-slate-400 shrink-0' />
                          <InlineText
                            value={p}
                            onChange={onUpdate ? (v) => onUpdate({ ...data, experience: data.experience.map((e, ei) => ei === i ? { ...e, points: e.points.map((pt, pi) => pi === j ? v : pt) } : e) }) : undefined}
                            className='text-[12px] text-slate-600 flex-1'
                          />
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
                      <InlineText
                        value={proj.name}
                        onChange={onUpdate ? (v) => onUpdate({ ...data, projects: data.projects.map((p, j) => j === i ? { ...p, name: v } : p) }) : undefined}
                        className='font-bold text-[13px]'
                      />
                      {proj.score && (
                        <span className='text-[11px] text-slate-400'>Verified · {proj.score}/100</span>
                      )}
                    </div>
                    <div className='text-[12px] text-slate-500 italic mb-1.5'>
                      <InlineTextarea
                        value={proj.description}
                        onChange={onUpdate ? (v) => onUpdate({ ...data, projects: data.projects.map((p, j) => j === i ? { ...p, description: v } : p) }) : undefined}
                        className='text-[12px] text-slate-500 italic'
                      />
                    </div>
                    {(proj.technologies?.length ?? 0) > 0 && (
                      <p className='text-[11px] text-slate-400'>
                        <span className='font-medium text-slate-500'>Tools: </span>
                        <InlineText
                          value={proj.technologies.join(', ')}
                          onChange={onUpdate ? (v) => onUpdate({ ...data, projects: data.projects.map((p, j) => j === i ? { ...p, technologies: v.split(',').map((t) => t.trim()) } : p) }) : undefined}
                          className='text-[11px] text-slate-400'
                        />
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
                  {data.skills.map((sk, i) => (
                    <div key={i} className='flex items-center gap-2 text-[12px] text-slate-700'>
                      <span className='w-1 h-1 rounded-full bg-slate-400 shrink-0' />
                      <InlineText
                        value={sk}
                        onChange={onUpdate ? (v) => onUpdate({ ...data, skills: data.skills.map((s, j) => j === i ? v : s) }) : undefined}
                        className='text-[12px] text-slate-700'
                      />
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
                    <div className='font-bold text-[13px]'>
                      <InlineText
                        value={e.degree}
                        onChange={onUpdate ? (v) => onUpdate({ ...data, education: data.education.map((ed, j) => j === i ? { ...ed, degree: v } : ed) }) : undefined}
                        className='font-bold text-[13px]'
                      />
                    </div>
                    <div className='text-[12px] text-slate-500'>
                      <InlineText
                        value={e.institution}
                        onChange={onUpdate ? (v) => onUpdate({ ...data, education: data.education.map((ed, j) => j === i ? { ...ed, institution: v } : ed) }) : undefined}
                        className='text-[12px] text-slate-500'
                        placeholder='institution'
                      />
                    </div>
                    {e.details && (
                      <div className='text-[11px] text-slate-400 mt-0.5'>
                        <InlineText
                          value={e.details}
                          onChange={onUpdate ? (v) => onUpdate({ ...data, education: data.education.map((ed, j) => j === i ? { ...ed, details: v } : ed) }) : undefined}
                          className='text-[11px] text-slate-400'
                        />
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
                    <li key={i} className='flex items-center gap-2 text-[12px] text-slate-700'>
                      <span className='w-1 h-1 rounded-full bg-slate-400 shrink-0' />
                      <InlineText
                        value={c}
                        onChange={onUpdate ? (v) => onUpdate({ ...data, certifications: data.certifications!.map((cert, j) => j === i ? v : cert) }) : undefined}
                        className='text-[12px] text-slate-700'
                      />
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
