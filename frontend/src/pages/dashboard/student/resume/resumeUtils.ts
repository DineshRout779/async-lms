import { Briefcase, GraduationCap, Code2, Award, User, Lightbulb } from 'lucide-react';
import type { ATSResult, ResumeData, Section } from './types';

export const DEFAULT_SECTIONS: Section[] = [
  { id: 'summary', label: 'Summary', icon: User },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'projects', label: 'Projects', icon: Code2 },
  { id: 'skills', label: 'Skills', icon: Lightbulb },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'certifications', label: 'Certifications', icon: Award },
];

export function calcLocalATS(data: ResumeData | null): ATSResult {
  if (!data)
    return { atsScore: 0, keywordMatch: 0, contentQuality: 0, formatting: 0, missingKeywords: [], suggestions: [] };

  let content = 0;
  if (data.summary) content += 20;
  if (data.experience?.length) content += 25;
  if (data.projects?.length) content += 20;
  if ((data.skills?.length ?? 0) >= 5) content += 20;
  if (data.education?.length) content += 15;

  const formatting = data.personalInfo.name && data.personalInfo.email ? 92 : 60;
  const keywordMatch = Math.min(100, Math.round(content * 0.75));
  const atsScore = Math.round((content + formatting + keywordMatch) / 3);

  return { atsScore, keywordMatch, contentQuality: content, formatting, missingKeywords: [], suggestions: [] };
}
