export type CourseStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'published';
export type CourseAction = 'approved' | 'changes_requested' | 'rejected';

export interface Skill {
  name: string;
  category: 'technical' | 'tools' | 'soft';
}

export interface AiLesson {
  id: string;
  topic_id: string;
  title: string;
  explanation: string;
  example: string;
  activity: string;
  interview_questions: string[];
  order_index: number;
}

export interface AiTopic {
  id: string;
  module_id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: AiLesson[];
}

export interface AiModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  practice_tasks: string[];
  case_studies: string[];
  topics: AiTopic[];
}

export interface CourseReview {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  action: CourseAction;
  feedback: ReviewFeedback;
  created_at: string;
}

export interface ReviewFeedback {
  missing_skills?: string;
  incorrect_content?: string;
  difficulty_issues?: string;
  suggestions?: string;
  inline_comments?: string;
}

export interface AiCourse {
  id: string;
  title: string;
  domain: string;
  role_focus: string;
  jd_text: string | null;
  skills: Skill[];
  audience: string;
  level: string;
  learning_goal: string;
  duration_weeks: number | null;
  daily_hours: number | null;
  content_preference: string | null;
  status: CourseStatus;
  created_by: string;
  creator_name: string;
  reviewed_by: string | null;
  reviewer_name: string | null;
  subject_id: string | null;
  created_at: string;
  updated_at: string;
  modules: AiModule[];
  reviews: CourseReview[];
}

export interface CourseFormData {
  title: string;
  domain: string;
  role_focus: string;
  jd_text: string;
  skills: Skill[];
  audience: string;
  level: string;
  learning_goal: string;
  duration_weeks: number | '';
  daily_hours: number | '';
  content_preference: string;
}

// Shape returned by AI generate endpoint (before saving)
export interface GeneratedCurriculum {
  modules: Array<{
    title: string;
    description: string;
    practice_tasks: string[];
    case_studies: string[];
    topics: Array<{
      title: string;
      description: string;
      lessons: Array<{
        title: string;
        explanation: string;
        example: string;
        activity: string;
        interview_questions: string[];
      }>;
    }>;
  }>;
}
