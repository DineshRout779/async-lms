import { useEffect, useState } from 'react';
import { Users, BookOpen, Building2, Activity, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/services/api';

function FacilitatorHomeSkeleton() {
  return (
    <div className='p-2 space-y-8'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-56' />
        <Skeleton className='h-4 w-80' />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className='border-none shadow-sm'>
            <CardContent className='p-6 flex flex-col justify-between h-36'>
              <div className='flex justify-between items-start'>
                <div className='space-y-2'>
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-8 w-16' />
                </div>
                <Skeleton className='h-12 w-12 rounded-xl' />
              </div>
              <Skeleton className='h-3 w-32 mt-2' />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <Card className='lg:col-span-2 border-none shadow-sm p-6'>
          <div className='flex items-center gap-2 mb-6'>
            <Skeleton className='h-5 w-5 rounded' />
            <Skeleton className='h-5 w-48' />
          </div>
          <div className='space-y-4'>
            {[...Array(5)].map((_, i) => (
              <div key={i} className='flex items-center justify-between p-3'>
                <div className='flex gap-4 items-center'>
                  <Skeleton className='h-10 w-10 rounded-full' />
                  <div className='space-y-1.5'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-3 w-44' />
                  </div>
                </div>
                <Skeleton className='h-3 w-16' />
              </div>
            ))}
          </div>
        </Card>
        <Card className='border-none shadow-sm p-6 bg-slate-900'>
          <div className='flex items-center gap-2 mb-6'>
            <Skeleton className='h-5 w-5 rounded bg-slate-700' />
            <Skeleton className='h-5 w-32 bg-slate-700' />
          </div>
          <div className='space-y-2'>
            <Skeleton className='h-3 w-full bg-slate-700' />
            <Skeleton className='h-3 w-4/5 bg-slate-700' />
          </div>
          <div className='mt-8 p-4 rounded-xl bg-white/5 space-y-2'>
            <Skeleton className='h-3 w-16 bg-slate-700' />
            <Skeleton className='h-3 w-full bg-slate-700' />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =======================
   Types
======================= */

interface FacilitatorStats {
  totalStudents: number;
  totalColleges: number;
  totalSubjects: number;
}

interface RecentActivity {
  full_name: string;
  email: string;
  created_at: string;
}

interface FacilitatorDashboardResponse {
  stats: FacilitatorStats;
  recentActivity: RecentActivity[];
}

/* =======================
   Component
======================= */

export default function FacilitatorHome() {
  const [data, setData] = useState<FacilitatorDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result =
          await apiClient.get<FacilitatorDashboardResponse>(
            '/facilitator/stats',
          );
        setData(result.data);
      } catch {
        // data remains null — the null check below shows a fallback UI
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <FacilitatorHomeSkeleton />;

  if (!data) {
    return (
      <div className='flex h-96 w-full items-center justify-center text-slate-500'>
        Failed to load dashboard data
      </div>
    );
  }

  const { stats, recentActivity } = data;

  const statsConfig = [
    {
      label: 'My Colleges',
      value: stats.totalColleges,
      trend: 'Assigned Scope',
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Students',
      value: stats.totalStudents.toLocaleString(),
      trend: 'Enrolled in your colleges',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Active Subjects',
      value: stats.totalSubjects,
      trend: 'Content Scope',
      icon: BookOpen,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ];

  return (
    <div className='p-2 space-y-8 animate-in fade-in duration-500'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold text-[#1e2653]'>
          Facilitator Dashboard
        </h1>
        <p className='text-slate-500 text-sm'>
          Welcome back! Here's what's happening in your colleges.
        </p>
      </div>

      {/* Statistics Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {statsConfig.map((stat) => (
          <Card key={stat.label} className='border-none shadow-sm'>
            <CardContent className='p-6 flex flex-col justify-between h-36'>
              <div className='flex justify-between items-start'>
                <div>
                  <p className='text-sm font-medium text-slate-500'>
                    {stat.label}
                  </p>
                  <h3 className='text-3xl font-bold text-slate-900 mt-1'>
                    {stat.value}
                  </h3>
                </div>
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <p className='text-xs font-medium text-slate-400 mt-2'>
                {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Recent Activity */}
        <Card className='lg:col-span-2 border-none shadow-sm p-6'>
          <div className='flex items-center gap-2 mb-6'>
            <Activity className='w-5 h-5 text-blue-600' />
            <h3 className='text-lg font-bold text-[#1e2653]'>
              Recent Student Registrations
            </h3>
          </div>

          <div className='space-y-6'>
            {recentActivity.length === 0 && (
              <p className='text-sm text-slate-400'>
                No recent activity found.
              </p>
            )}

            {recentActivity.map((user, idx) => (
              <div
                key={idx}
                className='flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors'
              >
                <div className='flex gap-4 items-center'>
                  <div className='w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold'>
                    {user.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className='text-sm font-bold text-slate-900 underline'>
                      {user.full_name}
                    </p>
                    <p className='text-xs text-slate-500'>{user.email}</p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-xs text-slate-400'>
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                  <p className='text-[10px] text-slate-300 uppercase font-bold tracking-wider'>
                    Joined
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Links / Info */}
        <Card className='border-none shadow-sm p-6 bg-slate-900 text-white'>
          <div className='flex items-center gap-2 mb-6'>
            <Award className='w-5 h-5 text-yellow-400' />
            <h3 className='text-lg font-bold'>Facilitator Info</h3>
          </div>
          <p className='text-slate-400 text-sm leading-relaxed'>
            As a facilitator, you have access to student data and progress
            within your assigned colleges.
          </p>
          <div className='mt-8 space-y-4'>
            <div className='p-4 rounded-xl bg-white/5 border border-white/10'>
              <p className='text-xs text-slate-500 uppercase font-bold'>
                Pro Tip
              </p>
              <p className='text-sm mt-1'>
                Check the "Students" tab to view detailed course progress for
                each user.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
