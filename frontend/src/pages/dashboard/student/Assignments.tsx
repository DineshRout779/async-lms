import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CollegeAssignmentCard } from '@/components/common/student/CollegeAssignmentCard';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/services/api';
import type { CollegeAssignment } from '@/utils/types';

type TabType = 'All' | 'Pending' | 'Completed';

export default function Assignments() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<CollegeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('All');

  const fetchAssignments = () => {
    setLoading(true);
    apiClient
      .get<{ success: boolean; data: CollegeAssignment[] }>('/college-assignments')
      .then((res) => setAssignments(res.data.data))
      .catch(() => {
        // assignments remains empty — empty state is shown below
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const filteredAssignments = assignments.filter((item) => {
    const isSubmitted = Boolean(item.submission_link || item.submission_file_url);
    if (activeTab === 'Pending' && isSubmitted) return false;
    if (activeTab === 'Completed' && !isSubmitted) return false;
    return true;
  });

  const tabs: TabType[] = ['All', 'Pending', 'Completed'];

  return (
    <div className='min-h-screen bg-[#F8FAFC] p-6 md:p-12 animate-in fade-in duration-500'>
      <div className='max-w-7xl mx-auto space-y-10'>
        {/* Header Section */}
        <div className='flex flex-col md:flex-row md:items-start justify-between gap-6'>
          <div className='space-y-1'>
            <h1 className='text-3xl font-bold text-[#1E293B]'>
              Assignments
            </h1>
            <p className='text-[#64748B] text-sm'>
              Track and submit your projects
            </p>
          </div>

          <div className='flex items-center p-1 bg-[#F1F5F9] rounded-xl'>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === tab
                    ? 'bg-[#1E293B] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {[...Array(6)].map((_, i) => (
              <div key={i} className='bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4'>
                <div className='flex items-start justify-between'>
                  <Skeleton className='h-5 w-2/3' />
                  <Skeleton className='h-6 w-16 rounded-full' />
                </div>
                <Skeleton className='h-4 w-1/2' />
                <Skeleton className='h-4 w-3/4' />
                <Skeleton className='h-10 w-full rounded-xl mt-2' />
              </div>
            ))}
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {filteredAssignments.map((item) => (
              <CollegeAssignmentCard
                key={item.id}
                assignment={item}
                onClick={() => navigate(`/dashboard/student/assignments/${item.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className='bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] py-24 text-center space-y-4'>
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
               <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className='text-slate-900 font-bold text-xl'>
                No assignments found
              </p>
              <p className="text-slate-500 max-w-xs mx-auto text-sm">
                Try adjusting your search or filters to find what you're looking for.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
