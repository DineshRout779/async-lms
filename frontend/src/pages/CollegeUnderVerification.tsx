import { useEffect } from 'react';
import { Building2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logout } from '@/features/auth/authSlice';
import { useNavigate } from 'react-router';
import { selectUser } from '@/features/auth/authSelectors';

export default function CollegeUnderVerification() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    if (user?.is_verified && user.college_is_verified !== false) {
      navigate('/dashboard/student', { replace: true });
    }
  }, [user?.college_is_verified, user?.is_verified, navigate]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className='min-h-screen flex items-center justify-center p-6 bg-muted/20'>
      <div className='max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl space-y-8 animate-in zoom-in-95 duration-500'>
        <div className='flex flex-col items-center text-center space-y-4'>
          <div className='h-20 w-20 rounded-full bg-yellow-500/10 flex items-center justify-center animate-pulse'>
            <Clock className='h-10 w-10 text-yellow-600' />
          </div>
          <div className='space-y-2'>
            <h1 className='text-2xl font-bold tracking-tight'>
              College Under Verification
            </h1>
            {user?.college_name && (
              <p className='text-sm font-semibold text-foreground'>
                {user.college_name}
              </p>
            )}
            <p className='text-muted-foreground'>
              Your account is active, but the college you registered under is
              currently being reviewed by our team.
            </p>
          </div>
        </div>

        <div className='space-y-4 rounded-xl bg-muted/50 p-6'>
          <div className='flex gap-4'>
            <Building2 className='h-6 w-6 text-primary shrink-0' />
            <div className='space-y-1'>
              <p className='text-sm font-semibold'>Why is this required?</p>
              <p className='text-xs text-muted-foreground'>
                To ensure quality and authenticity, newly registered colleges
                are manually reviewed before students can access course content.
                This usually takes 1–2 business days.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant='outline'
          className='w-full rounded-xl py-6 hover:bg-muted/80 hover:text-black'
          onClick={handleLogout}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
