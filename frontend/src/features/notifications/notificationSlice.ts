import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchNotifications, markRead, markAllRead, removeNotification } from './notificationThunks';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  loading: false,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Push a real-time notification received via Socket.io
    pushNotification(state, action: PayloadAction<Notification>) {
      state.items.unshift(action.payload);
      if (!action.payload.is_read) state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.unreadCount = action.payload.unread_count;
      })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = false; })

      .addCase(markRead.fulfilled, (state, action) => {
        const id = action.meta.arg;
        const n = state.items.find((x) => x.id === id);
        if (n && !n.is_read) { n.is_read = true; state.unreadCount = Math.max(0, state.unreadCount - 1); }
      })

      .addCase(markAllRead.fulfilled, (state) => {
        state.items.forEach((n) => { n.is_read = true; });
        state.unreadCount = 0;
      })

      .addCase(removeNotification.fulfilled, (state, action) => {
        const id = action.meta.arg;
        const idx = state.items.findIndex((x) => x.id === id);
        if (idx !== -1) {
          if (!state.items[idx].is_read) state.unreadCount = Math.max(0, state.unreadCount - 1);
          state.items.splice(idx, 1);
        }
      });
  },
});

export const { pushNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
