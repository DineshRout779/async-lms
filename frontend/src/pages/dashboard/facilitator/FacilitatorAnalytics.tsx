import { BarChart2 } from 'lucide-react';

const FacilitatorAnalytics = () => {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center'>
      <div className='w-16 h-16 rounded-2xl bg-[#1e2653] flex items-center justify-center'>
        <BarChart2 size={32} className='text-yellow-400' />
      </div>
      <h1 className='text-2xl font-bold text-slate-800'>Analytics</h1>
      <p className='text-slate-500 max-w-sm'>
        Track engagement, completion rates, and performance across your subjects. This feature is coming soon.
      </p>
    </div>
  );
};

export default FacilitatorAnalytics;