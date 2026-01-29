import React, { useState, useEffect, type ChangeEvent } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  FileText,
  Layout,
  Loader2,
  Edit2,
  Save,
  X,
  BookOpen,
  ListChecks,
  Code,
  FolderOpen,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';

// --- Types & Interfaces ---
interface LessonContent {
  id: string;
  subtopic_id: string;
  content_type: 'markdown' | 'video' | 'external';
  markdown_path: string;
  estimated_read_time?: number;
  version: number;
  is_published: boolean;
}

interface Quiz {
  id: string;
  subtopic_id: string;
  passing_score: number;
  max_score: number;
}

interface Exercise {
  id: string;
  subtopic_id: string;
  title: string;
  instructions?: string;
  max_score: number;
}

interface Subtopic {
  id: string;
  title: string;
  slug: string;
  description?: string;
  order_index: number;
  lesson_content?: LessonContent[];
  quizzes?: Quiz[];
  exercises?: Exercise[];
}

interface Topic {
  id: string;
  title: string;
  description?: string;
  subtopics: Subtopic[];
  order_index: number;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface SubjectDetailResponse {
  success: boolean;
  name: string;
  description: string;
  data: Topic[];
}

interface SubjectListResponse {
  success: boolean;
  data: Subject[];
}

// Modal Components
interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string }) => void;
  editData?: { title: string; description: string };
}

const TopicModal: React.FC<TopicModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editData,
}) => {
  const [title, setTitle] = useState(editData?.title || '');
  const [description, setDescription] = useState(editData?.description || '');

  useEffect(() => {
    if (editData) {
      setTitle(editData.title);
      setDescription(editData.description);
    }
  }, [editData]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Topic title is required');
      return;
    }
    onSave({ title: title.trim(), description: description.trim() });
    setTitle('');
    setDescription('');
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-xl'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='text-lg font-bold text-slate-900'>
            {editData ? 'Edit Topic' : 'Add New Topic'}
          </h3>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-600'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Topic Title
            </label>
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g., Introduction to Arrays'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Brief description of this topic...'
              rows={3}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>
        </div>

        <div className='mt-6 flex gap-3'>
          <Button
            onClick={onClose}
            className='flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className='flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
          >
            <Save className='mr-2 h-4 w-4' />
            {editData ? 'Update' : 'Create'} Topic
          </Button>
        </div>
      </div>
    </div>
  );
};

interface SubtopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; slug: string }) => void;
  topicTitle: string;
  editData?: { title: string; description: string; slug: string };
}

const SubtopicModal: React.FC<SubtopicModalProps> = ({
  isOpen,
  onClose,
  onSave,
  topicTitle,
  editData,
}) => {
  const [title, setTitle] = useState(editData?.title || '');
  const [description, setDescription] = useState(editData?.description || '');
  const [slug, setSlug] = useState(editData?.slug || '');

  useEffect(() => {
    if (editData) {
      setTitle(editData.title);
      setDescription(editData.description);
      setSlug(editData.slug);
    }
  }, [editData]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!editData && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generatedSlug);
    }
  }, [title, editData]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Subtopic title is required');
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug is required');
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      slug: slug.trim(),
    });
    setTitle('');
    setDescription('');
    setSlug('');
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-xl'>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-bold text-slate-900'>
              {editData ? 'Edit Subtopic' : 'Add Content Step'}
            </h3>
            <p className='text-sm text-slate-500'>Topic: {topicTitle}</p>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-600'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Subtopic Title
            </label>
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g., What are Arrays?'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              URL Slug
            </label>
            <input
              type='text'
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder='what-are-arrays'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
            <p className='mt-1 text-xs text-slate-500'>
              URL: /course/topic/{slug}
            </p>
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Brief description...'
              rows={3}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>
        </div>

        <div className='mt-6 flex gap-3'>
          <Button
            onClick={onClose}
            className='flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className='flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
          >
            <Save className='mr-2 h-4 w-4' />
            {editData ? 'Update' : 'Create'} Subtopic
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    content_type: 'markdown' | 'video' | 'external';
    markdown_path: string;
    estimated_read_time?: number;
  }) => void;
  subtopicTitle: string;
}

const ContentModal: React.FC<ContentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subtopicTitle,
}) => {
  const [contentType, setContentType] = useState<
    'markdown' | 'video' | 'external'
  >('markdown');
  const [markdownPath, setMarkdownPath] = useState('');
  const [readTime, setReadTime] = useState<number | undefined>(undefined);

  const handleSave = () => {
    if (!markdownPath.trim()) {
      toast.error('Content path is required');
      return;
    }
    onSave({
      content_type: contentType,
      markdown_path: markdownPath.trim(),
      estimated_read_time: readTime,
    });
    setMarkdownPath('');
    setReadTime(undefined);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-xl'>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-bold text-slate-900'>
              Add Lesson Content
            </h3>
            <p className='text-sm text-slate-500'>Subtopic: {subtopicTitle}</p>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-600'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Content Type
            </label>
            <select
              value={contentType}
              onChange={(e) =>
                setContentType(
                  e.target.value as 'markdown' | 'video' | 'external'
                )
              }
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            >
              <option value='markdown'>Markdown Text</option>
              <option value='video'>Video</option>
              <option value='external'>External Link</option>
            </select>
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              {contentType === 'markdown'
                ? 'Markdown File Path'
                : contentType === 'video'
                ? 'Video URL'
                : 'External Link'}
            </label>
            <input
              type='text'
              value={markdownPath}
              onChange={(e) => setMarkdownPath(e.target.value)}
              placeholder={
                contentType === 'markdown'
                  ? '/content/web/frontend/intro.md'
                  : contentType === 'video'
                  ? 'https://youtube.com/...'
                  : 'https://...'
              }
              className='w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Estimated Read Time (minutes)
            </label>
            <input
              type='number'
              value={readTime || ''}
              onChange={(e) =>
                setReadTime(
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              placeholder='10'
              min='1'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>
        </div>

        <div className='mt-6 flex gap-3'>
          <Button
            onClick={onClose}
            className='flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className='flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
          >
            <Save className='mr-2 h-4 w-4' />
            Add Content
          </Button>
        </div>
      </div>
    </div>
  );
};

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { passing_score: number; max_score: number }) => void;
  editData?: { passing_score: number; max_score: number };
  subtopicTitle: string;
}

const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editData,
  subtopicTitle,
}) => {
  const [passingScore, setPassingScore] = useState(
    editData?.passing_score ?? 70
  );
  const [maxScore, setMaxScore] = useState(editData?.max_score ?? 100);

  const handleSave = () => {
    if (passingScore <= 0 || maxScore <= 0) {
      toast.error('Scores must be greater than 0');
      return;
    }
    if (passingScore > maxScore) {
      toast.error('Passing score cannot exceed max score');
      return;
    }
    onSave({
      passing_score: passingScore,
      max_score: maxScore,
    });
    setPassingScore(70);
    setMaxScore(100);
  };

  useEffect(() => {
    if (editData) {
      setPassingScore(editData.passing_score);
      setMaxScore(editData.max_score);
    }
  }, [editData]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-xl'>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-bold text-slate-900'>
              {editData ? 'Update' : 'Create'} Quiz
            </h3>
            <p className='text-sm text-slate-500'>Subtopic: {subtopicTitle}</p>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-600'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Maximum Score
            </label>
            <input
              type='number'
              value={maxScore}
              onChange={(e) => setMaxScore(parseInt(e.target.value) || 0)}
              placeholder='100'
              min='1'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Passing Score
            </label>
            <input
              type='number'
              value={passingScore}
              onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
              placeholder='70'
              min='1'
              max={maxScore}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
            <p className='mt-1 text-xs text-slate-500'>
              Students must score at least {passingScore} out of {maxScore} to
              pass
            </p>
          </div>
        </div>

        <div className='mt-6 flex gap-3'>
          <Button
            onClick={onClose}
            className='flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className='flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
          >
            <Save className='mr-2 h-4 w-4' />
            {editData ? 'Update' : 'Create'} Quiz
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ExerciseModalProps {
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

const ExerciseModal: React.FC<ExerciseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editData,
  subtopicTitle,
}) => {
  const [title, setTitle] = useState(editData?.title ?? '');
  const [instructions, setInstructions] = useState(
    editData?.instructions ?? ''
  );
  const [maxScore, setMaxScore] = useState(editData?.max_score ?? 100);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Exercise title is required');
      return;
    }
    if (maxScore <= 0) {
      toast.error('Max score must be greater than 0');
      return;
    }
    onSave({
      title: title.trim(),
      instructions: instructions.trim(),
      max_score: maxScore,
    });
    setTitle('');
    setInstructions('');
    setMaxScore(100);
  };

  useEffect(() => {
    if (editData) {
      setTitle(editData.title);
      setInstructions(editData.instructions || '');
      setMaxScore(editData.max_score);
    }
  }, [editData]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-xl'>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-bold text-slate-900'>
              {editData ? 'Edit Exercise' : 'Create Exercise'}
            </h3>
            <p className='text-sm text-slate-500'>Subtopic: {subtopicTitle}</p>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-600'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Exercise Title
            </label>
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g., Implement Binary Search'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder='Detailed instructions for the exercise...'
              rows={4}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-slate-700'>
              Maximum Score
            </label>
            <input
              type='number'
              value={maxScore}
              onChange={(e) => setMaxScore(parseInt(e.target.value) || 0)}
              placeholder='100'
              min='1'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            />
          </div>
        </div>

        <div className='mt-6 flex gap-3'>
          <Button
            onClick={onClose}
            className='flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className='flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
          >
            <Save className='mr-2 h-4 w-4' />
            {editData ? 'Update' : 'Create'} Exercise
          </Button>
        </div>
      </div>
    </div>
  );
};

const LearningFlow: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<{
    id: string;
    slug: string;
    name: string;
  } | null>(null);
  const [structure, setStructure] = useState<Topic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingStructure, setFetchingStructure] = useState<boolean>(false);

  // Expanded topics and subtopics tracking
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(
    new Set()
  );

  // Modal states
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [subtopicModalOpen, setSubtopicModalOpen] = useState(false);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);

  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingSubtopic, setEditingSubtopic] = useState<{
    subtopic: Subtopic;
    topicId: string;
  } | null>(null);
  const [selectedTopicForSubtopic, setSelectedTopicForSubtopic] =
    useState<Topic | null>(null);
  const [selectedSubtopicForContent, setSelectedSubtopicForContent] =
    useState<Subtopic | null>(null);
  const [selectedSubtopicForQuiz, setSelectedSubtopicForQuiz] =
    useState<Subtopic | null>(null);
  const [selectedSubtopicForExercise, setSelectedSubtopicForExercise] =
    useState<Subtopic | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  // 1. Initial Load: Get all subjects
  useEffect(() => {
    const fetchSubjects = async (): Promise<void> => {
      try {
        const res = await apiClient.get<SubjectListResponse>('/subjects');
        if (res.data.success) {
          setSubjects(res.data.data);
          if (res.data.data.length > 0) {
            handleSubjectChange(res.data.data[0].slug, res.data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch subjects', err);
        toast.error('Failed to load subjects');
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  // 2. Fetch specific hierarchy when a subject is selected
  const handleSubjectChange = async (
    slug: string,
    id: string
  ): Promise<void> => {
    setFetchingStructure(true);
    try {
      const res = await apiClient.get<SubjectDetailResponse>(
        `/subjects/${slug}`
      );
      if (res.data.success) {
        setSelectedSubject({ id, slug, name: res.data.name });
        setStructure(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch structure', err);
      toast.error('Failed to load course structure');
    } finally {
      setFetchingStructure(false);
    }
  };

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const selected = subjects.find((s) => s.slug === e.target.value);
    if (selected) {
      handleSubjectChange(selected.slug, selected.id);
    }
  };

  // Toggle topic expansion
  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  // Toggle subtopic expansion
  const toggleSubtopic = (subtopicId: string) => {
    setExpandedSubtopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subtopicId)) {
        newSet.delete(subtopicId);
      } else {
        newSet.add(subtopicId);
      }
      return newSet;
    });
  };

  // CRUD Operations

  // Create Topic
  const handleCreateTopic = async (data: {
    title: string;
    description: string;
  }) => {
    if (!selectedSubject) return;

    try {
      const response = await apiClient.post('/admin/topics', {
        subject_id: selectedSubject.id,
        title: data.title,
        description: data.description,
        order_index: structure.length,
      });

      if (response.data.success) {
        toast.success('Topic created successfully');
        handleSubjectChange(selectedSubject.slug, selectedSubject.id);
        setTopicModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create topic', error);
      toast.error('Failed to create topic');
    }
  };

  // Update Topic
  const handleUpdateTopic = async (data: {
    title: string;
    description: string;
  }) => {
    if (!editingTopic) return;

    try {
      const response = await apiClient.put(`/admin/topics/${editingTopic.id}`, {
        title: data.title,
        description: data.description,
      });

      if (response.data.success) {
        toast.success('Topic updated successfully');
        handleSubjectChange(selectedSubject!.slug, selectedSubject!.id);
        setTopicModalOpen(false);
        setEditingTopic(null);
      }
    } catch (error) {
      console.error('Failed to update topic', error);
      toast.error('Failed to update topic');
    }
  };

  // Delete Topic
  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) return;

    try {
      const response = await apiClient.delete(`/admin/topics/${topicId}`);
      if (response.data.success) {
        toast.success('Topic deleted successfully');
        handleSubjectChange(selectedSubject!.slug, selectedSubject!.id);
      }
    } catch (error) {
      console.error('Failed to delete topic', error);
      toast.error('Failed to delete topic');
    }
  };

  // Create Subtopic
  const handleCreateSubtopic = async (data: {
    title: string;
    description: string;
    slug: string;
  }) => {
    if (!selectedTopicForSubtopic) return;

    try {
      const response = await apiClient.post('/admin/subtopics', {
        topic_id: selectedTopicForSubtopic.id,
        title: data.title,
        description: data.description,
        slug: data.slug,
        order_index: selectedTopicForSubtopic.subtopics.length,
      });

      if (response.data.success) {
        toast.success('Subtopic created successfully');
        handleSubjectChange(selectedSubject!.slug, selectedSubject!.id);
        setSubtopicModalOpen(false);
        setSelectedTopicForSubtopic(null);
      }
    } catch (error: any) {
      console.error('Failed to create subtopic', error);
      if (error.response?.status === 409) {
        toast.error('A subtopic with this slug already exists');
      } else {
        toast.error('Failed to create subtopic');
      }
    }
  };

  // Update Subtopic
  const handleUpdateSubtopic = async (data: {
    title: string;
    description: string;
    slug: string;
  }) => {
    if (!editingSubtopic) return;

    try {
      const response = await apiClient.put(
        `/admin/subtopics/${editingSubtopic.subtopic.id}`,
        {
          title: data.title,
          description: data.description,
          slug: data.slug,
        }
      );

      if (response.data.success) {
        toast.success('Subtopic updated successfully');
        handleSubjectChange(selectedSubject!.slug, selectedSubject!.id);
        setSubtopicModalOpen(false);
        setEditingSubtopic(null);
      }
    } catch (error) {
      console.error('Failed to update subtopic', error);
      toast.error('Failed to update subtopic');
    }
  };

  // Delete Subtopic
  const handleDeleteSubtopic = async (subtopicId: string) => {
    if (!confirm('Are you sure you want to delete this subtopic?')) return;

    try {
      const response = await apiClient.delete(`/admin/subtopics/${subtopicId}`);
      if (response.data.success) {
        toast.success('Subtopic deleted successfully');
        handleSubjectChange(selectedSubject!.slug, selectedSubject!.id);
      }
    } catch (error) {
      console.error('Failed to delete subtopic', error);
      toast.error('Failed to delete subtopic');
    }
  };

  // Create Lesson Content
  const handleCreateContent = async (data: {
    content_type: 'markdown' | 'video' | 'external';
    markdown_path: string;
    estimated_read_time?: number;
  }) => {
    if (!selectedSubtopicForContent) return;

    try {
      const response = await apiClient.post('/admin/lesson-content', {
        subtopic_id: selectedSubtopicForContent.id,
        content_type: data.content_type,
        markdown_path: data.markdown_path,
        estimated_read_time: data.estimated_read_time,
        is_published: false,
      });

      if (response.data.success) {
        toast.success('Lesson content created successfully');
        await handleSubjectChange(selectedSubject!.slug, selectedSubject!.id); // ✅
        setContentModalOpen(false);
        setSelectedSubtopicForContent(null);
      }
    } catch (error) {
      console.error('Failed to create content', error);
      toast.error('Failed to create lesson content');
    }
  };

  // Create Quiz
  const handleCreateQuiz = async (data: {
    passing_score: number;
    max_score: number;
  }) => {
    if (!selectedSubtopicForQuiz) return;

    try {
      const response = await apiClient.post('/admin/quizzes', {
        subtopic_id: selectedSubtopicForQuiz.id,
        passing_score: data.passing_score,
        max_score: data.max_score,
      });

      if (response.data.success) {
        toast.success('Quiz created successfully');
        await handleSubjectChange(selectedSubject!.slug, selectedSubject!.id); // ✅
        setQuizModalOpen(false);
        setSelectedSubtopicForQuiz(null);
      }
    } catch (error) {
      console.error('Failed to create quiz', error);
      toast.error('Failed to create quiz');
    }
  };

  // Create Exercise
  const handleCreateExercise = async (data: {
    title: string;
    instructions: string;
    max_score: number;
  }) => {
    if (!selectedSubtopicForExercise) return;

    try {
      const response = await apiClient.post('/admin/exercises', {
        subtopic_id: selectedSubtopicForExercise.id,
        title: data.title,
        instructions: data.instructions,
        max_score: data.max_score,
      });

      if (response.data.success) {
        toast.success('Exercise created successfully');
        await handleSubjectChange(selectedSubject!.slug, selectedSubject!.id); // ✅
        setExerciseModalOpen(false);
        setSelectedSubtopicForExercise(null);
      }
    } catch (error) {
      console.error('Failed to create exercise', error);
      toast.error('Failed to create exercise');
    }
  };

  const handleUpdateQuiz = async (data: {
    passing_score: number;
    max_score: number;
  }) => {
    if (!editingQuiz) return;

    try {
      await apiClient.put(`/admin/quizzes/${editingQuiz.id}`, data);
      toast.success('Quiz updated');
      handleSubjectChange(selectedSubject!.slug, selectedSubject!.id);
      setEditingQuiz(null);
      setQuizModalOpen(false);
    } catch {
      toast.error('Failed to update quiz');
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('Delete this quiz?')) return;

    try {
      await apiClient.delete(`/admin/quizzes/${id}`);
      toast.success('Quiz deleted');
      handleSubjectChange(selectedSubject!.slug, selectedSubject!.id);
    } catch {
      toast.error('Failed to delete quiz');
    }
  };

  const handleUpdateExercise = async (data: {
    title: string;
    instructions: string;
    max_score: number;
  }) => {
    if (!editingExercise) return;

    try {
      await apiClient.put(`/admin/exercises/${editingExercise.id}`, data);
      toast.success('Exercise updated');
      handleSubjectChange(selectedSubject!.slug, selectedSubject!.id);
      setEditingExercise(null);
      setExerciseModalOpen(false);
    } catch {
      toast.error('Failed to update exercise');
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm('Delete this exercise?')) return;

    try {
      await apiClient.delete(`/admin/exercises/${id}`);
      toast.success('Exercise deleted');
      handleSubjectChange(selectedSubject!.slug, selectedSubject!.id);
    } catch {
      toast.error('Failed to delete exercise');
    }
  };

  // Reorder Topics
  const handleMoveTopicUp = async (index: number) => {
    if (index === 0) return;

    const newStructure = [...structure];
    [newStructure[index - 1], newStructure[index]] = [
      newStructure[index],
      newStructure[index - 1],
    ];

    try {
      await Promise.all([
        apiClient.put(`/admin/topics/${newStructure[index - 1].id}`, {
          order_index: index - 1,
        }),
        apiClient.put(`/admin/topics/${newStructure[index].id}`, {
          order_index: index,
        }),
      ]);

      setStructure(newStructure);
      toast.success('Topic order updated');
    } catch (error) {
      console.error('Failed to reorder', error);
      toast.error('Failed to update order');
    }
  };

  const handleMoveTopicDown = async (index: number) => {
    if (index === structure.length - 1) return;

    const newStructure = [...structure];
    [newStructure[index], newStructure[index + 1]] = [
      newStructure[index + 1],
      newStructure[index],
    ];

    try {
      await Promise.all([
        apiClient.put(`/admin/topics/${newStructure[index].id}`, {
          order_index: index,
        }),
        apiClient.put(`/admin/topics/${newStructure[index + 1].id}`, {
          order_index: index + 1,
        }),
      ]);

      setStructure(newStructure);
      toast.success('Topic order updated');
    } catch (error) {
      console.error('Failed to reorder', error);
      toast.error('Failed to update order');
    }
  };

  // Helper function to get content type icon
  // const getContentIcon = (type: string) => {
  //   switch (type) {
  //     case 'video':
  //       return <Video className='h-4 w-4' />;
  //     case 'external':
  //       return <LinkIcon className='h-4 w-4' />;
  //     default:
  //       return <FileText className='h-4 w-4' />;
  //   }
  // };

  if (loading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-slate-50'>
        <Loader2 className='h-10 w-10 animate-spin text-indigo-600' />
      </div>
    );
  }

  return (
    <>
      <div className='flex min-h-screen gap-6 bg-[#F8FAFC] p-8'>
        {/* Main Builder Content */}
        <div className='flex-1 space-y-6'>
          <header className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='mb-1 flex items-center gap-3 text-indigo-600'>
              <Layout className='h-5 w-5' />
              <h1 className='text-lg font-bold'>Learning Flow Builder</h1>
            </div>
            <p className='text-sm text-slate-500'>
              Design and manage your curriculum structure
            </p>
          </header>

          {fetchingStructure ? (
            <div className='flex h-64 items-center justify-center'>
              <Loader2 className='h-8 w-8 animate-spin text-slate-300' />
            </div>
          ) : (
            selectedSubject && (
              <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
                <div className='mb-8 flex items-center justify-between'>
                  <div>
                    <h2 className='text-xl font-bold text-slate-900'>
                      {selectedSubject.name}
                    </h2>
                    <span className='font-mono text-xs uppercase text-slate-400'>
                      {selectedSubject.slug}
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingTopic(null);
                      setTopicModalOpen(true);
                    }}
                    className='border border-indigo-100 bg-indigo-600 text-white hover:bg-indigo-700'
                  >
                    <Plus className='mr-2 h-4 w-4' /> Add New Topic
                  </Button>
                </div>

                {/* Topics */}
                <div className='space-y-6'>
                  {structure.length === 0 ? (
                    <div className='rounded-xl border-2 border-dashed border-slate-200 py-16 text-center'>
                      <FolderOpen className='mx-auto h-12 w-12 text-slate-300' />
                      <p className='mt-4 text-sm font-medium text-slate-500'>
                        No topics yet
                      </p>
                      <p className='mt-1 text-xs text-slate-400'>
                        Click "Add New Topic" to get started
                      </p>
                    </div>
                  ) : (
                    structure.map((topic: Topic, index: number) => (
                      <div
                        key={topic.id}
                        className='overflow-hidden rounded-xl border border-slate-100 bg-slate-50/30'
                      >
                        <div className='flex items-center justify-between border-b border-slate-100 bg-white p-4'>
                          <div className='flex items-center gap-3'>
                            <button
                              onClick={() => toggleTopic(topic.id)}
                              className='text-slate-400 hover:text-slate-600'
                            >
                              {expandedTopics.has(topic.id) ? (
                                <ChevronDown className='h-4 w-4' />
                              ) : (
                                <ChevronRight className='h-4 w-4' />
                              )}
                            </button>
                            <span className='font-semibold text-slate-800'>
                              Unit {index + 1}: {topic.title}
                            </span>
                            {topic.description && (
                              <span className='text-xs text-slate-500'>
                                • {topic.description}
                              </span>
                            )}
                          </div>
                          <div className='flex items-center gap-3 text-slate-300'>
                            <Edit2
                              onClick={() => {
                                setEditingTopic(topic);
                                setTopicModalOpen(true);
                              }}
                              className='h-4 w-4 cursor-pointer hover:text-indigo-500'
                            />
                            <ArrowUp
                              onClick={() => handleMoveTopicUp(index)}
                              className={`h-4 w-4 ${
                                index === 0
                                  ? 'cursor-not-allowed opacity-30'
                                  : 'cursor-pointer hover:text-slate-600'
                              }`}
                            />
                            <ArrowDown
                              onClick={() => handleMoveTopicDown(index)}
                              className={`h-4 w-4 ${
                                index === structure.length - 1
                                  ? 'cursor-not-allowed opacity-30'
                                  : 'cursor-pointer hover:text-slate-600'
                              }`}
                            />
                            <div className='mx-1 h-4 w-px bg-slate-200' />
                            <Trash2
                              onClick={() => handleDeleteTopic(topic.id)}
                              className='h-4 w-4 cursor-pointer hover:text-red-500'
                            />
                          </div>
                        </div>

                        {/* Subtopics - only show when expanded */}
                        {expandedTopics.has(topic.id) && (
                          <div className='space-y-3 p-4'>
                            {topic.subtopics.length === 0 ? (
                              <div className='rounded-lg border-2 border-dashed border-slate-200 bg-white py-8 text-center'>
                                <BookOpen className='mx-auto h-8 w-8 text-slate-300' />
                                <p className='mt-2 text-xs text-slate-400'>
                                  No content steps yet
                                </p>
                              </div>
                            ) : (
                              topic.subtopics.map((sub: Subtopic) => (
                                <div key={sub.id} className='space-y-2'>
                                  <div className='group flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-200'>
                                    <div className='flex flex-1 items-center gap-4'>
                                      <button
                                        onClick={() => toggleSubtopic(sub.id)}
                                        className='text-slate-400 hover:text-slate-600'
                                      >
                                        {expandedSubtopics.has(sub.id) ? (
                                          <ChevronDown className='h-4 w-4' />
                                        ) : (
                                          <ChevronRight className='h-4 w-4' />
                                        )}
                                      </button>
                                      <div className='rounded-lg bg-slate-50 p-2'>
                                        <FileText className='h-5 w-5 text-slate-400' />
                                      </div>
                                      <div className='flex-1'>
                                        <p className='text-sm font-bold text-slate-700'>
                                          {sub.title}
                                        </p>
                                        <div className='mt-0.5 flex items-center gap-2'>
                                          <span className='font-mono text-[10px] text-slate-400'>
                                            {sub.slug}
                                          </span>
                                          {sub.description && (
                                            <span className='text-xs text-slate-500'>
                                              • {sub.description}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className='flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100'>
                                      <button
                                        onClick={() => {
                                          setSelectedSubtopicForContent(sub);
                                          setContentModalOpen(true);
                                        }}
                                        className='rounded-lg border border-slate-200 bg-white p-2 hover:border-indigo-300 hover:bg-indigo-50'
                                        title='Add lesson content'
                                      >
                                        <Plus className='h-3 w-3 text-slate-600' />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingSubtopic({
                                            subtopic: sub,
                                            topicId: topic.id,
                                          });
                                          setSubtopicModalOpen(true);
                                        }}
                                        className='rounded-lg border border-slate-200 bg-white p-2 hover:border-indigo-300 hover:bg-indigo-50'
                                        title='Edit subtopic'
                                      >
                                        <Edit2 className='h-3 w-3 text-slate-600' />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteSubtopic(sub.id)
                                        }
                                        className='rounded-lg border border-slate-200 bg-white p-2 hover:border-red-300 hover:bg-red-50'
                                        title='Delete subtopic'
                                      >
                                        <Trash2 className='h-3 w-3 text-slate-600' />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Subtopic Content - Show when expanded */}
                                  {expandedSubtopics.has(sub.id) && (
                                    <div className='space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-4'>
                                      <div className='mb-3 flex items-center justify-between'>
                                        <span className='text-xs font-bold uppercase tracking-wider text-slate-500'>
                                          Contents
                                        </span>
                                        <div className='flex gap-2'>
                                          <button
                                            onClick={() => {
                                              setSelectedSubtopicForQuiz(sub);
                                              setQuizModalOpen(true);
                                            }}
                                            className='flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:border-indigo-300 hover:bg-indigo-50'
                                          >
                                            <ListChecks className='h-3 w-3' />
                                            Quiz
                                          </button>
                                          <button
                                            onClick={() => {
                                              setSelectedSubtopicForExercise(
                                                sub
                                              );
                                              setExerciseModalOpen(true);
                                            }}
                                            className='flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:border-indigo-300 hover:bg-indigo-50'
                                          >
                                            <Code className='h-3 w-3' />
                                            Exercise
                                          </button>
                                        </div>
                                      </div>

                                      <div className='space-y-4 rounded-lg border border-slate-100 bg-slate-50 p-2'>
                                        {/* LESSON CONTENT */}
                                        <div>
                                          <p className='mb-2 text-xs font-bold uppercase text-slate-500'>
                                            Lesson Content
                                          </p>

                                          {sub.lesson_content &&
                                          sub.lesson_content.length > 0 ? (
                                            <div className='space-y-2'>
                                              {sub.lesson_content.map(
                                                (content) => (
                                                  <div
                                                    key={content.id}
                                                    className='flex items-center justify-between rounded-md border bg-white p-2 text-xs'
                                                  >
                                                    <div className='flex flex-col'>
                                                      <span className='font-mono text-slate-700'>
                                                        {content.markdown_path}
                                                      </span>
                                                      <span className='text-slate-400'>
                                                        Type:{' '}
                                                        {content.content_type} •
                                                        Version{' '}
                                                        {content.version}
                                                      </span>
                                                    </div>

                                                    <span
                                                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                                        content.is_published
                                                          ? 'bg-green-100 text-green-700'
                                                          : 'bg-yellow-100 text-yellow-700'
                                                      }`}
                                                    >
                                                      {content.is_published
                                                        ? 'Published'
                                                        : 'Draft'}
                                                    </span>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          ) : (
                                            <p className='text-xs italic text-slate-400'>
                                              No lesson content added yet.
                                            </p>
                                          )}
                                        </div>

                                        {/* QUIZZES */}
                                        <div>
                                          <p className='mb-2 text-xs font-bold uppercase text-slate-500'>
                                            Quizzes
                                          </p>

                                          {sub.quizzes &&
                                          sub.quizzes.length > 0 ? (
                                            <div className='space-y-2'>
                                              {sub.quizzes.map((quiz, idx) => (
                                                <div
                                                  key={quiz.id}
                                                  className='rounded-md border bg-white p-2 text-xs'
                                                >
                                                  <div className='flex justify-between items-center'>
                                                    <div>
                                                      <p className='font-semibold'>
                                                        Quiz {idx + 1}
                                                      </p>
                                                      <p className='text-xs text-slate-500'>
                                                        Passing{' '}
                                                        {quiz.passing_score}/
                                                        {quiz.max_score}
                                                      </p>
                                                    </div>

                                                    <div className='flex gap-2'>
                                                      <Edit2
                                                        className='h-3 w-3 cursor-pointer'
                                                        onClick={() => {
                                                          setEditingQuiz(quiz);
                                                          setSelectedSubtopicForQuiz(
                                                            sub
                                                          );
                                                          setQuizModalOpen(
                                                            true
                                                          );
                                                        }}
                                                      />
                                                      <Trash2
                                                        className='h-3 w-3 cursor-pointer text-red-500'
                                                        onClick={() =>
                                                          handleDeleteQuiz(
                                                            quiz.id
                                                          )
                                                        }
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className='text-xs italic text-slate-400'>
                                              No quizzes created yet.
                                            </p>
                                          )}
                                        </div>

                                        {/* EXERCISES */}
                                        <div>
                                          <p className='mb-2 text-xs font-bold uppercase text-slate-500'>
                                            Exercises
                                          </p>

                                          {sub.exercises &&
                                          sub.exercises.length > 0 ? (
                                            <div className='space-y-2'>
                                              {sub.exercises.map((ex) => (
                                                <div
                                                  key={ex.id}
                                                  className='rounded-md border bg-white p-2 text-xs'
                                                >
                                                  <div className='flex justify-between items-center'>
                                                    <div>
                                                      <p className='font-semibold'>
                                                        {ex.title}
                                                      </p>
                                                      <p className='text-xs text-slate-500'>
                                                        Max Score:{' '}
                                                        {ex.max_score}
                                                      </p>
                                                    </div>

                                                    <div className='flex gap-2'>
                                                      <Edit2
                                                        className='h-3 w-3 cursor-pointer'
                                                        onClick={() => {
                                                          setEditingExercise(
                                                            ex
                                                          );
                                                          setSelectedSubtopicForExercise(
                                                            sub
                                                          );
                                                          setExerciseModalOpen(
                                                            true
                                                          );
                                                        }}
                                                      />
                                                      <Trash2
                                                        className='h-3 w-3 cursor-pointer text-red-500'
                                                        onClick={() =>
                                                          handleDeleteExercise(
                                                            ex.id
                                                          )
                                                        }
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className='text-xs italic text-slate-400'>
                                              No exercises added yet.
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                            <button
                              onClick={() => {
                                setSelectedTopicForSubtopic(topic);
                                setEditingSubtopic(null);
                                setSubtopicModalOpen(true);
                              }}
                              className='w-full rounded-xl border-2 border-dashed border-slate-200 py-4 text-sm font-medium text-slate-400 transition-all hover:border-indigo-300 hover:text-indigo-500'
                            >
                              + Add Content Step
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* Right Sidebar: Configuration */}
        <div className='w-80'>
          <Card className='sticky top-8 border-slate-200 p-6 shadow-sm'>
            <div className='mb-6 flex items-center gap-2 text-slate-800'>
              <Settings className='h-4 w-4' />
              <h3 className='font-bold'>Flow Configuration</h3>
            </div>

            <div className='space-y-6'>
              {/* Subject Dropdown */}
              <div>
                <label className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>
                  Editing Course
                </label>
                <select
                  className='mt-2 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500'
                  value={selectedSubject?.slug || ''}
                  onChange={handleSelectChange}
                >
                  {subjects.map((s: Subject) => (
                    <option key={s.id} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stats */}
              {selectedSubject && (
                <div className='space-y-3 rounded-lg bg-slate-50 p-4'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-slate-600'>Total Topics</span>
                    <span className='font-bold text-slate-900'>
                      {structure.length}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-slate-600'>
                      Total Subtopics
                    </span>
                    <span className='font-bold text-slate-900'>
                      {structure.reduce(
                        (sum, topic) => sum + topic.subtopics.length,
                        0
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Info */}
              <div className='rounded-lg border border-slate-200 bg-white p-4'>
                <p className='text-xs font-bold uppercase tracking-widest text-slate-400'>
                  Quick Guide
                </p>
                <ul className='mt-3 space-y-2 text-xs text-slate-600'>
                  <li>• Click chevron to expand/collapse</li>
                  <li>• Hover over items to see actions</li>
                  <li>• Add quizzes & exercises to subtopics</li>
                  <li>• Reorder topics with arrows</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <TopicModal
        isOpen={topicModalOpen}
        onClose={() => {
          setTopicModalOpen(false);
          setEditingTopic(null);
        }}
        onSave={editingTopic ? handleUpdateTopic : handleCreateTopic}
        editData={
          editingTopic
            ? {
                title: editingTopic.title,
                description: editingTopic.description || '',
              }
            : undefined
        }
      />

      <SubtopicModal
        isOpen={subtopicModalOpen}
        onClose={() => {
          setSubtopicModalOpen(false);
          setEditingSubtopic(null);
          setSelectedTopicForSubtopic(null);
        }}
        onSave={editingSubtopic ? handleUpdateSubtopic : handleCreateSubtopic}
        topicTitle={
          selectedTopicForSubtopic?.title ||
          structure.find((t) => t.id === editingSubtopic?.topicId)?.title ||
          ''
        }
        editData={
          editingSubtopic
            ? {
                title: editingSubtopic.subtopic.title,
                description: editingSubtopic.subtopic.description || '',
                slug: editingSubtopic.subtopic.slug,
              }
            : undefined
        }
      />

      <ContentModal
        isOpen={contentModalOpen}
        onClose={() => {
          setContentModalOpen(false);
          setSelectedSubtopicForContent(null);
        }}
        onSave={handleCreateContent}
        subtopicTitle={selectedSubtopicForContent?.title || ''}
      />

      <QuizModal
        isOpen={quizModalOpen}
        onClose={() => {
          setQuizModalOpen(false);
          setEditingQuiz(null);
          setSelectedSubtopicForQuiz(null);
        }}
        onSave={editingQuiz ? handleUpdateQuiz : handleCreateQuiz}
        editData={editingQuiz || undefined}
        subtopicTitle={selectedSubtopicForQuiz?.title || ''}
      />

      <ExerciseModal
        isOpen={exerciseModalOpen}
        onClose={() => {
          setExerciseModalOpen(false);
          setEditingExercise(null);
          setSelectedSubtopicForExercise(null);
        }}
        onSave={editingExercise ? handleUpdateExercise : handleCreateExercise}
        editData={
          editingExercise
            ? {
                title: editingExercise.title,
                instructions: editingExercise.instructions || '',
                max_score: editingExercise.max_score,
              }
            : undefined
        }
        subtopicTitle={selectedSubtopicForExercise?.title || ''}
      />
    </>
  );
};

export default LearningFlow;
