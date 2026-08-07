import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Check, FileText, Home, Users } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import { loadUser } from '@/features/auth/authThunks';
import { useEffect } from 'react';
import Logo from '@/components/common/Logo';

export default function SuccessStep() {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();

  // Refresh user state so onboarding_step = 'done' is guaranteed in Redux
  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  const handleDashboard = () => {
    navigate(`/dashboard/${user?.role || 'student'}`);
  };

  return (
    <div
      className='min-h-screen w-full relative bg-cover bg-center overflow-hidden flex flex-col items-center justify-center p-4'
      style={{
        backgroundImage: 'url("/bg-students.jpg")',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Blue tinted overlay */}
      <div className='absolute inset-0 bg-[#344499]/70 backdrop-blur-[2px]' />

      <div className='flex flex-col items-center mb-6 relative z-10'>
        <Logo className='h-14 w-14 mb-2' />
        <span className='text-white font-bold text-lg tracking-wider'>
          CodeGuru
        </span>
      </div>

      <div className='relative z-10 w-full max-w-120 bg-white p-8 sm:px-12 sm:py-12 rounded-3xl shadow-[0_8px_50px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center min-h-125 text-center text-slate-800'>
        {/* Checkmark Icon centered */}
        <div className='w-14 h-14 bg-green-600 rounded-full flex items-center justify-center mb-6 shadow-md shadow-green-600/20'>
          <Check className='w-7 h-7 text-white stroke-3' />
        </div>

        {/* Headings */}
        <h2 className='text-2xl font-bold text-[#344499] flex items-center justify-center gap-2 mb-2'>
          Your profile is complete <span>🎉</span>
        </h2>
        <p className='text-[13px] text-slate-400 font-medium mb-10 tracking-wide'>
          You can now access your dashboard and start learning.
        </p>

        {/* Feature Cards Grid */}
        <div className='grid grid-cols-3 gap-3 w-full mb-12'>
          {/* Access Courses */}
          <div className='bg-[#f8faff] rounded-xl p-4 flex flex-col items-center justify-center gap-3 border border-slate-100 transition-transform hover:scale-105'>
            <div className='text-[#344499]'>
              <FileText className='w-5 h-5 fill-[#344499]/10' />
            </div>
            <span className='text-[11px] font-semibold text-[#344499] tracking-wide whitespace-nowrap'>
              Access Courses
            </span>
          </div>

          {/* Track Progress */}
          <div className='bg-[#f8faff] rounded-xl p-4 flex flex-col items-center justify-center gap-3 border border-slate-100 transition-transform hover:scale-105'>
            <div className='text-[#344499]'>
              <Home className='w-5 h-5 fill-[#344499]/10' />
            </div>
            <span className='text-[11px] font-semibold text-[#344499] tracking-wide whitespace-nowrap'>
              Track Progress
            </span>
          </div>

          {/* Join Community */}
          <div className='bg-[#f8faff] rounded-xl p-4 flex flex-col items-center justify-center gap-3 border border-slate-100 transition-transform hover:scale-105'>
            <div className='text-[#344499]'>
              <Users className='w-5 h-5 fill-[#344499]/10' />
            </div>
            <span className='text-[11px] font-semibold text-[#344499] tracking-wide whitespace-nowrap'>
              Join Community
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className='w-full mt-auto'>
          <Button
            type='button'
            className='w-full bg-[#344499] hover:bg-[#2c3983] text-white h-12 text-[14px] font-semibold tracking-wide rounded-lg shadow-md transition-colors'
            onClick={handleDashboard}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
