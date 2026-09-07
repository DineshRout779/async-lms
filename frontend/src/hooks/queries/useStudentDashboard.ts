import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api';
import type { Assignment, Subject } from '@/utils/types';

export function useMySubjects() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'subjects'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    };
    window.addEventListener('course-progress-updated', handleUpdate);
    return () => {
      window.removeEventListener('course-progress-updated', handleUpdate);
    };
  }, [queryClient]);

  return useQuery<Subject[]>({
    queryKey: ['student', 'subjects'],
    queryFn: () =>
      apiClient.get('/users/subjects').then((r) => r.data.data ?? []),
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
