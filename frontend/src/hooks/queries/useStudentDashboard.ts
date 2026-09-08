import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api';
import type {
  Assignment,
  Subject,
  StudentAssignmentsOverviewResponse,
} from '@/utils/types';

export function useMySubjects() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'subjects'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    };
    window.addEventListener('course-progress-updated', handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'codeguru-progress-updated') {
        handleUpdate();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('course-progress-updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [queryClient]);

  return useQuery<Subject[]>({
    queryKey: ['student', 'subjects'],
    queryFn: () =>
      apiClient.get('/users/subjects').then((r) => r.data.data ?? []),
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useMyAssignments() {
  return useQuery<Assignment[]>({
    queryKey: ['student', 'assignments'],
    queryFn: () =>
      apiClient.get('/students/assignments').then((r) => r.data.data ?? []),
  });
}

export function useMyOverallRank() {
  return useQuery<number | null>({
    queryKey: ['leaderboard', 'overall', 'myRank'],
    queryFn: () =>
      apiClient
        .get('/students/leaderboard/overall')
        .then((r) => r.data.data?.my_rank?.rank ?? null),
    staleTime: 10 * 60 * 1000,
  });
}

export function useStudentAssignmentsOverview() {
  return useQuery<StudentAssignmentsOverviewResponse>({
    queryKey: ['student', 'assignments', 'overview'],
    queryFn: () =>
      apiClient
        .get('/students/assignments/overview')
        .then((r) => r.data ?? { success: true, data: [], counts: { total: 0, pending: 0, pending_evaluation: 0, evaluated: 0 } }),
  });
}
