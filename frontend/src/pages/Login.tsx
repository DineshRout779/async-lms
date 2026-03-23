import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <div 
      className='min-h-screen flex items-center justify-center bg-[#344499] p-4 text-slate-800'
      style={{ fontFamily: "'Noto Sans', sans-serif" }}
    >
      <div className='w-full max-w-md bg-white px-8 py-6 rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.15)]'>
          <Tabs
            value={authMode}
            onValueChange={handleTabChange}
            className='mb-4 w-full'
          >
            <TabsList className='grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl h-auto'>
              <TabsTrigger 
                value='signup' 
                className='data-[state=active]:bg-[#344499] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-[15px] font-medium transition-all text-slate-500'
              >
                Sign Up
              </TabsTrigger>
              <TabsTrigger 
                value='login' 
                className='data-[state=active]:bg-[#344499] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 text-[15px] font-medium transition-all text-slate-500'
              >
                Sign In
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className='space-y-3.5'>
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className='text-[13px] font-semibold text-slate-800 tracking-wide'>Full Name</label>
                <Input className="h-10 text-sm" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}

            <div className="space-y-1">
              <label className='text-[13px] font-semibold text-slate-800 tracking-wide'>Email Id</label>
              <Input
                type='email'
                className="h-10 text-sm"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className='text-[13px] font-semibold text-slate-800 tracking-wide'>Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  className="h-10 pr-10 text-sm"
                  placeholder={authMode === 'signup' ? "Create a Password" : "Enter Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className='text-[13px] font-semibold text-slate-800 tracking-wide'>Confirm Password</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="h-10 pr-10 text-sm"
                    placeholder="Confirm your Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>
            )}

            <Button type='submit' className='w-full bg-[#344499] hover:bg-[#2c3983] text-white h-11 text-[15px] font-semibold tracking-wide shadow-md rounded-lg mt-1' loading={isLoading}>
              {authMode === 'login' ? 'Sign In' : 'Create your account'}
            </Button>

            <div className='text-center mt-2.5 text-[13px] text-slate-600'>
              {authMode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => handleTabChange('signup')} className='text-[#344499] font-medium hover:underline underline-offset-2'>
                    Create your account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => handleTabChange('login')} className='text-[#344499] font-medium hover:underline underline-offset-2'>
                    Signin
                  </button>
                </>
              )}
            </div>
          </form>

          <div className='relative my-4'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-slate-200' />
            </div>
            <div className='relative flex justify-center'>
              <span className='bg-white px-4 text-xs tracking-wider font-medium text-slate-400 uppercase'>
                OR
              </span>
            </div>
          </div>

          <a
            href={GOOGLE_AUTH_URL}
            className='flex w-full items-center justify-center gap-3 rounded-lg border border-[#344499] text-[#344499] bg-white px-4 py-2.5 text-[14px] font-semibold hover:bg-[#f8f9fc] transition-colors'
          >
            <span className="font-bold text-[17px]">G</span> Continue with Google
          </a>

          {authMode === 'signup' && (
            <p className="text-center text-[12px] text-slate-500 mt-4 leading-relaxed">
              By signing up to create an account I accept Company's<br/>
              <span className="font-medium text-[#344499]">Terms of use & Privacy Policy.</span>
            </p>
          )}

          <div className='flex justify-center mt-4 items-center'>
            <Link
              className='block text-[13px] text-[#344499] hover:underline underline-offset-4 font-medium transition-colors'
              to={`/login?user_type=${userTypeParam === 'student' ? 'facilitator' : 'student'}`}
            >
              Continue as{' '}
              {userTypeParam === 'student' ? 'facilitator' : 'student'}
            </Link>
          </div>
        </div>
      </div>
  );
}
