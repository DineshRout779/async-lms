import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useNavigate, useSearchParams } from 'react-router';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import { Eye, EyeOff } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loginUser, signupUser } from '@/features/auth/authThunks';
import { clearAuthError } from '@/features/auth/authSlice';
import { selectAuth } from '@/features/auth/authSelectors';
import SEO from '@/components/common/SEO';
import { loginSchema, signupSchema } from '@/lib/validations';

const GOOGLE_AUTH_URL = `${import.meta.env.VITE_API_URL}/api/v1/auth/google`;

export default function Login() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const userTypeParam = searchParams.get('user_type');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { status, isAuthenticated, user, token } = useAppSelector(selectAuth);
  const isLoading = status === 'loading';
  const isResolvingSession = !!token && status === 'loading' && !user;

  // Show error from Google redirect failure
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) toast.error('Google sign-in failed. Please try again.');
  }, [searchParams]);

  // Redirect after auth
  useEffect(() => {
    if (isResolvingSession || !isAuthenticated || !user) return;
    if (user.role === 'admin') {
      navigate('/dashboard/admin');
      return;
    }
    if (user.role === 'curriculum_developer') {
      navigate('/dashboard/curriculum-developer');
      return;
    }
    if (user.role === 'facilitator') {
      if (user.onboarding_step !== 'done') navigate('/onboarding/facilitator');
      else if (!user.is_verified) navigate('/pending-verification');
      else navigate('/dashboard/facilitator');
      return;
    }
    if (user.role === 'student') {
      navigate(
        user.onboarding_step !== 'done'
          ? `/onboarding/${user.onboarding_step}`
          : '/dashboard/student',
      );
    }
  }, [isResolvingSession, isAuthenticated, user, navigate]);

  const loginForm = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      const toastId = toast.loading('Signing in...');
      try {
        await dispatch(loginUser(values)).unwrap();
        toast.success('Login successful!', { id: toastId });
      } catch (err) {
        toast.error(typeof err === 'string' ? err : 'Login failed', {
          id: toastId,
        });
      }
    },
  });

  const signupForm = useFormik({
    initialValues: {
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: signupSchema,
    onSubmit: async (values) => {
      const toastId = toast.loading('Creating account...');
      try {
        await dispatch(signupUser({ ...values, role: userTypeParam })).unwrap();
        toast.success('Account created successfully!', { id: toastId });
      } catch (err) {
        toast.error(typeof err === 'string' ? err : 'Signup failed', {
          id: toastId,
        });
      }
    },
  });

  const handleTabChange = (v: string) => {
    setActiveTab(v as 'login' | 'signup');
    dispatch(clearAuthError());
    loginForm.resetForm();
    signupForm.resetForm();
  };

  return (
    <>
      <SEO title='Sign In' noIndex={true} />
      <div
        className='min-h-screen flex items-center justify-center bg-[#344499] p-4 text-slate-800'
        style={{ fontFamily: "'Noto Sans', sans-serif" }}
      >
        <div className='w-full max-w-md bg-white px-5 py-5 sm:px-8 sm:py-6 rounded-xl sm:rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.15)]'>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className='mb-4 w-full'
          >
            <TabsList className='grid w-full grid-cols-2 bg-slate-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl h-auto'>
              <TabsTrigger
                value='login'
                className='data-[state=active]:bg-[#344499] data-[state=active]:text-white data-[state=active]:shadow-md rounded-md sm:rounded-lg py-1.5 sm:py-2.5 text-[11px] sm:text-[15px] font-medium transition-all text-slate-500'
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value='signup'
                className='data-[state=active]:bg-[#344499] data-[state=active]:text-white data-[state=active]:shadow-md rounded-md sm:rounded-lg py-1.5 sm:py-2.5 text-[11px] sm:text-[15px] font-medium transition-all text-slate-500'
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* LOGIN FORM */}
          <form
            onSubmit={loginForm.handleSubmit}
            className={`space-y-2.5 sm:space-y-3.5 ${activeTab !== 'login' ? 'hidden' : ''}`}
          >
            <div className='space-y-1'>
              <label className='text-[10px] sm:text-[13px] font-semibold text-slate-800 tracking-wide'>
                Email id
              </label>
              <Input
                name='email'
                type='email'
                className='h-8 sm:h-10 text-[10px] sm:text-sm'
                placeholder='Enter your email'
                value={loginForm.values.email}
                onChange={loginForm.handleChange}
                onBlur={loginForm.handleBlur}
              />
              {loginForm.touched.email && loginForm.errors.email && (
                <p className='text-[10px] sm:text-xs text-destructive mt-1'>
                  {loginForm.errors.email}
                </p>
              )}
            </div>

            <div className='space-y-1'>
              <div className='flex justify-between items-center'>
                <label className='text-[10px] sm:text-[13px] font-semibold text-slate-800 tracking-wide'>
                  Password
                </label>
                <Link to='#' className='text-[8px] sm:text-[11px] text-slate-400 hover:text-slate-600 transition-colors'>
                  Forgot password?
                </Link>
              </div>
              <Input
                name='password'
                type='password'
                className='h-8 sm:h-10 text-[10px] sm:text-sm'
                placeholder='Enter Password'
                value={loginForm.values.password}
                onChange={loginForm.handleChange}
                onBlur={loginForm.handleBlur}
              />
              {loginForm.touched.password && loginForm.errors.password && (
                <p className='text-[10px] sm:text-xs text-destructive mt-1'>
                  {loginForm.errors.password}
                </p>
              )}
            </div>

            <div className='pt-1 sm:pt-2'>
              <Button
                type='submit'
                className='w-full bg-[#344499] hover:bg-[#2c3983] text-white h-8 sm:h-11 text-[11px] sm:text-[15px] font-semibold tracking-wide shadow-md rounded-md sm:rounded-lg'
                loading={isLoading}
              >
                Sign In
              </Button>
            </div>
            
            <div className='text-center mt-1.5 sm:mt-3'>
              <span className='text-[8px] sm:text-xs text-slate-500'>
                Don't have an account?{' '}
              </span>
              <button 
                type='button' 
                onClick={() => setActiveTab('signup')} 
                className='text-[8px] sm:text-xs text-slate-700 underline underline-offset-2 font-medium hover:text-slate-900 transition-colors'
              >
                Create your account
              </button>
            </div>
          </form>

          {/* SIGNUP FORM */}
          <form
            onSubmit={signupForm.handleSubmit}
            className={`space-y-2.5 sm:space-y-3.5 ${activeTab === 'login' ? 'hidden' : ''}`}
          >
            <div className='space-y-1'>
              <label className='text-[10px] sm:text-[13px] font-semibold text-slate-800 tracking-wide'>
                Full Name
              </label>
              <Input
                name='full_name'
                className='h-8 sm:h-10 text-[10px] sm:text-sm'
                placeholder='Enter your full name'
                value={signupForm.values.full_name}
                onChange={signupForm.handleChange}
                onBlur={signupForm.handleBlur}
              />
              {signupForm.touched.full_name && signupForm.errors.full_name && (
                <p className='text-[10px] sm:text-xs text-destructive mt-1'>
                  {signupForm.errors.full_name}
                </p>
              )}
            </div>

            <div className='space-y-1'>
              <label className='text-[10px] sm:text-[13px] font-semibold text-slate-800 tracking-wide'>
                Email Id
              </label>
              <Input
                name='email'
                type='email'
                className='h-8 sm:h-10 text-[10px] sm:text-sm'
                placeholder='Enter your email'
                value={signupForm.values.email}
                onChange={signupForm.handleChange}
                onBlur={signupForm.handleBlur}
              />
              {signupForm.touched.email && signupForm.errors.email && (
                <p className='text-[10px] sm:text-xs text-destructive mt-1'>
                  {signupForm.errors.email}
                </p>
              )}
            </div>

            <div className='space-y-1'>
              <label className='text-[10px] sm:text-[13px] font-semibold text-slate-800 tracking-wide'>
                Password
              </label>
              <div className='relative'>
                <Input
                  name='password'
                  type={showSignupPassword ? 'text' : 'password'}
                  className='h-8 sm:h-10 text-[10px] sm:text-sm pr-8 sm:pr-10'
                  placeholder='Create a Password'
                  value={signupForm.values.password}
                  onChange={signupForm.handleChange}
                  onBlur={signupForm.handleBlur}
                />
                <button
                  type='button'
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className='absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors'
                >
                  {showSignupPassword ? (
                    <EyeOff className='h-3 w-3 sm:h-4 sm:w-4' />
                  ) : (
                    <Eye className='h-3 w-3 sm:h-4 sm:w-4' />
                  )}
                </button>
              </div>
              {signupForm.touched.password && signupForm.errors.password && (
                <p className='text-[10px] sm:text-xs text-destructive mt-1'>
                  {signupForm.errors.password}
                </p>
              )}
            </div>

            <div className='space-y-1'>
              <label className='text-[10px] sm:text-[13px] font-semibold text-slate-800 tracking-wide'>
                Confirm Password
              </label>
              <div className='relative'>
                <Input
                  name='confirmPassword'
                  type={showSignupConfirmPassword ? 'text' : 'password'}
                  className='h-8 sm:h-10 text-[10px] sm:text-sm pr-8 sm:pr-10'
                  placeholder='Confirm your Password'
                  value={signupForm.values.confirmPassword}
                  onChange={signupForm.handleChange}
                  onBlur={signupForm.handleBlur}
                />
                <button
                  type='button'
                  onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                  className='absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors'
                >
                  {showSignupConfirmPassword ? (
                    <EyeOff className='h-3 w-3 sm:h-4 sm:w-4' />
                  ) : (
                    <Eye className='h-3 w-3 sm:h-4 sm:w-4' />
                  )}
                </button>
              </div>
              {signupForm.touched.confirmPassword &&
                signupForm.errors.confirmPassword && (
                  <p className='text-[10px] sm:text-xs text-destructive mt-1'>
                    {signupForm.errors.confirmPassword}
                  </p>
                )}
            </div>

            <div className='pt-1 sm:pt-2'>
              <Button
                type='submit'
                className='w-full bg-[#344499] hover:bg-[#2c3983] text-white h-8 sm:h-11 text-[11px] sm:text-[15px] font-semibold tracking-wide shadow-md rounded-md sm:rounded-lg'
                loading={isLoading}
              >
                Create your account
              </Button>
            </div>
            
            <div className='text-center mt-1.5 sm:mt-3'>
              <span className='text-[8px] sm:text-xs text-slate-500'>
                Already have an account?{' '}
              </span>
              <button 
                type='button' 
                onClick={() => setActiveTab('login')} 
                className='text-[8px] sm:text-xs text-slate-700 underline underline-offset-2 font-medium hover:text-slate-900 transition-colors'
              >
                Sign In
              </button>
            </div>
          </form>

          <div className='relative my-3 sm:my-4'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-slate-200' />
            </div>
            <div className='relative flex justify-center'>
              <span className='bg-white px-2 sm:px-4 text-[8px] sm:text-xs tracking-wider font-medium text-slate-400 uppercase'>
                OR
              </span>
            </div>
          </div>

          <a
            href={GOOGLE_AUTH_URL}
            className='flex w-full items-center justify-center gap-2 sm:gap-3 rounded-md sm:rounded-lg border border-[#344499] sm:border-slate-300 bg-white h-8 sm:h-auto px-4 py-0 sm:py-2.5 text-[10px] sm:text-sm font-medium text-[#344499] sm:text-slate-700 shadow-sm hover:bg-slate-50 transition-colors'
          >
            <svg className='h-3.5 w-3.5 sm:h-5 sm:w-5' viewBox='0 0 24 24'>
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

          <div className='text-center mt-3 sm:mt-5 px-4'>
            <p className='text-[6.5px] sm:text-[10px] text-slate-400 leading-relaxed'>
              By signing up to create an account I accept CodeGuru's{' '}
              <br className='sm:hidden' />
              <Link to='#' className='text-[#344499] font-medium'>
                Terms of use & Privacy Policy.
              </Link>
            </p>
          </div>

          <div className='flex justify-center mt-3 sm:mt-4 items-center'>
            <Link
              className='block text-[10px] sm:text-[13px] text-[#344499] hover:underline underline-offset-4 font-medium transition-colors'
              to={`/login?user_type=${userTypeParam === 'student' ? 'facilitator' : 'student'}`}
            >
              Continue as{' '}
              {userTypeParam === 'student' ? 'facilitator' : 'student'}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
