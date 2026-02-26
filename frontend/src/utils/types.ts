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
  markdown_path: string | null;
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
  title?: string;
  unit_id: string;
  passing_score: number;
  max_score: number;
  questions: QuizQuestion[];
}

export interface TestCase {
  id: string;
  description: string;
  test_code: string;
  is_hidden: boolean;
}

export interface Exercise {
  id: string;
  subtopic_id: string;
  title: string;
  instructions?: string;
  max_score: number;
  language?: string;
  initial_files?: { name: string; content: string }[];
  test_cases?: TestCase[];
}

export interface Assignment {
  id: string;
  title: string;
  instructions?: string;
  max_score: number;
  // Enriched fields from student assignments API
  unit_id?: string;
  unit_title?: string;
  subject_title?: string;
  subject_slug?: string;
  status?: 'PENDING' | 'COMPLETED';
  score?: number;
}

export interface Subtopic {
  id: string;
  title: string;
  slug: string;
  description?: string;
  order_index: number;
  lesson_content?: LessonContent[];
  exercises?: Exercise[];
}

export interface Unit {
  id: string;
  title: string;
  slug: string;
  description?: string;
  order_index: number;
  subtopics: Subtopic[];
  assignments?: Assignment[];
  quizzes?: Quiz[];
}

export interface CapstoneProject {
  id: string;
  title: string;
  instructions?: string | null;
  max_score: number;
}

export interface Topic {
  id: string;
  title: string;
  description?: string;
  units: Unit[];
  order_index: number;
  capstone?: CapstoneProject | null;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_published: boolean;
  level?: string;
  total_lessons?: number;
  progress_percent?: number;
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
  loading?: boolean;
}

export interface SubtopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; slug?: string }) => void;
  topicTitle: string;
  editData?: { title: string; description: string; slug: string };
  loading?: boolean;
}

export interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; slug?: string }) => void;
  topicTitle: string;
  editData?: { title: string; description: string; slug: string };
  loading?: boolean;
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
  loading?: boolean;
}

export interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { passing_score: number; max_score: number }) => void;
  editData?: { passing_score: number; max_score: number };
  unitTitle: string;
  loading?: boolean;
}

export interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    instructions: string;
    max_score: number;
    language: string;
    initial_files: { name: string; content: string }[];
    test_cases: TestCase[];
  }) => void;
  editData?: {
    title: string;
    instructions: string;
    max_score: number;
    language?: string;
    initial_files?: { name: string; content: string }[];
    test_cases?: TestCase[];
  };
  subtopicTitle: string;
  loading?: boolean;
}
