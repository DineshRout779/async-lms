import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Github, GraduationCap } from 'lucide-react';
import { loginService, signupService } from '@/services/auth';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router';

type AuthMode = 'login' | 'signup';

export default function Login() {
  const [authMode, setAuthMode] = useState<AuthMode>('signup');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

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

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (authMode === 'signup') {
        validateSignup();

        const res = await signupService({
          name,
          email,
          password,
        });

        console.log('Signup success:', res.data);
      } else {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        const res = await loginService({ email, password });
        console.log('Login success:', res.data);
      }

      navigate('/dashboard');
    } catch (error: any) {
      if (isAxiosError(error)) {
        console.log(error.response?.data?.message || 'Authentication failed');
      } else {
        console.log(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen grid grid-cols-1 lg:grid-cols-2'>
      {/* Left Illustration */}
      <div className='hidden lg:block border'>
        <img
          className='w-full h-full object-cover'
          src='https://images.pexels.com/photos/4170628/pexels-photo-4170628.jpeg'
          alt=''
        />
      </div>

      {/* Right Auth Section */}
      <div className='flex items-center justify-center px-6'>
        <div className='w-full max-w-md'>
          {/* Logo */}
          <div className='flex items-center gap-2 mb-6'>
            <div className='h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center'>
              <GraduationCap className='h-5 w-5' />
            </div>
            <span className='font-semibold text-lg'>CodeGuru</span>
          </div>

          {/* Tabs */}
          <Tabs
            value={authMode}
            onValueChange={(v) => {
              setAuthMode(v as AuthMode);
            }}
            className='mb-6'
          >
            <TabsList className='grid grid-cols-2'>
              <TabsTrigger value='signup'>Sign Up</TabsTrigger>
              <TabsTrigger value='login'>Sign In</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Form */}
          <div className='space-y-4'>
            {authMode === 'signup' && (
              <div>
                <label className='text-sm font-medium'>Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='Enter your full name'
                />
              </div>
            )}

            <div>
              <label className='text-sm font-medium'>Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='Enter your email'
              />
            </div>

            <div>
              <label className='text-sm font-medium'>Password</label>
              <Input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Enter password'
              />
            </div>

            {authMode === 'signup' && (
              <div>
                <label className='text-sm font-medium'>Confirm Password</label>
                <Input
                  type='password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder='Re-enter password'
                />
              </div>
            )}

            <Button
              className='w-full mt-2'
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading
                ? 'Please wait...'
                : authMode === 'login'
                ? 'Login'
                : 'Create Account'}
            </Button>

            <p className='text-center text-sm text-muted-foreground'>
              {authMode === 'login' ? (
                <>
                  Don’t have an account?{' '}
                  <button
                    className='underline'
                    onClick={() => setAuthMode('signup')}
                  >
                    Create your account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    className='underline'
                    onClick={() => setAuthMode('login')}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Divider */}
          <div className='flex items-center gap-3 my-6'>
            <div className='h-px flex-1 bg-border' />
            <span className='text-xs text-muted-foreground'>OR</span>
            <div className='h-px flex-1 bg-border' />
          </div>

          {/* OAuth */}
          <div className='space-y-3'>
            <Button variant='secondary' className='w-full flex gap-2'>
              <svg width='16' height='16' viewBox='0 0 48 48'>
                <path
                  fill='#FFC107'
                  d='M43.6 20.4H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.6z'
                />
              </svg>
              Continue with Google
            </Button>

            {/* <Button variant='secondary' className='w-full flex gap-2'>
              <Github className='h-4 w-4' />
              Continue with GitHub
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
