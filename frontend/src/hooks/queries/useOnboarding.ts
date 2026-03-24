import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api';

interface College {
  id: number | string;
  name: string;
}

interface Subject {
  id: number;
  name: string;
}

export function useColleges() {
  return useQuery<College[]>({
    queryKey: ['colleges'],
    queryFn: () =>
      apiClient.get('/colleges').then((r) => r.data.data ?? r.data),
    staleTime: Infinity, // colleges list almost never changes
  });
}

export function usePublishedSubjects() {
  return useQuery<Subject[]>({
    queryKey: ['subjects', 'published'],
    queryFn: () =>
      apiClient.get('/subjects/published').then((r) => r.data.data ?? []),
    staleTime: 15 * 60 * 1000,
  });
}
