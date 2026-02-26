import {
  Flame,
  Star,
  Bell,
  ChevronDown,
  Menu,
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import { logout } from '@/features/auth/authSlice';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function StudentHeader({ toggleSidebar }: HeaderProps) {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Signed out successfully');
    navigate('/');
  };

  return (
    <header className='h-16 border-b bg-white flex items-center justify-between px-4 md:px-8 shrink-0'>
      <div className='flex items-center gap-4'>
        {/* Toggle Button - Matches Admin logic for accessibility */}
        <button
          onClick={toggleSidebar}
          className='p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100'
          aria-label='Toggle Sidebar'
        >
          <Menu className='w-5 h-5' />
        </button>

        {/* Welcome Message */}
        <h1 className='font-bold text-lg text-[#1e2653] hidden sm:block tracking-tight'>
          Good Morning,{' '}
          <span className='text-blue-600 capitalize'>
            {user?.full_name?.split(' ')[0] || 'Student'}!
          </span>
        </h1>
      </div>

      <div className='flex items-center gap-3 md:gap-6'>
        {/* Stats Badges - Gamification items */}
        <div className='hidden lg:flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-100 text-xs font-bold'>
          <Flame className='w-3.5 h-3.5 fill-orange-500' />
          <span>{user?.current_streak ?? 0} DAY STREAK</span>
        </div>

        <div className='hidden lg:flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 text-xs font-bold'>
          <Star className='w-3.5 h-3.5 fill-indigo-500' />
          <span>{(user?.total_points ?? 0).toLocaleString()} XP</span>
        </div>

        {/* Action Controls */}
        <div className='flex items-center gap-2 md:gap-4 pl-4 border-l border-slate-100'>
          {/* Notifications Bell */}
          <button className='relative p-2 text-slate-400 hover:text-slate-600 transition-colors'>
            <Bell className='w-5 h-5' />
            <span className='absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white'></span>
          </button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className='flex items-center gap-2 cursor-pointer group p-1 rounded-lg hover:bg-slate-50 transition-all'>
                <div className='w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-sm'>
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                      user?.full_name || 'Felix'
                    }`}
                    alt='avatar'
                    className='w-full h-full object-cover'
                  />
                </div>
                <ChevronDown className='w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-data-[state=open]:rotate-180' />
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align='end'
              className='w-60 p-2 mt-2 shadow-xl border-slate-200'
            >
              <DropdownMenuLabel className='font-normal p-2'>
                <div className='flex flex-col space-y-1'>
                  <p className='text-sm font-bold text-[#1e2653]'>
                    {user?.full_name || 'Student User'}
                  </p>
                  <p className='text-[11px] text-slate-500 truncate'>
                    {user?.email || 'student@codeguru.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className='bg-slate-100' />

              <DropdownMenuItem
                className='cursor-pointer py-2.5 rounded-md focus:bg-slate-50 gap-2'
                onClick={() => navigate('/dashboard/student/profile')}
              >
                <User className='h-4 w-4 text-slate-400' />
                <span className='text-sm font-medium'>My Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className='cursor-pointer py-2.5 rounded-md focus:bg-slate-50 gap-2'
                onClick={() => navigate('/dashboard/student/settings')}
              >
                <Settings className='h-4 w-4 text-slate-400' />
                <span className='text-sm font-medium'>Account Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className='bg-slate-100' />

              <DropdownMenuItem
                className='cursor-pointer py-2.5 rounded-md text-red-600 focus:text-red-700 focus:bg-red-50 gap-2'
                onClick={handleLogout}
              >
                <LogOut className='h-4 w-4' />
                <span className='text-sm font-bold'>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Primary CTA */}
          <Button
            size='sm'
            onClick={() => navigate('/dashboard/student/courses')}
            className='bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm shadow-blue-100 hidden sm:flex'
          >
            Continue Learning
          </Button>
        </div>
      </div>
    </header>
  );
}
