import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Check, FileText, Home, Users } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import { loadUser } from '@/features/auth/authThunks';
import { useEffect } from 'react';

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
      className='min-h-screen flex items-center justify-center bg-[#344499] p-4 text-slate-800'
    >
      <div className='w-full max-w-[480px] bg-white p-5 sm:px-12 sm:py-12 rounded-xl sm:rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center min-h-[350px] sm:min-h-[500px] text-center'>
        
        {/* Checkmark Icon centered */}
        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-md shadow-green-600/20">
          <Check className="w-5 h-5 sm:w-7 sm:h-7 text-white stroke-[3]" />
        </div>

        {/* Headings */}
        <h2 className='text-base sm:text-2xl font-bold text-[#344499] flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2'>
          Your profile is complete <span>🎉</span>
        </h2>
        <p className="text-[7px] sm:text-[13px] text-slate-400 font-medium mb-6 sm:mb-10 tracking-wide">
          You can now access your dashboard and start learning.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full mb-8 sm:mb-12">
          {/* Access Courses */}
          <div className="bg-[#f8faff] rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center gap-1.5 sm:gap-3 border border-slate-100 transition-transform hover:scale-105">
            <div className="text-[#344499]">
              <FileText className="w-3 h-3 sm:w-5 sm:h-5 fill-[#344499]/10" />
            </div>
            <span className="text-[6px] sm:text-[11px] font-semibold text-[#344499] tracking-wide whitespace-nowrap">Access Courses</span>
          </div>

          {/* Track Progress */}
          <div className="bg-[#f8faff] rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center gap-1.5 sm:gap-3 border border-slate-100 transition-transform hover:scale-105">
            <div className="text-[#344499]">
              <Home className="w-3 h-3 sm:w-5 sm:h-5 fill-[#344499]/10" />
            </div>
            <span className="text-[6px] sm:text-[11px] font-semibold text-[#344499] tracking-wide whitespace-nowrap">Track Progress</span>
          </div>

          {/* Join Community */}
          <div className="bg-[#f8faff] rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center gap-1.5 sm:gap-3 border border-slate-100 transition-transform hover:scale-105">
            <div className="text-[#344499]">
              <Users className="w-3 h-3 sm:w-5 sm:h-5 fill-[#344499]/10" />
            </div>
            <span className="text-[6px] sm:text-[11px] font-semibold text-[#344499] tracking-wide whitespace-nowrap">Join Community</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full mt-auto">
          <Button
            type="button"
            className="w-full bg-[#344499] hover:bg-[#2c3983] text-white h-8 sm:h-12 text-[9px] sm:text-[14px] font-semibold tracking-wide rounded-md sm:rounded-lg shadow-md transition-colors"
            onClick={handleDashboard}
          >
            Go to dashboard
          </Button>
        </div>

      </div>
    </div>
  );
}
