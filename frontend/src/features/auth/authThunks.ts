import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type { AuthResponse, User } from './authTypes';

/**
 * LOGIN
 */
export const loginUser = createAsyncThunk<
  AuthResponse,
  { email: string; password: string },
  { rejectValue: any }
>('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data || { message: 'Login failed' });
  }
});

/** 
 * SIGNUP
 */
export const signupUser = createAsyncThunk<
  any,
  Record<string, any>,
  { rejectValue: any }
>('auth/signup', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<any>('/auth/signup', payload);
    return data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data || { message: 'Signup failed' });
  }
});

/**
 * COMPLETE GOOGLE SIGNUP (role selection for brand-new Google sign-ins)
 */
export const completeGoogleSignup = createAsyncThunk<
  AuthResponse,
  { token: string; role: 'student' | 'facilitator' },
  { rejectValue: string }
>('auth/completeGoogleSignup', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/google/complete', payload);
    return data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Could not complete sign-up');
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
