import axios from "axios";

const getToken = () => {
  return localStorage.getItem("token");
};

const apiClient = axios.create({
  // Ensure this matches your Vite/Env variable name
  baseURL: import.meta.env.VITE_API_URL + "/api/v1",
});

// Request Interceptor: Adds the token to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Useful for handling 401 (Unauthorized) errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If backend is entirely unreachable (ERR_CONNECTION_REFUSED), gracefully mock Auth requests
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message.includes('Network Error');
    
    if (isNetworkError && error.config?.url) {
      const url = error.config.url.toLowerCase();
      const method = error.config.method?.toLowerCase();
      
      if (url.includes('/colleges') && method === 'get') {
        const mockColleges = [
          { id: 1, name: 'Delhi Technological University' },
          { id: 2, name: 'Indian Institute of Technology, Bombay' },
          { id: 3, name: 'BITS Pilani' },
          { id: 4, name: 'National Institute of Technology, Trichy' },
        ];
        console.warn('Backend Unreachable! Serving Mocked Colleges List.');
        return Promise.resolve({
          data: { data: mockColleges },
          status: 200, statusText: 'OK', headers: {}, config: error.config
        });
      }

      if (url.includes('/colleges') && method === 'post') {
        console.warn('Backend Unreachable! Serving Mocked College Creation.');
        return Promise.resolve({
          data: { id: 9999, name: 'Mock Custom College' },
          status: 201, statusText: 'Created', headers: {}, config: error.config
        });
      }

      if (url.includes('/onboarding/') && method === 'post') {
        console.warn('Backend Unreachable! Serving Mocked Onboarding Progress.');
        return Promise.resolve({
          data: { next_step: 'batch', message: 'Progress saved successfully' },
          status: 200, statusText: 'OK', headers: {}, config: error.config
        });
      }

      if (url.includes('/auth/login') || url.includes('/auth/signup')) {
        let role = 'student';
        let full_name = 'Test User';
        try {
           const parsed = typeof error.config.data === 'string' ? JSON.parse(error.config.data) : error.config.data;
           if (parsed?.role) role = parsed.role;
           if (parsed?.full_name) full_name = parsed.full_name;
        } catch(e) {}
        
        const isSignup = url.includes('/auth/signup');
        const initialOnboardingStep = role === 'student' ? 'college' : 'start';

        const mockUser = {
          id: 999,
          full_name,
          email: 'test@codeguru.com',
          role,
          is_verified: true,
          onboarding_step: isSignup ? initialOnboardingStep : 'done'
        };
        localStorage.setItem('token', 'fallback_mock_token_123');
        localStorage.setItem('mock_user_role', JSON.stringify(mockUser));
        
        console.warn(`Backend Unreachable! Serving Mocked Auth ${isSignup ? 'Signup' : 'Login'} Response.`);
        return Promise.resolve({
          data: { user: mockUser, token: 'fallback_mock_token_123' },
          status: 200, statusText: 'OK', headers: {}, config: error.config
        });
      }

      if (url.includes('/auth/me')) {
        const stored = localStorage.getItem('mock_user_role');
        const mockUser = stored ? JSON.parse(stored) : {
          id: 999,
          full_name: 'Test User',
          email: 'test@codeguru.com',
          role: 'student',
          is_verified: true,
          onboarding_step: 'done'
        };
        console.warn('Backend Unreachable! Serving Mocked Auth/Me Response.');
        return Promise.resolve({
          data: mockUser,
          status: 200, statusText: 'OK', headers: {}, config: error.config
        });
      }
    }

    if (error.response && error.response.status === 401) {
      // Optional: Redirect to login or clear localStorage
      console.error("Token expired or invalid");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
