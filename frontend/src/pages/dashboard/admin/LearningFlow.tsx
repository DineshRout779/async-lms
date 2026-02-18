import React, { useState, useEffect } from 'react';
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
  ListChecks,
  Code,
  FolderOpen,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';
import type {
  Exercise,
  Quiz,
  LessonContent,
  Subject,
  Subtopic,
  Unit,
  Topic,
} from '@/utils/types';
import TopicModal from '@/components/common/admin/TopicModal';
import UnitModal from '@/components/common/admin/UnitModal';
import SubtopicModal from '@/components/common/admin/SubTopicModal';
import QuizModal from '@/components/common/admin/QuizModal';
import ExerciseModal from '@/components/common/admin/ExerciseModal';
import { QuizQuestionsList } from '@/components/common/admin/QuizQuestions';
import ContentModal from '@/components/common/admin/ContentModal';
import { isAxiosError } from 'axios';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchSubjects } from '@/features/subjects/subjectSlice';
import {
  fetchCourseStructure,
  setActiveSubject,
  toggleTopicExpansion,
  toggleUnitExpansion,
  toggleSubtopicExpansion,
  setStructure,
} from '@/features/learningFlow/learningFlowSlice';

const LearningFlow: React.FC = () => {
  const dispatch = useAppDispatch();

  // Redux State
  const { items: subjects, status: subjectsStatus } = useAppSelector(
    (state) => state.subjects,
  );
  const {
    structure,
    activeSubjectId,
    expandedTopics,
    expandedUnits,
    expandedSubtopics,
    status: structureStatus,
  } = useAppSelector((state) => state.learningFlow);

  const selectedSubject =
    subjects.find((s) => s.id === activeSubjectId) ||
    subjects.find((s) => s.slug === activeSubjectId) || // minimal Fallback
    null;

  const loading = subjectsStatus === 'loading' || structureStatus === 'loading';
  const fetchingStructure = structureStatus === 'loading';

  // Modal states
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [subtopicModalOpen, setSubtopicModalOpen] = useState(false);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);

  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editingSubtopic, setEditingSubtopic] = useState<{
    subtopic: Subtopic;
    unitId: string;
  } | null>(null);
  const [selectedTopicForUnit, setSelectedTopicForUnit] =
    useState<Topic | null>(null);
  const [selectedUnitForSubtopic, setSelectedUnitForSubtopic] =
    useState<Unit | null>(null);
  const [selectedSubtopicForContent, setSelectedSubtopicForContent] =
    useState<Subtopic | null>(null);
  const [selectedSubtopicForQuiz, setSelectedSubtopicForQuiz] =
    useState<Subtopic | null>(null);
  const [selectedSubtopicForExercise, setSelectedSubtopicForExercise] =
    useState<Subtopic | null>(null);
  const [selectedUnitForExercise, setSelectedUnitForExercise] =
    useState<Unit | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingContent, setEditingContent] = useState<LessonContent | null>(
    null,
  );
  const [questionsModalOpen, setQuestionsModalOpen] = useState(false);
  const [selectedQuizForQuestions, setSelectedQuizForQuestions] =
    useState<Quiz | null>(null);
  const [
    selectedSubtopicTitleForQuestions,
    setSelectedSubtopicTitleForQuestions,
  ] = useState<string>('');

  // 1. Initial Load: Get all subjects
  useEffect(() => {
    dispatch(fetchSubjects());
  }, [dispatch]);

  // 2. Load structure when subjects load or active subject changes
  useEffect(() => {
    if (subjects.length > 0 && !activeSubjectId) {
      // Default to first subject if none selected
      dispatch(setActiveSubject(subjects[0].id));
      dispatch(fetchCourseStructure(subjects[0].slug));
    }
  }, [subjects, activeSubjectId, dispatch]);

  // Toggle topic expansion
  const toggleTopic = (topicId: string) => {
    dispatch(toggleTopicExpansion(topicId));
  };

  // Toggle unit expansion
  const toggleUnit = (unitId: string) => {
    dispatch(toggleUnitExpansion(unitId));
  };

  // Toggle subtopic expansion
  const toggleSubtopic = (subtopicId: string) => {
    dispatch(toggleSubtopicExpansion(subtopicId));
  };

  const refreshStructure = async () => {
    if (selectedSubject) {
      await dispatch(fetchCourseStructure(selectedSubject.slug));
    }
  };

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
        refreshStructure();
        setTopicModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create topic', error);
      toast.error('Failed to create topic');
    }
  };

  // Create Unit
  const handleCreateUnit = async (data: {
    title: string;
    description: string;
    slug: string;
  }) => {
    if (!selectedTopicForUnit) return;

    try {
      const response = await apiClient.post('/admin/units', {
        topic_id: selectedTopicForUnit.id,
        title: data.title,
        description: data.description,
        slug: data.slug,
        order_index: selectedTopicForUnit.units?.length || 0,
      });

      if (response.data.success) {
        toast.success('Unit created successfully');
        refreshStructure();
        setUnitModalOpen(false);
        setSelectedTopicForUnit(null);
      }
    } catch (error) {
      console.error('Failed to create unit', error);
      toast.error('Failed to create unit');
    }
  };

  // Update Unit
  const handleUpdateUnit = async (data: {
    title: string;
    description: string;
    slug: string;
  }) => {
    if (!editingUnit) return;

    try {
      const response = await apiClient.put(`/admin/units/${editingUnit.id}`, {
        title: data.title,
        description: data.description,
        slug: data.slug,
      });

      if (response.data.success) {
        toast.success('Unit updated successfully');
        refreshStructure();
        setUnitModalOpen(false);
        setEditingUnit(null);
      }
    } catch (error) {
      console.error('Failed to update unit', error);
      toast.error('Failed to update unit');
    }
  };

  // Delete Unit
  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      const response = await apiClient.delete(`/admin/units/${unitId}`);
      if (response.data.success) {
        toast.success('Unit deleted successfully');
        refreshStructure();
      }
    } catch (error) {
      console.error('Failed to delete unit', error);
      toast.error('Failed to delete unit');
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
        refreshStructure();
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
        refreshStructure();
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
    if (!selectedUnitForSubtopic) return;

    try {
      const response = await apiClient.post('/admin/subtopics', {
        unit_id: selectedUnitForSubtopic.id,
        title: data.title,
        description: data.description,
        slug: data.slug,
        order_index: selectedUnitForSubtopic.subtopics.length,
      });

      if (response.data.success) {
        toast.success('Subtopic created successfully');
        refreshStructure();
        setSubtopicModalOpen(false);
        setSelectedUnitForSubtopic(null);
      }
    } catch (error: unknown) {
      console.error('Failed to create subtopic', error);
      if (isAxiosError(error) && error.response?.status === 409) {
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
        },
      );

      if (response.data.success) {
        toast.success('Subtopic updated successfully');
        refreshStructure();
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
        refreshStructure();
      }
    } catch (error) {
      console.error('Failed to delete subtopic', error);
      toast.error('Failed to delete subtopic');
    }
  };

  const uploadMarkdown = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<{ success: boolean; url: string }>(
      '/admin/lesson-content/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return res.data.url;
  };

  // Create Lesson Content
  const handleCreateContent = async (data: {
    content_type: 'markdown' | 'video' | 'external';
    markdown_path: string;
    estimated_read_time?: number;
    video_url?: string;
    file?: File | null;
  }) => {
    if (!selectedSubtopicForContent) return;

    try {
      let markdownPath = data.markdown_path;
      if (data.file) {
        markdownPath = await uploadMarkdown(data.file);
      }

      const response = await apiClient.post('/admin/lesson-content', {
        subtopic_id: selectedSubtopicForContent.id,
        content_type: data.content_type,
        markdown_path: markdownPath,
        estimated_read_time: data.estimated_read_time,
        is_published: false,
        video_url: data.video_url,
      });

      if (response.data.success) {
        toast.success('Lesson content created successfully');
        await refreshStructure();
        setContentModalOpen(false);
        setSelectedSubtopicForContent(null);
        setEditingContent(null);
      }
    } catch (error) {
      console.error('Failed to create content', error);
      toast.error('Failed to create lesson content');
    }
  };

  // Update Lesson Content
  const handleUpdateContent = async (data: {
    content_type: 'markdown' | 'video' | 'external';
    markdown_path: string;
    estimated_read_time?: number;
    video_url?: string;
    file?: File | null;
  }) => {
    if (!editingContent) return;

    try {
      let markdownPath = data.markdown_path;
      if (!data.file) {
        markdownPath = editingContent.markdown_path;
      } else if (data.file) {
        markdownPath = await uploadMarkdown(data.file);
      }

      const response = await apiClient.put(
        `/admin/lesson-content/${editingContent.id}`,
        {
          content_type: data.content_type,
          markdown_path: markdownPath,
          estimated_read_time: data.estimated_read_time,
          video_url: data.video_url,
        },
      );

      if (response.data.success) {
        toast.success('Lesson content updated successfully');
        await refreshStructure();
        setContentModalOpen(false);
        setSelectedSubtopicForContent(null);
        setEditingContent(null);
      }
    } catch (error) {
      console.error('Failed to update content', error);
      toast.error('Failed to update lesson content');
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const response = await apiClient.delete(
        `/admin/lesson-content/${contentId}`,
      );
      if (response.data.success) {
        toast.success('Lesson content deleted successfully');
        await refreshStructure();
      }
    } catch (error) {
      console.error('Failed to delete content', error);
      toast.error('Failed to delete lesson content');
    }
  };

  const handleTogglePublishContent = async (content: LessonContent) => {
    try {
      const response = await apiClient.put(
        `/admin/lesson-content/${content.id}/publish`,
        {
          is_published: !content.is_published,
        },
      );

      if (response.data.success) {
        toast.success(
          content.is_published ? 'Content unpublished' : 'Content published',
        );
        await refreshStructure();
      }
    } catch (error) {
      console.error('Failed to toggle publish', error);
      toast.error('Failed to update publish status');
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
        await refreshStructure();
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
    if (!selectedSubtopicForExercise && !selectedUnitForExercise) return;

    try {
      const response = await apiClient.post('/admin/exercises', {
        subtopic_id: selectedSubtopicForExercise?.id || null,
        unit_id: selectedUnitForExercise?.id || null,
        title: data.title,
        instructions: data.instructions,
        max_score: data.max_score,
      });

      if (response.data.success) {
        toast.success('Exercise created successfully');
        await refreshStructure();
        setExerciseModalOpen(false);
        setSelectedSubtopicForExercise(null);
        setSelectedUnitForExercise(null);
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
      refreshStructure();
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
      refreshStructure();
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
      refreshStructure();
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
      refreshStructure();
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

      dispatch(setStructure(newStructure));
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

      dispatch(setStructure(newStructure));
      toast.success('Topic order updated');
    } catch (error) {
      console.error('Failed to reorder', error);
      toast.error('Failed to update order');
    }
  };

  // Reorder Units (Simplified: requires refreshing structure usually, or complex redux state update.
  // For now we will rely on refreshStructure after API call, or just simplistic update if possible.
  // Since Units are nested, we need to find the topic first.
  // To avoid complex deep-cloning and updating of Redux state manually for nested items,
  // we will just call API and refresh for now, which is safer.)
  const handleMoveUnitUp = async (unitIndex: number, units: Unit[]) => {
    if (unitIndex === 0) return;

    const currentUnit = units[unitIndex];
    const prevUnit = units[unitIndex - 1];

    try {
      await Promise.all([
        apiClient.put(`/admin/units/${prevUnit.id}`, {
          order_index: unitIndex,
        }),
        apiClient.put(`/admin/units/${currentUnit.id}`, {
          order_index: unitIndex - 1,
        }),
      ]);
      toast.success('Unit order updated');
      refreshStructure();
    } catch (error) {
      console.error('Failed to reorder', error);
      toast.error('Failed to update order');
    }
  };

  const handleMoveUnitDown = async (unitIndex: number, units: Unit[]) => {
    if (unitIndex === units.length - 1) return;

    const currentUnit = units[unitIndex];
    const nextUnit = units[unitIndex + 1];

    try {
      await Promise.all([
        apiClient.put(`/admin/units/${currentUnit.id}`, {
          order_index: unitIndex + 1,
        }),
        apiClient.put(`/admin/units/${nextUnit.id}`, {
          order_index: unitIndex,
        }),
      ]);
      toast.success('Unit order updated');
      refreshStructure();
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
                          <div
                            onClick={() => toggleTopic(topic.id)}
                            className='flex items-center gap-3 hover:cursor-pointer'
                          >
                            <button className='text-slate-400 hover:text-slate-600'>
                              {expandedTopics.includes(topic.id) ? (
                                <ChevronDown className='h-4 w-4' />
                              ) : (
                                <ChevronRight className='h-4 w-4' />
                              )}
                            </button>
                            <span className='font-semibold text-slate-800'>
                              {topic.title}
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

                        {/* Units - only show when expanded */}
                        {expandedTopics.includes(topic.id) && (
                          <div className='space-y-4 p-4'>
                            {topic.units?.length === 0 ? (
                              <div className='rounded-lg border-2 border-dashed border-slate-200 bg-white py-8 text-center'>
                                <FolderOpen className='mx-auto h-8 w-8 text-slate-300' />
                                <p className='mt-2 text-xs text-slate-400'>
                                  No units yet
                                </p>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => {
                                    setSelectedTopicForUnit(topic);
                                    setUnitModalOpen(true);
                                  }}
                                  className='mt-2 text-indigo-600 hover:bg-indigo-50'
                                >
                                  <Plus className='mr-1 h-3 w-3' /> Add Unit
                                </Button>
                              </div>
                            ) : (
                              <>
                                {topic.units?.map(
                                  (unit: Unit, uIndex: number) => (
                                    <div
                                      key={unit.id}
                                      className='overflow-hidden rounded-lg border border-slate-200 bg-white'
                                    >
                                      <div className='flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-3'>
                                        <div
                                          onClick={() => toggleUnit(unit.id)}
                                          className='flex cursor-pointer items-center gap-3'
                                        >
                                          <button className='text-slate-400 hover:text-slate-600'>
                                            {expandedUnits.includes(unit.id) ? (
                                              <ChevronDown className='h-4 w-4' />
                                            ) : (
                                              <ChevronRight className='h-4 w-4' />
                                            )}
                                          </button>
                                          <div className='flex items-center gap-2'>
                                            <Layout className='h-4 w-4 text-slate-400' />
                                            <span className='font-medium text-slate-700'>
                                              Unit {uIndex + 1} - {unit.title}
                                            </span>
                                          </div>
                                          {unit.description && (
                                            <span className='text-xs text-slate-500'>
                                              • {unit.description}
                                            </span>
                                          )}
                                        </div>
                                        <div className='flex items-center gap-2'>
                                          <div className='flex items-center gap-1 text-slate-300'>
                                            <ArrowUp
                                              onClick={() =>
                                                handleMoveUnitUp(
                                                  uIndex,
                                                  topic.units,
                                                )
                                              }
                                              className={`h-3 w-3 ${
                                                uIndex === 0
                                                  ? 'cursor-not-allowed opacity-30'
                                                  : 'cursor-pointer hover:text-slate-600'
                                              }`}
                                            />
                                            <ArrowDown
                                              onClick={() =>
                                                handleMoveUnitDown(
                                                  uIndex,
                                                  topic.units,
                                                )
                                              }
                                              className={`h-3 w-3 ${
                                                uIndex ===
                                                (topic.units?.length || 0) - 1
                                                  ? 'cursor-not-allowed opacity-30'
                                                  : 'cursor-pointer hover:text-slate-600'
                                              }`}
                                            />
                                          </div>
                                          <div className='mx-1 h-3 w-px bg-slate-200' />
                                          <div className='flex items-center gap-2'>
                                            <button
                                              onClick={() => {
                                                setSelectedUnitForExercise(
                                                  unit,
                                                );
                                                setExerciseModalOpen(true);
                                              }}
                                              className='rounded p-1 text-slate-400 hover:bg-white hover:text-indigo-600'
                                              title='Add unit-level exercise'
                                            >
                                              <Code className='h-3 w-3' />
                                            </button>
                                            <div className='mx-1 h-3 w-px bg-slate-200' />
                                            <div className='flex items-center gap-1'>
                                              <button
                                                onClick={() => {
                                                  setEditingUnit(unit);
                                                  setUnitModalOpen(true);
                                                }}
                                                className='rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                                              >
                                                <Edit2 className='h-3 w-3' />
                                              </button>
                                              <button
                                                onClick={() =>
                                                  handleDeleteUnit(unit.id)
                                                }
                                                className='rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500'
                                              >
                                                <Trash2 className='h-3 w-3' />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Unit Level Exercises */}
                                      {expandedUnits.includes(unit.id) &&
                                        unit.exercises &&
                                        unit.exercises.length > 0 && (
                                          <div className='border-b border-slate-100 bg-indigo-50/30 p-2'>
                                            <div className='flex flex-wrap gap-2'>
                                              {unit.exercises.map((ex) => (
                                                <div
                                                  key={ex.id}
                                                  className='flex items-center gap-2 rounded border border-indigo-100 bg-white px-2 py-1 text-xs text-indigo-700 shadow-sm'
                                                >
                                                  <Code className='h-3 w-3' />
                                                  <span>{ex.title}</span>
                                                  <div className='flex items-center gap-1 ml-1 pl-1 border-l border-indigo-100'>
                                                    <button
                                                      onClick={() => {
                                                        setEditingExercise(ex);
                                                        setExerciseModalOpen(
                                                          true,
                                                        );
                                                      }}
                                                      className='p-0.5 hover:text-indigo-900'
                                                    >
                                                      <Edit2 className='h-2.5 w-2.5' />
                                                    </button>
                                                    <button
                                                      onClick={() =>
                                                        handleDeleteExercise(
                                                          ex.id,
                                                        )
                                                      }
                                                      className='p-0.5 hover:text-red-600'
                                                    >
                                                      <Trash2 className='h-2.5 w-2.5' />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                      {/* Subtopics */}
                                      {expandedUnits.includes(unit.id) && (
                                        <div className='space-y-2 p-3'>
                                          {unit.subtopics?.length === 0 ? (
                                            <div className='rounded border border-dashed border-slate-200 py-4 text-center'>
                                              <p className='text-xs text-slate-400'>
                                                No subtopics yet
                                              </p>
                                              <Button
                                                variant='ghost'
                                                size='sm'
                                                onClick={() => {
                                                  setSelectedUnitForSubtopic(
                                                    unit,
                                                  );
                                                  setSubtopicModalOpen(true);
                                                }}
                                                className='mt-1 h-6 text-xs text-indigo-600 hover:bg-indigo-50'
                                              >
                                                <Plus className='mr-1 h-3 w-3' />{' '}
                                                Add Subtopic
                                              </Button>
                                            </div>
                                          ) : (
                                            <>
                                              {unit.subtopics.map(
                                                (sub: Subtopic) => (
                                                  <div
                                                    key={sub.id}
                                                    className='space-y-2'
                                                  >
                                                    <div className='group flex items-center justify-between rounded border border-slate-100 bg-white p-2 text-sm shadow-sm transition-all hover:border-indigo-100'>
                                                      <div className='flex flex-1 items-center gap-3'>
                                                        <button
                                                          onClick={() =>
                                                            toggleSubtopic(
                                                              sub.id,
                                                            )
                                                          }
                                                          className='text-slate-400 hover:text-slate-600'
                                                        >
                                                          {expandedSubtopics.includes(
                                                            sub.id,
                                                          ) ? (
                                                            <ChevronDown className='h-3 w-3' />
                                                          ) : (
                                                            <ChevronRight className='h-3 w-3' />
                                                          )}
                                                        </button>
                                                        <FileText className='h-4 w-4 text-slate-400' />
                                                        <div className='flex-1'>
                                                          <span className='font-medium text-slate-700'>
                                                            {sub.title}
                                                          </span>
                                                          {sub.description && (
                                                            <span className='ml-2 text-xs text-slate-400'>
                                                              {sub.description}
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                                                        <button
                                                          onClick={() => {
                                                            setEditingSubtopic({
                                                              subtopic: sub,
                                                              unitId: unit.id,
                                                            });
                                                            setSubtopicModalOpen(
                                                              true,
                                                            );
                                                          }}
                                                          className='rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                                                        >
                                                          <Edit2 className='h-3 w-3' />
                                                        </button>
                                                        <button
                                                          onClick={() =>
                                                            handleDeleteSubtopic(
                                                              sub.id,
                                                            )
                                                          }
                                                          className='rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500'
                                                        >
                                                          <Trash2 className='h-3 w-3' />
                                                        </button>
                                                      </div>
                                                    </div>

                                                    {/* Subtopic Content (Lessons, Quiz, etc) */}
                                                    {expandedSubtopics.includes(
                                                      sub.id,
                                                    ) && (
                                                      <div className='ml-6 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3'>
                                                        <div className='flex gap-2 mb-2'>
                                                          <button
                                                            onClick={() => {
                                                              setEditingContent(
                                                                null,
                                                              );
                                                              setSelectedSubtopicForContent(
                                                                sub,
                                                              );
                                                              setContentModalOpen(
                                                                true,
                                                              );
                                                            }}
                                                            className='flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:border-indigo-300 hover:bg-indigo-50'
                                                          >
                                                            <Plus className='h-3 w-3' />
                                                            Add Content
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              setSelectedSubtopicForQuiz(
                                                                sub,
                                                              );
                                                              setQuizModalOpen(
                                                                true,
                                                              );
                                                            }}
                                                            className='flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:border-indigo-300 hover:bg-indigo-50'
                                                          >
                                                            <ListChecks className='h-3 w-3' />
                                                            Quiz
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              setSelectedSubtopicForExercise(
                                                                sub,
                                                              );
                                                              setExerciseModalOpen(
                                                                true,
                                                              );
                                                            }}
                                                            className='flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:border-indigo-300 hover:bg-indigo-50'
                                                          >
                                                            <Code className='h-3 w-3' />
                                                            Exercise
                                                          </button>
                                                        </div>

                                                        {/* Lesson Content List */}
                                                        {sub.lesson_content?.map(
                                                          (content) => (
                                                            <div
                                                              key={content.id}
                                                              className='flex items-center justify-between rounded-md border bg-white p-2 text-xs'
                                                            >
                                                              <div className='flex items-center gap-2'>
                                                                <FileText className='h-3 w-3 text-slate-400' />
                                                                <div>
                                                                  <div className='font-medium text-slate-700'>
                                                                    {content.content_type ===
                                                                    'markdown'
                                                                      ? 'Markdown Content'
                                                                      : content.content_type ===
                                                                          'video'
                                                                        ? 'Video Lesson'
                                                                        : 'External Link'}
                                                                  </div>
                                                                  <div className='text-[10px] text-slate-400'>
                                                                    {content.content_type ===
                                                                    'markdown'
                                                                      ? content.markdown_path
                                                                          ?.split(
                                                                            '/',
                                                                          )
                                                                          .pop()
                                                                      : content.video_url}
                                                                  </div>
                                                                </div>
                                                              </div>
                                                              <div className='flex items-center gap-2'>
                                                                <button
                                                                  onClick={() =>
                                                                    handleTogglePublishContent(
                                                                      content,
                                                                    )
                                                                  }
                                                                  className='rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                                                                  title={
                                                                    content.is_published
                                                                      ? 'Unpublish content'
                                                                      : 'Publish content'
                                                                  }
                                                                >
                                                                  {content.is_published
                                                                    ? 'Unpublish'
                                                                    : 'Publish'}
                                                                </button>
                                                                <div className='flex items-center gap-1'>
                                                                  <button
                                                                    onClick={() => {
                                                                      setEditingContent(
                                                                        content,
                                                                      );
                                                                      setSelectedSubtopicForContent(
                                                                        sub,
                                                                      );
                                                                      setContentModalOpen(
                                                                        true,
                                                                      );
                                                                    }}
                                                                    className='p-1 text-slate-400 hover:text-indigo-600'
                                                                  >
                                                                    <Edit2 className='h-3 w-3' />
                                                                  </button>
                                                                  <button
                                                                    onClick={() =>
                                                                      handleDeleteContent(
                                                                        content.id,
                                                                      )
                                                                    }
                                                                    className='p-1 text-slate-400 hover:text-red-500'
                                                                  >
                                                                    <Trash2 className='h-3 w-3' />
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          ),
                                                        )}

                                                        {/* Quizzes List */}
                                                        {sub.quizzes?.map(
                                                          (quiz, qIndex) => (
                                                            <div
                                                              key={quiz.id}
                                                              className='flex items-center justify-between rounded-md border bg-white p-2 text-xs'
                                                            >
                                                              <div className='flex items-center gap-2'>
                                                                <ListChecks className='h-3 w-3 text-indigo-500' />
                                                                <span className='font-medium text-slate-700'>
                                                                  Quiz{' '}
                                                                  {qIndex + 1}
                                                                </span>
                                                              </div>
                                                              <div className='flex items-center gap-1'>
                                                                <button
                                                                  onClick={() => {
                                                                    setSelectedQuizForQuestions(
                                                                      quiz,
                                                                    );
                                                                    setSelectedSubtopicTitleForQuestions(
                                                                      sub.title,
                                                                    );
                                                                    setQuestionsModalOpen(
                                                                      true,
                                                                    );
                                                                  }}
                                                                  className='rounded px-2 py-0.5 text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                                                >
                                                                  Questions
                                                                </button>
                                                                <button
                                                                  onClick={() => {
                                                                    setEditingQuiz(
                                                                      quiz,
                                                                    );
                                                                    setSelectedSubtopicForQuiz(
                                                                      sub,
                                                                    );
                                                                    setQuizModalOpen(
                                                                      true,
                                                                    );
                                                                  }}
                                                                  className='p-1 text-slate-400 hover:text-indigo-600'
                                                                >
                                                                  <Edit2 className='h-3 w-3' />
                                                                </button>
                                                                <button
                                                                  onClick={() =>
                                                                    handleDeleteQuiz(
                                                                      quiz.id,
                                                                    )
                                                                  }
                                                                  className='p-1 text-slate-400 hover:text-red-500'
                                                                >
                                                                  <Trash2 className='h-3 w-3' />
                                                                </button>
                                                              </div>
                                                            </div>
                                                          ),
                                                        )}

                                                        {/* Exercises List */}
                                                        {sub.exercises?.map(
                                                          (exercise) => (
                                                            <div
                                                              key={exercise.id}
                                                              className='flex items-center justify-between rounded-md border bg-white p-2 text-xs'
                                                            >
                                                              <div className='flex items-center gap-2'>
                                                                <Code className='h-3 w-3 text-emerald-500' />
                                                                <span className='font-medium text-slate-700'>
                                                                  {
                                                                    exercise.title
                                                                  }
                                                                </span>
                                                              </div>
                                                              <div className='flex items-center gap-1'>
                                                                <button
                                                                  onClick={() => {
                                                                    setEditingExercise(
                                                                      exercise,
                                                                    );
                                                                    setSelectedSubtopicForExercise(
                                                                      sub,
                                                                    );
                                                                    setExerciseModalOpen(
                                                                      true,
                                                                    );
                                                                  }}
                                                                  className='p-1 text-slate-400 hover:text-indigo-600'
                                                                >
                                                                  <Edit2 className='h-3 w-3' />
                                                                </button>
                                                                <button
                                                                  onClick={() =>
                                                                    handleDeleteExercise(
                                                                      exercise.id,
                                                                    )
                                                                  }
                                                                  className='p-1 text-slate-400 hover:text-red-500'
                                                                >
                                                                  <Trash2 className='h-3 w-3' />
                                                                </button>
                                                              </div>
                                                            </div>
                                                          ),
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                ),
                                              )}
                                              <Button
                                                variant='ghost'
                                                size='sm'
                                                onClick={() => {
                                                  setSelectedUnitForSubtopic(
                                                    unit,
                                                  );
                                                  setSubtopicModalOpen(true);
                                                }}
                                                className='w-full justify-center border border-dashed border-slate-200 text-xs text-slate-400 hover:bg-slate-50'
                                              >
                                                <Plus className='mr-1 h-3 w-3' />{' '}
                                                Add Subtopic
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ),
                                )}
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => {
                                    setSelectedTopicForUnit(topic);
                                    setUnitModalOpen(true);
                                  }}
                                  className='w-full justify-center border border-dashed border-slate-200 py-4 text-sm text-slate-500 hover:bg-slate-50'
                                >
                                  <Plus className='mr-1 h-4 w-4' /> Add Another
                                  Unit
                                </Button>
                              </>
                            )}
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
                  onChange={(e) => {
                    const subject = subjects.find(
                      (s) => s.slug === e.target.value,
                    );
                    if (subject) {
                      dispatch(setActiveSubject(subject.slug));
                    }
                  }}
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
                        (sum, topic) =>
                          sum +
                          (topic.units?.reduce(
                            (uSum, unit) =>
                              uSum + (unit.subtopics?.length || 0),
                            0,
                          ) || 0),
                        0,
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

      <UnitModal
        isOpen={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        onSave={(data) => {
          if (editingUnit) {
            handleUpdateUnit(data);
          } else {
            handleCreateUnit(data);
          }
        }}
        topicTitle={selectedTopicForUnit?.title || ''}
        editData={
          editingUnit
            ? {
                title: editingUnit.title,
                description: editingUnit.description || '',
                slug: editingUnit.slug,
              }
            : undefined
        }
      />

      <SubtopicModal
        isOpen={subtopicModalOpen}
        onClose={() => setSubtopicModalOpen(false)}
        onSave={(data) => {
          if (editingSubtopic) {
            handleUpdateSubtopic(data);
          } else {
            handleCreateSubtopic(data);
          }
        }}
        topicTitle={selectedUnitForSubtopic?.title || ''}
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
          setEditingContent(null);
        }}
        onSave={editingContent ? handleUpdateContent : handleCreateContent}
        subtopicTitle={selectedSubtopicForContent?.title || ''}
        editData={editingContent || undefined}
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
        subtopicTitle={
          selectedSubtopicForExercise?.title ||
          selectedUnitForExercise?.title ||
          ''
        }
      />

      {questionsModalOpen && selectedQuizForQuestions && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-lg font-bold text-slate-900'>
                Manage Quiz Questions
              </h3>
              <button
                onClick={() => {
                  setQuestionsModalOpen(false);
                  setSelectedQuizForQuestions(null);
                  setSelectedSubtopicTitleForQuestions('');
                }}
                className='text-slate-400 hover:text-slate-600'
                title='Close'
              >
                <XCircle className='h-5 w-5' />
              </button>
            </div>

            <QuizQuestionsList
              quizId={selectedQuizForQuestions.id}
              subtopicTitle={selectedSubtopicTitleForQuestions}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default LearningFlow;
