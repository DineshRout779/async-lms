import apiClient from './api';

type LoginPayload = {
  email: string;
  password: string;
};

type SignupPayload = {
  name: string;
  email: string;
  password: string;
};

export const loginService = async (data: LoginPayload) => {
  return await apiClient.post('/auth/login', data);
};

export const signupService = async (data: SignupPayload) => {
  return await apiClient.post('/auth/signup', data);
};
