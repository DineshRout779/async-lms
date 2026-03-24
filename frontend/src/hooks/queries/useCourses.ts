import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api';
import type { Subject } from '@/utils/types';

export function useEnrolledCourses() {
  return useQuery<Subject[]>({
    queryKey: ['courses', 'enrolled'],
    queryFn: () =>
      apiClient.get('/users/subjects').then((r) => r.data.data ?? []),
  });
}

export function useAllCourses() {
  return useQuery<Subject[]>({
    queryKey: ['courses', 'all'],
    queryFn: () =>
      apiClient.get('/subjects/published').then((r) => r.data.data ?? []),
    staleTime: 15 * 60 * 1000,
  });
}

export function useEnrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: number | string) =>
      apiClient.post(`/students/subjects/${subjectId}/enroll`),
    onSuccess: () => {
      // Invalidate both lists so they refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'subjects'] });
    },
  });
}
