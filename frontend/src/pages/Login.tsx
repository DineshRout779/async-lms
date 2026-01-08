import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Github, GraduationCap } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

export default function Login() {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (authMode === 'signin') {
      // LOGIN API CALL
      console.log('Login', { email, password });
    } else {
      // SIGNUP API CALL
      console.log('Signup', { email, password });
    }
  };

  return (
    <div className='min-h-screen grid grid-cols-1 lg:grid-cols-2'>
      {/* Left Illustration */}
      <div className='hidden lg:block border'>
        <div className='h-screen'>
          <img
            className='w-full block object-cover h-full'
            src='https://images.pexels.com/photos/4170628/pexels-photo-4170628.jpeg'
            alt=''
          />
        </div>
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
            onValueChange={(v) => setAuthMode(v as AuthMode)}
            className='mb-6'
          >
            <TabsList className='grid grid-cols-2'>
              <TabsTrigger value='signup'>Sign Up</TabsTrigger>
              <TabsTrigger value='signin'>Sign In</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Form */}
          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium'>Email id</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='Enter your email'
              />
            </div>

            <div>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium'>Password</label>
                {authMode === 'signin' && (
                  <button className='text-xs text-muted-foreground hover:underline'>
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Enter Password'
              />
            </div>

            <Button className='w-full mt-2' onClick={handleSubmit}>
              {authMode === 'signin' ? 'Login' : 'Create Account'}
            </Button>

            <p className='text-center text-sm text-muted-foreground'>
              {authMode === 'signin' ? (
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
                    onClick={() => setAuthMode('signin')}
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
                  d='M43.6 20.4H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.6z'
                />
              </svg>
              Continue with Google
            </Button>

            <Button variant='secondary' className='w-full flex gap-2'>
              <Github className='h-4 w-4' />
              Continue with GitHub
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
