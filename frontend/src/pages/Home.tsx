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
        <div className='absolute inset-0 bg-[#344499]/70 backdrop-blur-[2px]' />

        <div className='relative z-10 w-full h-screen flex items-center justify-center px-4'>
          <AnimatePresence mode='wait'>
            {step === 'welcome' ? (
              <motion.div
                key='welcome'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className='flex flex-col items-center text-center'
              >
                <Logo className='h-24 w-24 sm:h-32 sm:w-32 mb-10' />
                <h1 className='text-white text-3xl sm:text-4xl font-bold mb-10 tracking-tight'>
                  Welcome to CodeGuru!
                </h1>
                <Button
                  onClick={() => setStep('role')}
                  className='bg-white cursor-pointer text-[#344499] hover:bg-slate-100 px-12 h-12 text-lg font-bold rounded-xl transition-all shadow-xl hover:shadow-white/20 active:scale-95'
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
                  <span className='text-white font-bold text-lg tracking-wider'>
                    CodeGuru
                  </span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className='text-white text-3xl sm:text-4xl font-extrabold mb-1'
                >
                  Welcome to CodeGuru LMS
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className='text-blue-100/80 text-sm font-medium mb-12'
                >
                  Select your role to continue
                </motion.p>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl'>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Card
                      onClick={() => handleRoleSelect('student')}
                      className='group cursor-pointer bg-white border-0 shadow-2xl hover:bg-slate-50 transition-all duration-300 hover:-translate-y-2 rounded-3xl'
                    >
                      <CardContent className='flex flex-col items-center justify-center py-12 px-6'>
                        <div className='h-20 w-20 bg-[#344499]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#344499]/10 transition-colors'>
                          <GraduationCap className='h-10 w-10 text-[#344499]' />
                        </div>
                        <p className='font-bold text-[#344499] text-lg'>
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
                      className='group cursor-pointer bg-white border-0 shadow-2xl hover:bg-slate-50 transition-all duration-300 hover:-translate-y-2 rounded-3xl'
                    >
                      <CardContent className='flex flex-col items-center justify-center py-12 px-6'>
                        <div className='h-20 w-20 bg-[#344499]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#344499]/10 transition-colors'>
                          <MonitorPlay className='h-10 w-10 text-[#344499]' />
                        </div>
                        <p className='font-bold text-[#344499] text-lg'>
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
