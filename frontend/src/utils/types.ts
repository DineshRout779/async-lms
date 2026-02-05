export type PlaygroundFile = {
  path: string;
  content: string;
};

export interface College {
  id: string;
  name: string;
  short_code: string;
  city: string;
  state: string;
  is_verified: boolean;
  created_at: string;
}

export interface LessonContent {
  id: string;
  subtopic_id: string;
  content_type: 'markdown' | 'video' | 'external';
  markdown_path: string;
  estimated_read_time?: number;
  version: number;
  is_published: boolean;
  video_url?: string | null;
}

export interface QuizOption {
  id: string;
  option_text: string;
  is_correct: boolean;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  points: number;
  options: QuizOption[];
  explanation?: string;
}

export interface Quiz {
  id: string;
  subtopic_id: string;
  passing_score: number;
  max_score: number;
  questions: QuizQuestion[];
}

export interface Exercise {
  id: string;
  subtopic_id: string;
  title: string;
  instructions?: string;
  max_score: number;
}

export interface Subtopic {
  id: string;
  title: string;
  slug: string;
  description?: string;
  order_index: number;
  lesson_content?: LessonContent[];
  quizzes?: Quiz[];
  exercises?: Exercise[];
}

export interface Topic {
  id: string;
  title: string;
  description?: string;
  subtopics: Subtopic[];
  order_index: number;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_published: boolean;
  units_count?: number;
  topics_count?: number;
}

export interface SubjectDetailResponse {
  success: boolean;
  name: string;
  description: string;
  data: Topic[];
}

export interface SubjectListResponse {
  success: boolean;
  data: Subject[];
}

export interface QuizAttemptResult {
  attempt: {
    score: number;
  };
  points_awarded: number;
}

// Modal Components
export interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string }) => void;
  editData?: { title: string; description: string };
}

export interface SubtopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; slug: string }) => void;
  topicTitle: string;
  editData?: { title: string; description: string; slug: string };
}

export interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    content_type: 'markdown' | 'video' | 'external';
    markdown_path: string;
    estimated_read_time?: number;
    video_url?: string;
    file?: File | null;
  }) => void;
  subtopicTitle: string;
  editData?: {
    content_type: 'markdown' | 'video' | 'external';
    markdown_path: string;
    estimated_read_time?: number;
    video_url?: string | null;
  };
}

export interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { passing_score: number; max_score: number }) => void;
  editData?: { passing_score: number; max_score: number };
  subtopicTitle: string;
}

export interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    instructions: string;
    max_score: number;
  }) => void;
  editData?: {
    title: string;
    instructions: string;
    max_score: number;
  };
  subtopicTitle: string;
}
