export interface WorkExperience {
  title: string;
  company: string;
  duration: string;
  points: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  score?: number;
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
  details: string;
}

export interface PersonalInfo {
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

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  education: Education[];
  skills: string[];
  projects: Project[];
  achievements: string[];
  experience: WorkExperience[];
  certifications?: string[];
}

export interface ATSResult {
  atsScore: number;
  keywordMatch: number;
  contentQuality: number;
  formatting: number;
  missingKeywords: string[];
  suggestions: string[];
  optimizedSummary?: string;
}

export type SectionKey =
  | 'summary'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'education'
  | 'certifications';

export interface Section {
  id: SectionKey;
  label: string;
  icon: React.ElementType;
}
