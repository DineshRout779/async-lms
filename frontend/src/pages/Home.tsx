import { useState, useEffect } from 'react';
import { useAppSelector } from '@/app/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { selectAuth } from '@/features/auth/authSelectors';
// import { GraduationCap, UserSquare2 } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function Home() {
  const { isAuthenticated, user } = useAppSelector(selectAuth);
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const gotoLogin = (user_type: string) => {
    navigate(`/login?user_type=${user_type}`);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // STUDENT FLOW
    if (user.role === 'student') {
      if (user.onboarding_step !== 'done') {
        navigate(`/onboarding/${user.onboarding_step}`);
      } else {
        navigate('/dashboard/student');
      }
      return;
    }

    // FACILITATOR FLOW
    if (user.role === 'facilitator') {
      navigate('/dashboard/facilitator');
      return;
    }

    // ADMIN FLOW
    if (user.role === 'admin') {
      navigate('/dashboard/admin');
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div 
      className="min-h-screen w-full relative flex flex-col items-center justify-center text-white"
      style={{ fontFamily: "'Noto Sans', sans-serif" }}
    >
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-students.jpg')" }}
      />
      {/* Dual overlay for rich deep blue effect */}
      <div className="absolute inset-0 z-10 bg-[#344499]/90 mix-blend-multiply" />
      <div className="absolute inset-0 z-10 bg-[#344499]/70" />

      {/* Content Container */}
      <div className="z-20 flex flex-col items-center justify-center w-full px-6 max-w-4xl text-center">
        {step === 1 ? (
          <div className="flex flex-col items-center animate-in fade-in duration-700">
            {/* Official Logo */}
            <div className="relative mb-8 flex items-center justify-center w-36 h-40">
              <img src="/logo.png" alt="CodeGuru" className="w-full h-full object-contain drop-shadow-xl" />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-10 tracking-tight">
              Welcome to CodeGuru!
            </h1>

            <button
              onClick={() => setStep(2)}
              className="bg-white text-[#344499] px-14 py-3.5 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl active:scale-95"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 fade-in duration-500 w-full">
            {/* Small Logo */}
            <div className="relative mb-4 flex items-center justify-center w-20 h-24">
              <img src="/logo.png" alt="CodeGuru" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            
            <h2 className="text-sm font-bold tracking-widest uppercase mb-6 text-white/90">CodeGuru</h2>
            
            <h1 className='text-3xl md:text-4xl font-bold mb-2'>
              Welcome to CodeGuru LMS
            </h1>
            <p className='text-white/80 mb-12 text-sm'>
              Select your role to continue
            </p>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl'>
              <Card
                onClick={() => gotoLogin('student')}
                className='cursor-pointer transition-all duration-300 hover:scale-[1.03] bg-white border-0 shadow-2xl rounded-xl'
              >
                <CardContent className='flex flex-col gap-5 items-center justify-center py-10'>
                  {/* Custom Graduation Cap SVG matching design */}
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 10L12 5L2 10L12 15L22 10Z" stroke="#344499" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 12V17C6 19 8 20 12 20C16 20 18 19 18 17V12" stroke="#344499" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 10V18" stroke="#344499" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className='font-semibold text-gray-900 text-lg'>I am a Student</p>
                </CardContent>
              </Card>

              <Card
                onClick={() => gotoLogin('facilitator')}
                className='cursor-pointer transition-all duration-300 hover:scale-[1.03] bg-white border-0 shadow-2xl rounded-xl'
              >
                <CardContent className='flex flex-col gap-5 items-center justify-center py-10'>
                  {/* Custom Instructor SVG matching design */}
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Board */}
                    <rect x="10" y="4" width="12" height="10" rx="1.5" stroke="#344499" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    {/* Eraser ledge */}
                    <rect x="14" y="11.5" width="4" height="2.5" fill="#344499" />
                    {/* Person Body */}
                    <path d="M7.5 13C4 13 2 15 2 18.5V20H13V18.5C13 15 11 13 7.5 13Z" fill="#344499"/>
                    {/* Person Head */}
                    <circle cx="7.5" cy="8.5" r="3.5" fill="#344499"/>
                  </svg>
                  <p className='font-semibold text-gray-900 text-lg'>I am an Instructor</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
