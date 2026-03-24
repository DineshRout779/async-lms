import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  email?: string;
  college_name?: string;
  total_points: number;
  rank: number;
}

interface MyRank {
  rank: number;
  total_points: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  my_rank: MyRank | null;
}

const STALE = 10 * 60 * 1000;

export function useOverallLeaderboard() {
  return useQuery<LeaderboardData>({
    queryKey: ['leaderboard', 'overall'],
    queryFn: () =>
      apiClient.get('/students/leaderboard/overall').then((r) => r.data.data),
    staleTime: STALE,
  });
}

export function useWeeklyLeaderboard() {
  return useQuery<LeaderboardData>({
    queryKey: ['leaderboard', 'weekly'],
    queryFn: () =>
      apiClient.get('/students/leaderboard/weekly').then((r) => r.data.data),
    staleTime: STALE,
  });
}

export function useCollegeLeaderboard() {
  return useQuery<LeaderboardData>({
    queryKey: ['leaderboard', 'college'],
    queryFn: () =>
      apiClient
        .get('/students/leaderboard/college')
        .then((r) => r.data.data)
        .catch(() => ({ leaderboard: [], my_rank: null })),
    staleTime: STALE,
  });
}
