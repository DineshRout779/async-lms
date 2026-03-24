import { useAppSelector } from '@/app/hooks';
import Logo from '@/components/common/Logo';
import SEO from '@/components/common/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { selectAuth } from '@/features/auth/authSelectors';
import { GraduationCap, UserSquare2 } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export default function Home() {
  const { isAuthenticated, user } = useAppSelector(selectAuth);
  const navigate = useNavigate();
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
    <>
    <SEO
      title='Learn to Code'
      description='CodeGuru is a modern Learning Management System for coding education. Master programming with structured courses, hands-on exercises, and a live code editor.'
    />
    <div
      className='min-h-screen relative bg-cover bg-center w-full'
      style={{
        backgroundImage:
          'url("https://images.pexels.com/photos/34803974/pexels-photo-34803974.jpeg")',
      }}
    >
      {/* Blue tinted overlay */}
      <div className='absolute inset-0 bg-blue-800/70 backdrop-blur-sm' />

      <div className='relative z-10 min-h-screen flex items-center justify-center px-4'>
        <div className='w-full max-w-2xl py-16 text-center'>
          {/* Logo */}
          <div className='flex flex-col items-center mb-8'>
            <div className='h-16 w-16 mb-2'>
              <Logo />
            </div>
            <span className='text-white font-semibold text-base tracking-wide'>
              CodeGuru
            </span>
          </div>

          {/* Title */}
          <h1 className='text-4xl font-bold text-white mb-2'>
            Welcome to CodeGuru LMS
          </h1>
          <p className='text-sm text-blue-100'>Select your role to continue</p>

          {/* Role Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12'>
            <Card
              onClick={() => gotoLogin('student')}
              className='cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 bg-white border-0 shadow-lg'
            >
              <CardContent className='flex flex-col items-center justify-center py-12'>
                <GraduationCap className='h-10 w-10 text-indigo-600 mb-4' />
                <p className='font-semibold text-gray-800'>I am a Student</p>
              </CardContent>
            </Card>

            <Card
              onClick={() => gotoLogin('facilitator')}
              className='cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 bg-white border-0 shadow-lg'
            >
              <CardContent className='flex flex-col items-center justify-center py-12'>
                <UserSquare2 className='h-10 w-10 text-indigo-600 mb-4' />
                <p className='font-semibold text-gray-800'>
                  I am a Facilitator
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
