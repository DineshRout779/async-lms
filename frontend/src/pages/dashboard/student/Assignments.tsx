import { useEffect, useState } from 'react';
import { CollegeAssignmentCard } from '@/components/common/student/CollegeAssignmentCard';
import { CollegeAssignmentModal } from '@/components/common/student/CollegeAssignmentModal';
import { Loader2 } from 'lucide-react';
import apiClient from '@/services/api';
import type { CollegeAssignment } from '@/utils/types';

export default function Assignments() {
  const [assignments, setAssignments] = useState<CollegeAssignment[]>([]);
  const [selected, setSelected] = useState<CollegeAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: CollegeAssignment[] }>('/college-assignments')
      .then((res) => setAssignments(res.data?.data || []))
      .catch((err) => console.error('Failed to fetch assignments:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className='min-h-screen bg-slate-50/50 p-6 md:p-12 animate-in fade-in duration-500'>
      <div className='max-w-7xl mx-auto space-y-8'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-extrabold text-slate-900 tracking-tight'>
            Assignments
          </h1>
          <p className='text-slate-500'>Assignments posted by your college</p>
        </div>

        {loading ? (
          <div className='flex flex-col items-center justify-center h-64 space-y-4'>
            <Loader2 className='w-10 h-10 animate-spin text-indigo-600' />
            <p className='text-slate-400 font-medium'>Loading assignments...</p>
          </div>
        ) : assignments.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
            {assignments.map((item) => (
              <CollegeAssignmentCard
                key={item.id}
                assignment={item}
                onClick={() => setSelected(item)}
              />
            ))}
          </div>
        ) : (
          <div className='bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center'>
            <p className='text-slate-500'>
              No assignments from your college yet.
            </p>
          </div>
        )}
      </div>

      <CollegeAssignmentModal
        assignment={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
