import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Trophy,
  User,
  Settings,
  MessageSquare,
  LogOut,
  Code,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation, Link, useNavigate } from 'react-router';
import { logout } from '@/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import toast from 'react-hot-toast';
import { selectUser } from '@/features/auth/authSelectors';

interface StudentSidebarProps {
  isOpen: boolean; // Added isOpen to match Admin layout state
  onToggle: () => void;
}

type MenuItem = {
  name: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
};

const menuItems: MenuItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/student' },
  { name: 'My Courses', icon: BookOpen, path: '/dashboard/student/courses' },
  {
    name: 'Assignments',
    icon: ClipboardList,
    path: '/dashboard/student/assignments',
  },
  {
    name: 'Code Playground',
    icon: Code,
    path: '/dashboard/student/editor-profile',
  },
  { name: 'Leaderboard', icon: Trophy, path: '/dashboard/student/leaderboard' },
  {
    name: 'AI Assistant',
    icon: MessageSquare,
    path: '/dashboard/student/ai-assistant',
  },
  { name: 'Profile', icon: User, path: '/dashboard/student/profile' },
  { name: 'Settings', icon: Settings, path: '/dashboard/student/settings' },
];

export default function StudentSidebar({ isOpen }: StudentSidebarProps) {
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <aside
      className={cn(
        'h-full flex flex-col transition-all duration-300 bg-white text-[#1e2653] border-r border-[#ebe5e5] shrink-0 overflow-hidden',
        isOpen ? 'w-64' : 'w-20',
      )}
    >
      {/* Brand Header matching Admin */}
      <div className='h-16 flex items-center justify-between px-6 shrink-0'>
        <div className='flex items-center gap-3'>
          <div className='h-8 w-8 rounded-lg bg-[#facc15] flex items-center justify-center text-slate-900 font-bold shrink-0'>
            C
          </div>
          {isOpen && (
            <span className='font-bold text-xl text-[#1e2653] tracking-tight'>
              CodeGuru
            </span>
          )}
        </div>

        {/* <button
          onClick={onToggle}
          className='p-1.5 rounded-lg text-slate-400 hover:bg-[#2a3469] hover:text-white transition-colors'
        >
          <PanelLeftClose
            className={cn(
              'w-4 h-4 transition-transform',
              !isOpen && 'rotate-180'
            )}
          />
        </button> */}
      </div>

      {/* Navigation Links */}
      <nav className='flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar'>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                'flex items-center justify-center gap-3 px-3 py-3 rounded-lg transition-all group relative',
                isActive
                  ? 'bg-[#333d7c] text-white shadow-sm'
                  : 'hover:bg-[#f4f5f8] hover:text-[#1e2653]',
              )}
            >
              <item.icon
                size={20}
                className={cn(
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 group-hover:text-[#1e2653]',
                )}
              />

              {isOpen && (
                <>
                  <span className='font-medium text-[14px] flex-1'>
                    {item.name}
                  </span>
                  {item?.badge && !isActive && (
                    <span className='bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full '>
                      {item?.badge}
                    </span>
                  )}
                  {isActive && (
                    <div className='w-1.5 h-1.5 rounded-full bg-yellow-400' />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section - Bottom matching Admin */}
      <div className='p-4 border-t border-[#ebe5e5]'>
        <div
          className={cn('flex items-center gap-3', !isOpen && 'justify-center')}
        >
          <div className='w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shrink-0 shadow-inner'>
            S
          </div>
          {isOpen && (
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-bold text-[#1e2653] truncate leading-tight'>
                {user?.full_name}
              </p>
              <p className='text-[11px] text-slate-400 font-medium truncate'>
                {user?.role}
              </p>
            </div>
          )}
          {isOpen && (
            <button
              onClick={handleLogout}
              className='p-1.5 text-slate-400 hover:text-red-400 transition-colors'
              title='Logout'
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
