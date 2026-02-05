import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import apiClient from '@/services/api';
import type { Topic, SubjectDetailResponse } from '@/utils/types';

interface LearningFlowState {
  structure: Topic[];
  activeSubjectId: string | null;
  expandedTopics: string[]; // Store IDs
  expandedSubtopics: string[]; // Store IDs
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: LearningFlowState = {
  structure: [],
  activeSubjectId: null,
  expandedTopics: [],
  expandedSubtopics: [],
  status: 'idle',
  error: null,
};

// Async Thunks
export const fetchCourseStructure = createAsyncThunk(
  'learningFlow/fetchStructure',
  async (slug: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<SubjectDetailResponse>(
        `/admin/subjects/${slug}/structure`,
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to load structure',
      );
    }
  },
);

export const learningFlowSlice = createSlice({
  name: 'learningFlow',
  initialState,
  reducers: {
    setActiveSubject(state, action: PayloadAction<string | null>) {
      state.activeSubjectId = action.payload;
    },
    toggleTopicExpansion(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (state.expandedTopics.includes(id)) {
        state.expandedTopics = state.expandedTopics.filter(
          (topicId) => topicId !== id,
        );
      } else {
        state.expandedTopics.push(id);
      }
    },
    toggleSubtopicExpansion(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (state.expandedSubtopics.includes(id)) {
        state.expandedSubtopics = state.expandedSubtopics.filter(
          (subId) => subId !== id,
        );
      } else {
        state.expandedSubtopics.push(id);
      }
    },
    setStructure(state, action: PayloadAction<Topic[]>) {
      state.structure = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourseStructure.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCourseStructure.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.structure = action.payload;
      })
      .addCase(fetchCourseStructure.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const {
  setActiveSubject,
  toggleTopicExpansion,
  toggleSubtopicExpansion,
  setStructure,
} = learningFlowSlice.actions;
export default learningFlowSlice.reducer;
