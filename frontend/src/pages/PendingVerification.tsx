import { ShieldAlert, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/app/hooks';
import { logout } from '@/features/auth/authSlice';
import { useNavigate } from 'react-router';

export default function PendingVerification() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

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
              Verification Pending
            </h1>
            <p className='text-muted-foreground'>
              Your facilitator account has been created successfully, but
              requires administrator approval before you can access the
              dashboard.
            </p>
          </div>
        </div>

        <div className='space-y-4 rounded-xl bg-muted/50 p-6'>
          <div className='flex gap-4'>
            <ShieldAlert className='h-6 w-6 text-primary shrink-0' />
            <div className='space-y-1'>
              <p className='text-sm font-semibold'>Why is this required?</p>
              <p className='text-xs text-muted-foreground'>
                To maintain the integrity of our educational platform, all
                facilitator accounts must be manually verified by the CodeGuru
                team.
              </p>
            </div>
          </div>
          {/* <div className='flex gap-4 mt-4'>
            <Mail className='h-6 w-6 text-primary shrink-0' />
            <div className='space-y-1'>
              <p className='text-sm font-semibold'>Get notified</p>
              <p className='text-xs text-muted-foreground'>
                You will receive an email once your account is verified. You can
                then log in to access your dashboard.
              </p>
            </div>
          </div> */}
        </div>

        <Button
          variant='outline'
          className='w-full rounded-xl py-6 hover:bg-muted/80'
          onClick={handleLogout}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
