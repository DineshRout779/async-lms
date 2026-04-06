import { Outlet } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { selectAuth } from './features/auth/authSelectors';
import { loadUser } from './features/auth/authThunks';

const App = () => {
  const { token } = useAppSelector(selectAuth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (token) {
      dispatch(loadUser());
    }
  }, [token, dispatch]);

  return (
    <>
      <Outlet />
      <Toaster position='bottom-center' reverseOrder={false} />
    </>
  );
};

export default App;
