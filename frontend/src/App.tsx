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
    const fetchUser = async () => {
      try {
        dispatch(loadUser());
      } catch (error) {
        console.log('Error while fetching user data');
      }
    };

    if (token) {
      fetchUser();
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
