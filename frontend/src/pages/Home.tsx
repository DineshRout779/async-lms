import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, UserSquare2 } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function Home() {
  const navigate = useNavigate();
  const gotoLogin = (user_type: string) => {
    navigate(`/login?user_type=${user_type}`);
  };
  return (
    <div className='min-h-screen w-full bg-muted flex items-center justify-center'>
      <div className='max-w-3xl w-full px-6 text-center'>
        {/* Logo */}
        <div className='flex justify-center mb-6'>
          <div className='h-12 w-12 rounded-xl bg-foreground text-background flex items-center justify-center'>
            <GraduationCap className='h-6 w-6' />
          </div>
        </div>

        {/* Title */}
        <h1 className='text-3xl font-bold text-foreground'>
          Welcome to CodeGuru LMS
        </h1>
        <p className='text-sm text-muted-foreground mt-2'>
          Select your role to continue
        </p>

        {/* Role Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10'>
          <Card
            onClick={() => gotoLogin('student')}
            className='cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 bg-indigo-50'
          >
            <CardContent className='flex flex-col items-center justify-center py-10'>
              <GraduationCap className='h-10 w-10 text-indigo-600 mb-4' />
              <p className='font-medium text-foreground'>I am a Student</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => gotoLogin('instructer')}
            className='cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 bg-indigo-50'
          >
            <CardContent className='flex flex-col items-center justify-center py-10'>
              <UserSquare2 className='h-10 w-10 text-indigo-600 mb-4' />
              <p className='font-medium text-foreground'>I am an Instructor</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
