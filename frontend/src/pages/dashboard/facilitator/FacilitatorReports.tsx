import { FileText } from 'lucide-react';

const FacilitatorReports = () => {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center'>
      <div className='w-16 h-16 rounded-2xl bg-[#1e2653] flex items-center justify-center'>
        <FileText size={32} className='text-yellow-400' />
      </div>
      <h1 className='text-2xl font-bold text-slate-800'>Reports</h1>
      <p className='text-slate-500 max-w-sm'>
        Generate and export reports on student performance and course outcomes. This feature is coming soon.
      </p>
    </div>
  );
};

export default FacilitatorReports;