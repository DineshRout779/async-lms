import apiClient from './api';

type LoginPayload = {
  email: string;
  password: string;
};

export const loginService = async (data: LoginPayload) => {
  return await apiClient.post('/auth/login', data);
};
