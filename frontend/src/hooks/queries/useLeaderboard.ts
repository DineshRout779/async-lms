import { useQuery, keepPreviousData } from '@tanstack/react-query';
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

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  my_rank: MyRank | null;
  pagination: Pagination;
}

const STALE = 10 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 20;

export function useOverallLeaderboard(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery<LeaderboardData>({
    queryKey: ['leaderboard', 'overall', page, pageSize],
    queryFn: () =>
      apiClient
        .get('/students/leaderboard/overall', { params: { page, pageSize } })
        .then((r) => ({ ...r.data.data, pagination: r.data.pagination })),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

export function useWeeklyLeaderboard(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery<LeaderboardData>({
    queryKey: ['leaderboard', 'weekly', page, pageSize],
    queryFn: () =>
      apiClient
        .get('/students/leaderboard/weekly', { params: { page, pageSize } })
        .then((r) => ({ ...r.data.data, pagination: r.data.pagination })),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

export function useCollegeLeaderboard(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery<LeaderboardData>({
    queryKey: ['leaderboard', 'college', page, pageSize],
    queryFn: () =>
      apiClient
        .get('/students/leaderboard/college', { params: { page, pageSize } })
        .then((r) => ({ ...r.data.data, pagination: r.data.pagination }))
        .catch(() => ({
          leaderboard: [],
          my_rank: null,
          pagination: { page: 1, pageSize, totalCount: 0, totalPages: 1 },
        })),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}
