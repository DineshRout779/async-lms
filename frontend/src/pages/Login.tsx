import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

// Redux
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loginUser, signupUser, googleAuth } from '@/features/auth/authThunks';
import { clearAuthError } from '@/features/auth/authSlice';
import { selectAuth } from '@/features/auth/authSelectors';

type AuthMode = 'login' | 'signup';

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
    } catch (err: any) {
      const errorMessage =
        typeof err === 'string' ? err : err?.message || 'Authentication failed';
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
        />
      </div>

      <div className='flex items-center justify-center px-6'>
        <div className='w-full max-w-md'>
          <div className='flex items-center gap-2 mb-6'>
            <div className='h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center'>
              <GraduationCap className='h-5 w-5' />
            </div>
            <span className='font-semibold text-lg uppercase'>CodeGuru</span>
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

          <div className='flex justify-center'>
            <GoogleLogin
              onSuccess={async (response) => {
                if (!response.credential) return;
                const toastId = toast.loading('Signing in with Google...');
                try {
                  await dispatch(googleAuth(response.credential)).unwrap();
                  toast.success('Signed in with Google!', { id: toastId });
                } catch (err: unknown) {
                  toast.error('Google sign-in failed');
                }
              }}
              onError={() => toast.error('Google sign-in was cancelled')}
              useOneTap={false}
              width='368'
            />
          </div>
        </div>
      </div>
    </div>
  );
}
