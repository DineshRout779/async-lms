import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  BookOpen,
  Lock,
  // ClipboardCheck,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import apiClient from '@/services/api';

/* =======================
   Types
======================= */

interface AdminStats {
  totalStudents: number;
  totalColleges: number;
  totalSubjects: number;
  totalFacilitators: number;
}

interface RecentActivity {
  full_name: string;
  email: string;
  created_at: string;
}

interface AdminDashboardResponse {
  stats: AdminStats;
  recentActivity: RecentActivity[];
}

/* =======================
   Component
======================= */

export default function AdminHome() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result =
          await apiClient.get<AdminDashboardResponse>('/admin/stats');
        setData(result.data);
      } catch {
        // data remains null — the null check below shows a fallback UI
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className='flex h-screen w-full items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    );
  }

  if (!data) {
    return (
      <div className='flex h-screen w-full items-center justify-center text-slate-500'>
        Failed to load dashboard data
      </div>
    );
  }

  const { stats, recentActivity } = data;

  const statsConfig = [
    {
      label: 'Total Colleges',
      value: stats.totalColleges,
      trend: 'Registered Institutions',
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Students',
      value: stats.totalStudents.toLocaleString(),
      trend: 'Enrolled Users',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Course Subjects',
      value: stats.totalSubjects,
      trend: 'Total Content',
      icon: BookOpen,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Facilitators',
      value: stats.totalFacilitators,
      trend: 'Active Staff',
      icon: Lock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className='p-6 space-y-8 animate-in fade-in duration-500'>
      {/* Statistics Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {statsConfig.map((stat) => (
          <Card key={stat.label} className='border-none shadow-sm'>
            <CardContent className='p-5 flex flex-col justify-between h-32'>
              <div className='flex justify-between items-start'>
                <div>
                  <p className='text-sm font-medium text-slate-500'>
                    {stat.label}
                  </p>
                  <h3 className='text-2xl font-bold text-slate-900 mt-1'>
                    {stat.value}
                  </h3>
                </div>
                <div className={`${stat.bg} p-2.5 rounded-xl`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className='text-xs font-medium text-emerald-600 mt-2'>
                {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Card */}
      <Card className='border-none shadow-sm p-6'>
        <h3 className='text-lg font-bold text-[#1e2653] mb-6'>
          Pending Actions
        </h3>

        {/* <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-8'>
          <ActionCard
            icon={Lock}
            title='Unlock Requests'
            subtitle='Content access pending'
            color='orange'
            button='Review'
          />
          <ActionCard
            icon={ClipboardCheck}
            title='Evaluations'
            subtitle='Submissions to grade'
            color='blue'
            button='Grade'
          />
        </div> */}

        {/* Recent Activity */}
        <div>
          <h4 className='text-sm font-bold text-slate-900 mb-4 pb-4 border-b'>
            Recent Activity
          </h4>

          <div className='space-y-6'>
            {recentActivity.length === 0 && (
              <p className='text-sm text-slate-400'>
                No recent activity found.
              </p>
            )}

            {recentActivity.map((user, idx) => (
              <div key={idx} className='flex gap-4'>
                <div className='w-2 h-2 rounded-full bg-blue-600 mt-1.5' />
                <div>
                  <p className='text-sm text-slate-600'>
                    User{' '}
                    <span className='font-bold text-slate-900 underline'>
                      {user.full_name}
                    </span>{' '}
                    joined via {user.email}
                  </p>
                  <p className='text-xs text-slate-400 mt-1'>
                    {new Date(user.created_at).toLocaleDateString()} at{' '}
                    {new Date(user.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* =======================
   Small Helper Component
======================= */

// function ActionCard({
//   icon: Icon,
//   title,
//   subtitle,
//   color,
//   button,
// }: {
//   icon: React.ElementType;
//   title: string;
//   subtitle: string;
//   color: 'orange' | 'blue';
//   button: string;
// }) {
//   const styles =
//     color === 'orange'
//       ? 'bg-orange-50/50 border-orange-100 text-orange-600'
//       : 'bg-blue-50/50 border-blue-100 text-blue-600';

//   return (
//     <div
//       className={`flex items-center justify-between p-4 border rounded-xl ${styles}`}
//     >
//       <div className='flex items-center gap-4'>
//         <div className='bg-white p-2.5 rounded-lg shadow-sm'>
//           <Icon className='w-5 h-5' />
//         </div>
//         <div>
//           <p className='font-bold text-sm text-slate-900'>{title}</p>
//           <p className='text-xs text-slate-500'>{subtitle}</p>
//         </div>
//       </div>
//       <Button
//         variant='outline'
//         size='sm'
//         className='bg-white text-xs font-bold px-5'
//       >
//         {button}
//       </Button>
//     </div>
//   );
// }
