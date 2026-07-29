import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type { AuthResponse, User } from './authTypes';

/**
 * LOGIN
 */
export const loginUser = createAsyncThunk<
  AuthResponse,
  { email: string; password: string },
  { rejectValue: string }
>('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

/** 
 * SIGNUP
 */
export const signupUser = createAsyncThunk<
  AuthResponse,
  Record<string, any>,
  { rejectValue: string }
>('auth/signup', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/signup', payload);
    return data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Signup failed');
  }
});

/**
 * LOAD CURRENT USER
 */
export const loadUser = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<User>('/auth/me');
      return data;
    } catch {
      return rejectWithValue('Session expired');
    }
  }
);
