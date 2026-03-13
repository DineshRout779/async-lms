import { TrendingUp } from 'lucide-react';

const FacilitatorStudentGrowth = () => {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center'>
      <div className='w-16 h-16 rounded-2xl bg-[#1e2653] flex items-center justify-center'>
        <TrendingUp size={32} className='text-yellow-400' />
      </div>
      <h1 className='text-2xl font-bold text-slate-800'>Student Growth</h1>
      <p className='text-slate-500 max-w-sm'>
        Monitor individual student progress and learning trajectories over time. This feature is coming soon.
      </p>
    </div>
  );
};

export default FacilitatorStudentGrowth;