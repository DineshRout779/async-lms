import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Check, FileText, Home, Users } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

export default function SuccessStep() {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  const handleDashboard = () => {
    navigate(`/dashboard/${user?.role || 'student'}`);
  };

  return (
    <div 
      className='min-h-screen flex items-center justify-center bg-[#344499] p-4 text-slate-800'
      style={{ fontFamily: "'Noto Sans', sans-serif" }}
    >
      <div className='w-full max-w-[480px] bg-white p-8 sm:px-12 sm:py-12 rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center min-h-[500px] text-center'>
        
        {/* Checkmark Icon centered */}
        <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center mb-6 shadow-md shadow-green-600/20">
          <Check className="w-7 h-7 text-white stroke-[3]" />
        </div>

        {/* Headings */}
        <h2 className='text-[26px] font-extrabold text-[#344499] flex items-center justify-center gap-2 mb-2'>
          Your profile is complete <span>🎉</span>
        </h2>
        <p className="text-[12px] text-slate-400 font-medium mb-10 tracking-wide">
          You can now access your dashboard and start learning.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-3 gap-3 w-full mb-12">
          {/* Access Courses */}
          <div className="bg-[#f8faff] rounded-xl p-4 flex flex-col items-center justify-center gap-3 border border-slate-100 transition-transform hover:scale-105">
            <div className="text-[#344499]">
              <FileText className="w-5 h-5 fill-[#344499]/10" />
            </div>
            <span className="text-[10px] font-extrabold text-[#344499] tracking-wide whitespace-nowrap">Access Courses</span>
          </div>

          {/* Track Progress */}
          <div className="bg-[#f8faff] rounded-xl p-4 flex flex-col items-center justify-center gap-3 border border-slate-100 transition-transform hover:scale-105">
            <div className="text-[#344499]">
              <Home className="w-5 h-5 fill-[#344499]/10" />
            </div>
            <span className="text-[10px] font-extrabold text-[#344499] tracking-wide whitespace-nowrap">Track Progress</span>
          </div>

          {/* Join Community */}
          <div className="bg-[#f8faff] rounded-xl p-4 flex flex-col items-center justify-center gap-3 border border-slate-100 transition-transform hover:scale-105">
            <div className="text-[#344499]">
              <Users className="w-5 h-5 fill-[#344499]/10" />
            </div>
            <span className="text-[10px] font-extrabold text-[#344499] tracking-wide whitespace-nowrap">Join Community</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full mt-auto">
          <Button
            type="button"
            className="w-full bg-[#344499] hover:bg-[#2c3983] text-white h-12 text-[14px] font-extrabold tracking-wide rounded-lg shadow-md transition-colors"
            onClick={handleDashboard}
          >
            Go to dashboard
          </Button>
        </div>

      </div>
    </div>
  );
}
