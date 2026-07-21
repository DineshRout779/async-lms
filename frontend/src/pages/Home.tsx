import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, MonitorPlay } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { selectAuth } from '@/features/auth/authSelectors';
import Logo from '@/components/common/Logo';
import SEO from '@/components/common/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const [step, setStep] = useState<'welcome' | 'role'>('welcome');
  const { isAuthenticated, user, status, token } = useAppSelector(selectAuth);
  const navigate = useNavigate();
  const isResolvingSession = !!token && status === 'loading' && !user;

  const handleRoleSelect = (role: string) => {
    navigate(`/login?user_type=${role}`);
  };

  useEffect(() => {
    if (isResolvingSession || !isAuthenticated || !user) return;

    if (user.role === 'admin') {
      navigate('/dashboard/admin');
    } else if (user.role === 'facilitator') {
      navigate('/dashboard/facilitator');
    } else if (user.role === 'student') {
      navigate(
        user.onboarding_step !== 'done'
          ? `/onboarding/${user.onboarding_step}`
          : '/dashboard/student',
      );
    }
  }, [isResolvingSession, isAuthenticated, user, navigate]);

  if (isResolvingSession) {
    return (
      <div className='min-h-screen w-full flex items-center justify-center bg-[#344499]'>
        <Logo className='h-16 w-16 animate-pulse' />
      </div>
    );
  }

  return (
    <>
      <SEO title='Welcome' description='Welcome to CodeGuru LMS' />
      <div
        className='min-h-screen w-full relative bg-cover bg-center overflow-hidden'
        style={{ backgroundImage: 'url("/bg-students.jpg")' }}
      >
        {/* Blue tinted overlay */}
        <div className='absolute inset-0 bg-[#344499]/80 backdrop-blur-[2px]' />

        <div className='relative z-10 w-full h-screen flex items-center justify-center px-4'>
          <AnimatePresence mode='wait'>
            {step === 'welcome' ? (
              <motion.div
                key='welcome'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className='flex flex-col items-center text-center w-full max-w-sm sm:max-w-none mx-auto'
              >
                <Logo className='h-[120px] w-[120px] sm:h-32 sm:w-32 mb-6 sm:mb-10' />
                <h1 className='text-white text-[22px] sm:text-4xl font-bold mb-10 tracking-tight'>
                  Welcome to CodeGuru!
                </h1>
                <Button
                  onClick={() => setStep('role')}
                  className='bg-white text-slate-900 sm:text-[#344499] hover:bg-slate-100 sm:hover:text-[#344499] w-[240px] sm:w-auto h-10 sm:h-12 sm:px-12 text-[13px] sm:text-lg font-bold rounded-md sm:rounded-xl transition-all shadow-lg sm:shadow-xl hover:shadow-white/20 active:scale-95 cursor-pointer'
                >
                  Continue
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key='role'
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className='w-full max-w-2xl flex flex-col items-center text-center'
              >
                {/* Small Logo & Brand */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className='flex flex-col items-center mb-8'
                >
                  <Logo className='h-12 w-12 mb-2' />
                  <span className='text-white font-bold text-[15px] sm:text-lg tracking-wide'>
                    CodeGuru
                  </span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className='text-white text-[19px] sm:text-4xl font-extrabold mb-1'
                >
                  Welcome to CodeGuru LMS
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className='text-blue-100/90 text-[10px] sm:text-sm font-medium mb-10 sm:mb-12 tracking-wide'
                >
                  Select your role to continue
                </motion.p>

                <div className='grid grid-cols-2 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-[320px] sm:max-w-xl'>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Card
                      onClick={() => handleRoleSelect('student')}
                      className='group cursor-pointer bg-white border-0 shadow-xl sm:shadow-2xl hover:bg-slate-50 transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 rounded-lg sm:rounded-3xl h-[90px] sm:h-auto flex flex-col items-center justify-center'
                    >
                      <CardContent className='flex flex-col items-center justify-center p-0 sm:py-12 sm:px-6 w-full'>
                        <div className='flex items-center justify-center mb-2.5 sm:mb-6 sm:h-20 sm:w-20 sm:bg-[#344499]/5 sm:rounded-2xl group-hover:scale-110 sm:group-hover:scale-100 sm:group-hover:bg-[#344499]/10 transition-all duration-300'>
                          <GraduationCap className='h-6 w-6 sm:h-10 sm:w-10 text-[#29367c] sm:text-[#344499]' strokeWidth={1.75} />
                        </div>
                        <p className='font-bold text-slate-800 sm:text-[#344499] text-[9px] sm:text-lg'>
                          I am a Student
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Card
                      onClick={() => handleRoleSelect('facilitator')}
                      className='group cursor-pointer bg-white border-0 shadow-xl sm:shadow-2xl hover:bg-slate-50 transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 rounded-lg sm:rounded-3xl h-[90px] sm:h-auto flex flex-col items-center justify-center'
                    >
                      <CardContent className='flex flex-col items-center justify-center p-0 sm:py-12 sm:px-6 w-full'>
                        <div className='flex items-center justify-center mb-2.5 sm:mb-6 sm:h-20 sm:w-20 sm:bg-[#344499]/5 sm:rounded-2xl group-hover:scale-110 sm:group-hover:scale-100 sm:group-hover:bg-[#344499]/10 transition-all duration-300'>
                          <MonitorPlay className='h-6 w-6 sm:h-10 sm:w-10 text-[#29367c] sm:text-[#344499]' strokeWidth={1.75} />
                        </div>
                        <p className='font-bold text-slate-800 sm:text-[#344499] text-[9px] sm:text-lg'>
                          I am an Instructor
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
