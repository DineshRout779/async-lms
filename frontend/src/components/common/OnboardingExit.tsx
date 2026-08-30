import { useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { logout } from '@/features/auth/authSlice';

// Exit onboarding
export default function OnboardingExit() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSignOut = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <button
      type='button'
      onClick={handleSignOut}
      className='absolute top-5 right-5 z-20 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
    >
      <LogOut className='h-4 w-4' />
      Sign out
    </button>
  );
}
