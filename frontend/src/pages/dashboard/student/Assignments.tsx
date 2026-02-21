import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AssignmentCard,
  type Assignment,
} from '@/components/common/student/AssignmentCard';
import { Loader2 } from 'lucide-react';
import apiClient from '@/services/api';

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<{ success: boolean; data: Omit<Assignment, 'status'>[] }>('/students/assignments');
        const data = (response.data?.data || []).map((a) => ({
          ...a,
          status: 'PENDING' as const,
        }));
        setAssignments(data);
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  const filteredAssignments = assignments.filter((item) => {
    if (filter === 'all') return true;
    return (item.status ?? '').toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className='min-h-screen bg-slate-50/50 p-6 md:p-12 animate-in fade-in duration-500'>
      <div className='max-w-7xl mx-auto space-y-8'>
        <header className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-3xl font-extrabold text-slate-900 tracking-tight'>
              Assignments
            </h1>
            <p className='text-slate-500'>Track and submit your projects</p>
          </div>

          <Tabs
            defaultValue='all'
            className='w-fit'
            onValueChange={(value) => setFilter(value)}
          >
            <TabsList className='bg-white border shadow-sm p-1'>
              <TabsTrigger
                value='all'
                className='px-6 data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all'
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value='pending'
                className='px-6 data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all'
              >
                Pending
              </TabsTrigger>
              <TabsTrigger
                value='completed'
                className='px-6 data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all'
              >
                Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        {loading ? (
          <div className='flex flex-col items-center justify-center h-64 space-y-4'>
            <Loader2 className='w-10 h-10 animate-spin text-indigo-600' />
            <p className='text-slate-400 font-medium'>Loading assignments...</p>
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
            {filteredAssignments.map((item) => (
              <AssignmentCard key={item.id} assignment={item} />
            ))}
          </div>
        ) : (
          <div className='bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center'>
            <p className='text-slate-500'>No {filter} assignments found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
