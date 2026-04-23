import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import subjectsReducer from '../features/subjects/subjectSlice';
import learningFlowReducer from '../features/learningFlow/learningFlowSlice';
import lessonReducer from '../features/lesson/lessonSlice';
import notificationReducer from '../features/notifications/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    subjects: subjectsReducer,
    learningFlow: learningFlowReducer,
    lesson: lessonReducer,
    notifications: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
