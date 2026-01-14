export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'student' | 'facilitator' | 'admin';
  college_id?: number;
  degree?: string;
  year?: number;
  onboarding_step: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}
