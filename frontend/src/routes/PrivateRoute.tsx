import { useAppSelector } from '@/app/hooks';
import { selectAuth } from '@/features/auth/authSelectors';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';

const PrivateRoute = () => {
  const { token, user, status } = useAppSelector(selectAuth);
  const location = useLocation();

  if (!token) {
    return <Navigate to='/' state={{ from: location }} replace />;
  }

  if (!user && (status === 'idle' || status === 'loading')) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-indigo-600' />
      </div>
    );
  }

  const isOnOnboarding = location.pathname.startsWith('/onboarding');

  if (user && !isOnOnboarding) {
    if (user.role === 'student' && user.onboarding_step !== 'done') {
      return <Navigate to={`/onboarding/${user.onboarding_step}`} replace />;
    }
    if (user.role === 'facilitator' && user.onboarding_step !== 'done') {
      return <Navigate to='/onboarding/facilitator' replace />;
    }
  }

  return <Outlet />;
};

export default PrivateRoute;
