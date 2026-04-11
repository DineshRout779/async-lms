import {
  LayoutDashboard,
  Users,
  Settings,
  ClipboardList,
  CheckSquare,
  BarChart2,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import Logo from '../Logo';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/facilitator' },
  { name: 'Students', icon: Users, path: '/dashboard/facilitator/students' },
  {
    name: 'Assignments',
    icon: ClipboardList,
    path: '/dashboard/facilitator/assignments',
  },
  {
    name: 'Evaluations',
    icon: CheckSquare,
    path: '/dashboard/facilitator/evaluations',
  },
  {
    name: 'Analytics',
    icon: BarChart2,
    path: '/dashboard/facilitator/analytics',
  },
  {
    name: 'Student Growth',
    icon: TrendingUp,
    path: '/dashboard/facilitator/student-growth',
  },
  { name: 'Reports', icon: FileText, path: '/dashboard/facilitator/reports' },
  { name: 'Settings', icon: Settings, path: '/dashboard/facilitator/settings' },
];

export default function FacilitatorSidebar({
  isOpen,
}: {
  isOpen: boolean;
  toggle: () => void;
}) {
  const user = useAppSelector(selectUser);

  return (
    <aside
      className={cn(
        'h-full flex flex-col transition-all duration-300 bg-slate-900 text-slate-300',
        isOpen ? 'w-64' : 'w-20',
      )}
    >
      {/* Brand Header */}
      <div className='h-16 flex items-center gap-3 px-6 shrink-0 mt-4'>
        <Logo className='h-12 w-12' iconOnly={!isOpen} />
        {isOpen && (
          <span className='font-bold text-xl text-white tracking-tight'>
            CodeGuru
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className='flex-1 py-4 px-3 space-y-1 overflow-y-auto uppercase'>
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/dashboard/facilitator'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg transition-all group',
                isActive
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'hover:bg-slate-800 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={20}
                  className={cn(
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-slate-300',
                  )}
                />
                {isOpen && (
                  <span className='font-medium text-[12px] tracking-wider'>
                    {item.name}
                  </span>
                )}
                {isActive && isOpen && (
                  <div className='ml-auto w-1.5 h-1.5 rounded-full bg-yellow-400' />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Section - Bottom */}
      <div className='p-4 border-t border-slate-800 bg-slate-900'>
        <div
          className={cn('flex items-center gap-3', !isOpen && 'justify-center')}
        >
          <div className='w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shrink-0'>
            {user?.full_name?.charAt(0) || 'F'}
          </div>
          {isOpen && (
            <div className='min-w-0'>
              <p className='text-sm font-bold text-white truncate'>
                {user?.full_name || 'Facilitator'}
              </p>
              <p className='text-[11px] text-yellow-400 font-medium truncate leading-tight'>
                Facilitator
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
