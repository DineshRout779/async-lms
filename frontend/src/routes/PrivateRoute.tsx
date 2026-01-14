import { useAppSelector } from '@/app/hooks';
import { selectAuth } from '@/features/auth/authSelectors';
import { Navigate, Outlet, useLocation } from 'react-router';

const PrivateRoute = () => {
  const { token } = useAppSelector(selectAuth);
  const location = useLocation();

  // If there is a token, allow access to the child routes
  // Otherwise, redirect to login and save the current location in state
  return token ? (
    <Outlet />
  ) : (
    <Navigate to='/' state={{ from: location }} replace />
  );
};

export default PrivateRoute;
