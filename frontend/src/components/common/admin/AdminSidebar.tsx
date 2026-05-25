import {
  LayoutDashboard,
  School,
  BookOpen,
  GitBranch,
  Lock,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router';
import Logo from '../Logo';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/admin' },
  { name: 'Colleges', icon: School, path: '/dashboard/admin/colleges' },
  { name: 'Courses', icon: BookOpen, path: '/dashboard/admin/courses' },
  {
    name: 'Learning Flow',
    icon: GitBranch,
    path: '/dashboard/admin/learning-flow',
  },
  { name: 'Lock Control', icon: Lock, path: '/dashboard/admin/lock-control' },
  { name: 'Users', icon: Users, path: '/dashboard/admin/users' },
  {
    name: 'Assignments',
    icon: ClipboardCheck,
    path: '/dashboard/admin/assignment-management',
  },

  {
    name: 'AI Curriculum',
    icon: Sparkles,
    path: '/dashboard/admin/ai-curriculum',
  },
  { name: 'Analytics', icon: BarChart3, path: '/dashboard/admin/analytics' },
  { name: 'Settings', icon: Settings, path: '/dashboard/admin/settings' },
];

export default function AdminSidebar({
  isOpen,
}: {
  isOpen: boolean;
  toggle: () => void;
}) {
  const currentUser = useAppSelector(selectUser);

  const initials = currentUser?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'A';

  return (
    <aside
      className={cn(
        'h-full flex flex-col transition-all duration-300 bg-[#191C34] text-slate-300',
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
      <nav className='flex-1 py-4 px-3 space-y-1 overflow-y-auto'>
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            // Use 'end' for the Dashboard to prevent it from being active on sub-routes
            end={item.path === '/dashboard/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg transition-all group',
                isActive
                  ? 'bg-[#333d7c] text-white shadow-sm'
                  : 'hover:bg-[#2a3469] hover:text-white',
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
                  <span className='font-medium text-[14px]'>{item.name}</span>
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
      <div className='p-4 border-t border-[#222644] bg-[#191C34]'>
        <div
          className={cn('flex items-center gap-3', !isOpen && 'justify-center')}
        >
          <div className='w-10 h-10 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-bold shrink-0'>
            {initials}
          </div>
          {isOpen && (
            <div className='min-w-0'>
              <p className='text-sm font-bold text-white truncate'>
                {currentUser?.full_name || 'Admin'}
              </p>
              <p className='text-[11px] text-yellow-400 font-medium truncate leading-tight'>
                {currentUser?.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
