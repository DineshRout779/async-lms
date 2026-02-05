import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@/services/api';
import type { Subject, SubjectListResponse } from '@/utils/types';

interface SubjectsState {
  items: Subject[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: SubjectsState = {
  items: [],
  status: 'idle',
  error: null,
};

// Async Thunks
export const fetchSubjects = createAsyncThunk(
  'subjects/fetchSubjects',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<SubjectListResponse>('/subjects');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch subjects',
      );
    }
  },
);

export const createSubject = createAsyncThunk(
  'subjects/createSubject',
  async (
    data: { name: string; slug: string; description: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.post('/subjects', data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create subject',
      );
    }
  },
);

export const deleteSubject = createAsyncThunk(
  'subjects/deleteSubject',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/subjects/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete subject',
      );
    }
  },
);

const subjectSlice = createSlice({
  name: 'subjects',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Subjects
      .addCase(fetchSubjects.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSubjects.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchSubjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Create Subject
      .addCase(createSubject.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // Delete Subject
      .addCase(deleteSubject.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (subject) => subject.id !== action.payload,
        );
      });
  },
});

export default subjectSlice.reducer;
