import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import toast from 'react-hot-toast';

// Redux
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loginUser, signupUser } from '@/features/auth/authThunks';
import { clearAuthError } from '@/features/auth/authSlice';
import { selectAuth } from '@/features/auth/authSelectors';

type AuthMode = 'login' | 'signup';

const GOOGLE_AUTH_URL = `${import.meta.env.VITE_API_URL}/api/v1/auth/google`;

export default function Login() {
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [searchParams] = useSearchParams();
  const userTypeParam = searchParams.get('user_type');

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { status, isAuthenticated, user } = useAppSelector(selectAuth);
  const isLoading = status === 'loading';

  // Show error from Google redirect failure
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) toast.error('Google sign-in failed. Please try again.');
  }, [searchParams]);

  // REDIRECT AFTER AUTH
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // ADMIN FLOW
    if (user.role === 'admin') {
      navigate('/dashboard/admin');
      return;
    }

    // FACILITATOR FLOW
    if (user.role === 'facilitator') {
      if (user.onboarding_step !== 'done') {
        navigate('/onboarding/facilitator');
      } else if (!user.is_verified) {
        navigate('/pending-verification');
      } else {
        navigate('/dashboard/facilitator');
      }
      return;
    }

    // STUDENT FLOW
    if (user.role === 'student') {
      if (user.onboarding_step !== 'done') {
        navigate(`/onboarding/${user.onboarding_step}`);
      } else {
        navigate('/dashboard/student');
      }
      return;
    }
  }, [isAuthenticated, user, navigate]);

  // Tab Change
  const handleTabChange = (v: string) => {
    setAuthMode(v as AuthMode);
    dispatch(clearAuthError());
  };

  // Validation
  const validateSignup = () => {
    if (!name || !email || !password || !confirmPassword) {
      throw new Error('All fields are required');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const toastId = toast.loading(
      authMode === 'signup' ? 'Creating account...' : 'Signing in...',
    );

    try {
      if (authMode === 'signup') {
        validateSignup();
        await dispatch(
          signupUser({ full_name: name, email, password, role: userTypeParam }),
        ).unwrap();
        toast.success('Account created successfully!', { id: toastId });
      } else {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        await dispatch(loginUser({ email, password })).unwrap();
        toast.success('Login successful!', { id: toastId });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Authentication failed';
      toast.error(errorMessage, { id: toastId });
    }
  };

  return (
    <div className='min-h-screen grid grid-cols-1 lg:grid-cols-2'>
      <div className='hidden lg:block border'>
        <img
          className='w-full h-full object-cover'
          src='https://images.pexels.com/photos/4170628/pexels-photo-4170628.jpeg'
          alt='Auth background'
          loading='lazy'
        />
      </div>

      <div className='flex items-center justify-center px-6'>
        <div className='w-full max-w-md'>
          <div className='flex items-center gap-2 mb-6'>
            <div className='h-12 w-12 rounded-lg bg-foreground text-background flex items-center justify-center'>
              <GraduationCap className='h-8 w-8' />
            </div>
            <div>
              <p className='font-semibold text-lg uppercase'>CodeGuru</p>
              <p className='font-semibold text-xs capitalize'>
                For {userTypeParam}s
              </p>
            </div>
          </div>

          <Tabs
            value={authMode}
            onValueChange={handleTabChange}
            className='mb-6'
          >
            <TabsList className='grid grid-cols-2'>
              <TabsTrigger value='signup'>Sign Up</TabsTrigger>
              <TabsTrigger value='login'>Sign In</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className='space-y-4'>
            {authMode === 'signup' && (
              <div>
                <label className='text-sm font-medium'>Full Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}

            <div>
              <label className='text-sm font-medium'>Email</label>
              <Input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className='text-sm font-medium'>Password</label>
              <Input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {authMode === 'signup' && (
              <div>
                <label className='text-sm font-medium'>Confirm Password</label>
                <Input
                  type='password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <Button type='submit' className='w-full' loading={isLoading}>
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </Button>
          </form>

          <div className='relative my-5'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-slate-200' />
            </div>
            <div className='relative flex justify-center'>
              <span className='bg-white px-3 text-xs text-slate-400'>
                or continue with
              </span>
            </div>
          </div>

          <a
            href={GOOGLE_AUTH_URL}
            className='flex w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors'
          >
            <svg className='h-5 w-5' viewBox='0 0 24 24'>
              <path
                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                fill='#4285F4'
              />
              <path
                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                fill='#34A853'
              />
              <path
                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'
                fill='#FBBC05'
              />
              <path
                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                fill='#EA4335'
              />
            </svg>
            Continue with Google
          </a>

          <div className='flex justify-center mt-4 items-center'>
            <Link
              className='block text-xs'
              to={`/login?user_type=${userTypeParam === 'student' ? 'facilitator' : 'student'}`}
            >
              Continue as{' '}
              {userTypeParam === 'student' ? 'facilitator' : 'student'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
