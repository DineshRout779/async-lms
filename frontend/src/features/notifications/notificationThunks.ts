import { createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@/services/api';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async () => {
    const res = await apiClient.get('/notifications');
    return res.data as { data: any[]; unread_count: number };
  },
);

export const markRead = createAsyncThunk(
  'notifications/markRead',
  async (id: string) => {
    await apiClient.patch(`/notifications/${id}/read`);
  },
);

export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async () => {
    await apiClient.patch('/notifications/read-all');
  },
);

export const removeNotification = createAsyncThunk(
  'notifications/remove',
  async (id: string) => {
    await apiClient.delete(`/notifications/${id}`);
  },
);
