import { Outlet } from 'react-router';
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <>
      <Outlet />
      <Toaster position='bottom-center' reverseOrder={false} />
    </>
  );
};

export default App;
