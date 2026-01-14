// src/pages/NotFound.tsx
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className='h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] p-4 text-center'>
      <div className='relative mb-8'>
        {/* Decorative background element */}
        <div className='absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-50 scale-150' />
        <div className='relative bg-white p-6 rounded-2xl shadow-xl border border-slate-100'>
          <FileQuestion className='w-24 h-24 text-blue-600 animate-bounce' />
        </div>
      </div>

      <h1 className='text-6xl font-black text-[#1e2653] mb-4 tracking-tight'>
        404
      </h1>
      <h2 className='text-2xl font-bold text-slate-800 mb-2'>Page Not Found</h2>
      <p className='text-slate-500 max-w-md mb-8 leading-relaxed'>
        Oops! The page you're looking for doesn't exist or has been moved. Let's
        get you back on track.
      </p>

      <div className='flex flex-col sm:flex-row gap-4'>
        <Button
          variant='outline'
          onClick={() => window.history.back()}
          className='gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold'
        >
          <ArrowLeft className='w-4 h-4' /> Go Back
        </Button>
        <Link to='/'>
          <Button className='bg-[#2563eb] hover:bg-blue-700 font-bold gap-2 px-8'>
            <Home className='w-4 h-4' /> Home Page
          </Button>
        </Link>
      </div>
    </div>
  );
}
