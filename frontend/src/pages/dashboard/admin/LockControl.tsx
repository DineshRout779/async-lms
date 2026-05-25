import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Lock,
  Search,
  ShieldCheck,
  Unlock,
  Loader2,
  Users2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import apiClient from '@/services/api';
import type { College, Subject, SubjectListResponse } from '@/utils/types';

interface LockSubtopic {
  id: string;
  title: string;
  slug: string;
  order_index: number;
  content_type: 'video' | 'markdown' | 'external' | null;
  unlocked_count: number;
  completed_count: number;
  is_unlocked: boolean;
}

interface LockUnit {
  id: string;
  title: string;
  order_index: number;
  subtopics: LockSubtopic[];
}

interface LockTopic {
  id: string;
  title: string;
  order_index: number;
  units?: LockUnit[];
  subtopics: LockSubtopic[]; // Flattened for display
}

interface LockOverview {
  cohort_size: number;
  completion_rate: number;
  total_subtopics: number;
  completed_subtopics: number;
  topics: LockTopic[];
}

interface LockOverviewResponse {
  success: boolean;
  data: LockOverview;
}

interface LockBatchesResponse {
  success: boolean;
  data: number[];
}

const LockControl = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [batches, setBatches] = useState<number[]>([]);

  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const [overview, setOverview] = useState<LockOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [topicLoadingIds, setTopicLoadingIds] = useState<string[]>([]);
  const [subtopicLoadingIds, setSubtopicLoadingIds] = useState<string[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (selectedCollegeId !== 'all') params.collegeId = selectedCollegeId;
    if (selectedBatch !== 'all') params.batch = selectedBatch;
    if (selectedSubjectId) params.subjectId = selectedSubjectId;
    return params;
  }, [selectedCollegeId, selectedBatch, selectedSubjectId]);

  const fetchFilters = useCallback(async () => {
    try {
      setLoadingFilters(true);
      const [collegeRes, subjectRes] = await Promise.all([
        apiClient.get<{ data: College[] }>('/colleges'),
        apiClient.get<SubjectListResponse>('/subjects'),
      ]);

      setColleges(collegeRes.data.data);
      setSubjects(subjectRes.data.data);

      if (!selectedSubjectId && subjectRes.data.data.length > 0) {
        setSelectedSubjectId(subjectRes.data.data[0].id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load lock control filters'));
    } finally {
      setLoadingFilters(false);
    }
  }, [selectedSubjectId]);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await apiClient.get<LockBatchesResponse>(
        '/admin/lock-control/batches',
        {
          params:
            selectedCollegeId === 'all' ? {} : { collegeId: selectedCollegeId },
        },
      );
      setBatches(res.data.data);
      if (
        selectedBatch !== 'all' &&
        !res.data.data.includes(Number(selectedBatch))
      ) {
        setSelectedBatch('all');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load batches'));
    }
  }, [selectedCollegeId, selectedBatch]);

  const fetchOverview = useCallback(async () => {
    if (!selectedSubjectId) return;
    try {
      setLoadingOverview(true);
      const res = await apiClient.get<LockOverviewResponse>(
        '/admin/lock-control/overview',
        { params: filterParams },
      );
      const data = res.data.data;
      // Flatten units into subtopics for compatible display
      const transformedTopics = data.topics.map((topic) => ({
        ...topic,
        subtopics: topic.units
          ? topic.units.flatMap((u) => u.subtopics)
          : topic.subtopics || [],
      }));
      setOverview({ ...data, topics: transformedTopics });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load lock overview'));
    } finally {
      setLoadingOverview(false);
    }
  }, [filterParams, selectedSubjectId]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (!overview?.topics?.length) return;
    setExpandedTopics((prev) =>
      prev.length > 0 ? prev : [overview.topics[0].id],
    );
  }, [overview?.topics]);

  const stats = useMemo(() => {
    if (!overview) {
      return { lockedTopics: 0, unlockedTopics: 0, completionRate: 0 };
    }
    const unlockedTopics = overview.topics.filter((topic) =>
      topic.subtopics.length > 0
        ? topic.subtopics.every((subtopic) => subtopic.is_unlocked)
        : false,
    ).length;

    return {
      lockedTopics: overview.topics.length - unlockedTopics,
      unlockedTopics,
      completionRate: overview.completion_rate,
    };
  }, [overview]);

  const filteredTopics = useMemo(() => {
    if (!overview) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return overview.topics;

    return overview.topics
      .map((topic) => {
        const topicMatch = topic.title.toLowerCase().includes(query);
        const subtopics = topic.subtopics.filter((subtopic) =>
          subtopic.title.toLowerCase().includes(query),
        );
        if (topicMatch) return topic;
        if (subtopics.length > 0) {
          return { ...topic, subtopics };
        }
        return null;
      })
      .filter((topic): topic is LockTopic => Boolean(topic));
  }, [overview, searchQuery]);

  const handleTopicToggle = async (topicId: string, unlock: boolean) => {
    try {
      setTopicLoadingIds((prev) => [...prev, topicId]);
      await apiClient.post(
        `/admin/lock-control/topics/${topicId}/${unlock ? 'unlock' : 'lock'}`,
        null,
        { params: filterParams },
      );
      toast.success(unlock ? 'Topic unlocked' : 'Topic locked');
      await fetchOverview();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update topic lock'));
    } finally {
      setTopicLoadingIds((prev) => prev.filter((id) => id !== topicId));
    }
  };

  const handleSubtopicToggle = async (subtopicId: string, unlock: boolean) => {
    try {
      setSubtopicLoadingIds((prev) => [...prev, subtopicId]);
      await apiClient.post(
        `/admin/lock-control/subtopics/${subtopicId}/${unlock ? 'unlock' : 'lock'}`,
        null,
        { params: filterParams },
      );
      toast.success(unlock ? 'Subtopic unlocked' : 'Subtopic locked');
      await fetchOverview();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update subtopic lock'));
    } finally {
      setSubtopicLoadingIds((prev) => prev.filter((id) => id !== subtopicId));
    }
  };

  return (
    <div className='p-6 space-y-6 animate-in fade-in duration-500'>
      {/* Stats */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
        <Card className='border-none shadow-sm'>
          <CardContent className='p-5 flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-slate-500'>
                Batch Progress
              </p>
              <h3 className='text-2xl font-bold text-slate-900 mt-1'>
                {stats.completionRate}%
              </h3>
              <p className='text-xs text-slate-400 mt-1'>Completion Rate</p>
            </div>
            <div className='bg-blue-50 p-3 rounded-2xl'>
              <GraduationCap className='w-5 h-5 text-blue-600' />
            </div>
          </CardContent>
        </Card>
        <Card className='border-none shadow-sm'>
          <CardContent className='p-5 flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-red-500'>Locked Topics</p>
              <h3 className='text-2xl font-bold text-slate-900 mt-1'>
                {stats.lockedTopics}
              </h3>
              <p className='text-xs text-slate-400 mt-1'>
                Students cannot access
              </p>
            </div>
            <div className='bg-red-50 p-3 rounded-2xl'>
              <Lock className='w-5 h-5 text-red-500' />
            </div>
          </CardContent>
        </Card>
        <Card className='border-none shadow-sm'>
          <CardContent className='p-5 flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-emerald-600'>
                Unlocked Topics
              </p>
              <h3 className='text-2xl font-bold text-slate-900 mt-1'>
                {stats.unlockedTopics}
              </h3>
              <p className='text-xs text-slate-400 mt-1'>
                Available to students
              </p>
            </div>
            <div className='bg-emerald-50 p-3 rounded-2xl'>
              <Unlock className='w-5 h-5 text-emerald-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className='border-none shadow-sm overflow-hidden'>
        <div className='flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60'>
          <div className='bg-slate-100 p-2 rounded-xl'>
            <ShieldCheck className='w-4 h-4 text-slate-600' />
          </div>
          <div>
            <h3 className='text-sm font-bold text-slate-900'>Class Controls</h3>
            <p className='text-xs text-slate-400'>Manage topic access by cohort</p>
          </div>
        </div>

        <CardContent className='p-5'>
          <div className='flex flex-wrap items-end gap-4'>
            <div className='flex flex-col gap-1.5'>
              <label className='flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>
                <Building2 className='w-3 h-3' />
                College
              </label>
              <Select
                value={selectedCollegeId}
                onValueChange={setSelectedCollegeId}
                disabled={loadingFilters}
              >
                <SelectTrigger className='w-52 bg-white border-slate-200 shadow-xs'>
                  <SelectValue placeholder='Select college' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Colleges</SelectItem>
                  {colleges.map((college) => (
                    <SelectItem key={college.id} value={college.id}>
                      {college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-1.5'>
              <label className='flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>
                <Users2 className='w-3 h-3' />
                Batch
              </label>
              <Select
                value={selectedBatch}
                onValueChange={setSelectedBatch}
                disabled={loadingFilters}
              >
                <SelectTrigger className='w-36 bg-white border-slate-200 shadow-xs'>
                  <SelectValue placeholder='Select batch' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Batches</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch} value={String(batch)}>
                      Batch {batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-1.5'>
              <label className='flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>
                <BookOpen className='w-3 h-3' />
                Subject
              </label>
              <Select
                value={selectedSubjectId}
                onValueChange={setSelectedSubjectId}
                disabled={loadingFilters}
              >
                <SelectTrigger className='w-60 bg-white border-slate-200 shadow-xs'>
                  <SelectValue placeholder='Select subject' />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-1.5 flex-1 min-w-48'>
              <label className='flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>
                <Search className='w-3 h-3' />
                Search
              </label>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                <Input
                  placeholder='Find topic...'
                  className='pl-9 bg-white border-slate-200 shadow-xs'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topics */}
      {loadingOverview ? (
        <div className='flex items-center justify-center h-60'>
          <Loader2 className='w-8 h-8 animate-spin text-[#333D7C]' />
        </div>
      ) : !overview || filteredTopics.length === 0 ? (
        <Card className='border-none shadow-sm'>
          <CardContent className='p-16 text-center text-slate-400'>
            No topics found for this selection.
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-4'>
          {filteredTopics.map((topic) => {
            const isExpanded = expandedTopics.includes(topic.id);
            const unlockedSubtopics = topic.subtopics.filter(
              (subtopic) => subtopic.is_unlocked,
            ).length;
            const progress =
              topic.subtopics.length > 0
                ? Math.round((unlockedSubtopics / topic.subtopics.length) * 100)
                : 0;
            const fullyUnlocked =
              topic.subtopics.length > 0 &&
              topic.subtopics.every((subtopic) => subtopic.is_unlocked);
            const topicLoading = topicLoadingIds.includes(topic.id);

            return (
              <Card key={topic.id} className='border-none shadow-sm'>
                <CardContent className='p-0'>
                  <div className='flex flex-col gap-4 p-5 border-b border-slate-100'>
                    <div className='flex items-center justify-between gap-4'>
                      <div className='flex items-center gap-3'>
                        <button
                          className='text-slate-400 hover:text-slate-700 transition'
                          onClick={() =>
                            setExpandedTopics((prev) =>
                              prev.includes(topic.id)
                                ? prev.filter((id) => id !== topic.id)
                                : [...prev, topic.id],
                            )
                          }
                          aria-label='Toggle topic'
                        >
                          {isExpanded ? (
                            <ChevronDown className='w-5 h-5' />
                          ) : (
                            <ChevronRight className='w-5 h-5' />
                          )}
                        </button>
                        <div>
                          <p className='text-xs font-semibold tracking-widest text-slate-400'>
                            TOPIC: {topic.title.toUpperCase()}
                          </p>
                          <p className='text-sm text-slate-500'>
                            {unlockedSubtopics}/{topic.subtopics.length}{' '}
                            Subtopics Unlocked
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center gap-3'>
                        <div className='w-36 bg-slate-100 rounded-full h-2 overflow-hidden'>
                          <div
                            className='h-full bg-emerald-500'
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <button
                          disabled={topicLoading}
                          onClick={() => handleTopicToggle(topic.id, !fullyUnlocked)}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                            fullyUnlocked
                              ? 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'
                          }`}
                        >
                          {topicLoading ? (
                            <Loader2 className='w-3.5 h-3.5 animate-spin' />
                          ) : fullyUnlocked ? (
                            'Lock Unit'
                          ) : (
                            'Unlock Unit'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className='divide-y divide-slate-100'>
                      {topic.subtopics.map((subtopic) => {
                        const subtopicLoading = subtopicLoadingIds.includes(
                          subtopic.id,
                        );
                        const isUnlocked = subtopic.is_unlocked;

                        return (
                          <div
                            key={subtopic.id}
                            className='flex flex-col md:flex-row md:items-center justify-between gap-4 p-5'
                          >
                            <div className='flex items-center gap-4'>
                              <div className='bg-emerald-50 text-emerald-600 p-2 rounded-xl'>
                                <BookOpen className='w-4 h-4' />
                              </div>
                              <div>
                                <p className='font-semibold text-slate-900 text-sm'>
                                  {subtopic.title}
                                </p>
                                <div className='flex items-center gap-2 mt-1'>
                                  <Badge className='bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wide'>
                                    {subtopic.content_type === 'video'
                                      ? 'Video'
                                      : subtopic.content_type === 'external'
                                        ? 'Resource'
                                        : 'Reading'}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div className='flex items-center gap-4 justify-between md:justify-end'>
                              <div className='flex items-center gap-2 text-slate-500 text-sm'>
                                <Calendar className='w-4 h-4' />
                                <span>Schedule</span>
                              </div>
                              <div className='flex items-center gap-2'>
                                <span
                                  className={
                                    isUnlocked
                                      ? 'text-emerald-600 text-sm font-medium'
                                      : 'text-red-500 text-sm font-medium'
                                  }
                                >
                                  {isUnlocked ? 'Unlocked' : 'Locked'}
                                </span>
                                <Switch
                                  checked={isUnlocked}
                                  disabled={subtopicLoading}
                                  onCheckedChange={(checked) =>
                                    handleSubtopicToggle(subtopic.id, checked)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LockControl;
