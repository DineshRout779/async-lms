import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AssignmentCard,
  type Assignment,
} from '@/components/common/student/AssignmentCard';
import { Loader2 } from 'lucide-react';

// This would eventually move to your database/API
const INITIAL_DATA: Assignment[] = [
  {
    id: '1',
    title: 'Personal Portfolio Website',
    description:
      'Build a responsive personal portfolio using HTML, CSS, and JavaScript.',
    course: 'Full Stack Web Development',
    dueDate: 'March 02, 2026',
    status: 'PENDING',
  },
  {
    id: '2',
    title: 'E-commerce API Integration',
    description: 'Fetch products from a dummy API and display them in a grid.',
    course: 'Advanced React Patterns',
    dueDate: 'Apr 02, 2026',
    status: 'PENDING',
  },
  {
    id: '3',
    title: 'Task Manager Backend',
    description: 'Build a RESTful API using Node.js and Express.',
    course: 'Node.js Performance Tuning',
    dueDate: 'May 02, 2026',
    status: 'COMPLETED',
    score: 92,
  },
];

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // 1. Simulate data fetching from an API
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        setAssignments(INITIAL_DATA);
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // 2. Client-side filtering logic
  const filteredAssignments = assignments.filter((item) => {
    if (filter === 'all') return true;
    return item.status.toLowerCase() === filter.toLowerCase();
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

          {/* 3. Link Tabs to the 'filter' state */}
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

        {/* 4. Conditional Rendering based on Loading and Filter state */}
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
