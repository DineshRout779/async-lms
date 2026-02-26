import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loginWithToken } from '@/features/auth/authSlice';
import { selectAuth } from '@/features/auth/authSelectors';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, status } = useAppSelector(selectAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login');
      return;
    }

    dispatch(loginWithToken(token));
  }, []);

  useEffect(() => {
    if (status !== 'succeeded' || !isAuthenticated || !user) return;

    if (user.role === 'admin') {
      navigate('/dashboard/admin');
      return;
    }

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

    if (user.role === 'student') {
      if (user.onboarding_step !== 'done') {
        navigate(`/onboarding/${user.onboarding_step}`);
      } else {
        navigate('/dashboard/student');
      }
      return;
    }
  }, [isAuthenticated, user, status, navigate]);

  return (
    <div className='flex min-h-screen items-center justify-center gap-3 text-slate-600'>
      <Loader2 className='h-6 w-6 animate-spin' />
      <span className='text-sm font-medium'>Signing you in…</span>
    </div>
  );
}
