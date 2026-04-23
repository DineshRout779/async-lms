import { Menu, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import NotificationBell from '@/components/common/NotificationBell';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import { logout } from '@/features/auth/authSlice';
import { useNavigate, useLocation } from 'react-router';
import toast from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TITLES: Record<string, string> = {
  '/dashboard/facilitator': 'Dashboard',
  '/dashboard/facilitator/students': 'Students',
  '/dashboard/facilitator/assignments': 'Assignments',
  '/dashboard/facilitator/create-assignment': 'Create Assignment',
  '/dashboard/facilitator/assignment-success': 'Assignment Success',
  '/dashboard/facilitator/evaluations': 'Evaluations',
  '/dashboard/facilitator/analytics': 'Analytics',
  '/dashboard/facilitator/student-growth': 'Student Growth',
  '/dashboard/facilitator/reports': 'Reports',
  '/dashboard/facilitator/settings': 'Settings',
  '/dashboard/facilitator/ai-curriculum': 'AI Curriculum Builder',
};

export default function FacilitatorHeader({ toggleSidebar }: { toggleSidebar: () => void }) {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const title = TITLES[pathname] ?? pathname.split('/').at(-1)?.replace(/-/g, ' ') ?? 'Facilitator';

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    <header className='h-16 bg-white border-b flex items-center justify-between px-6 shrink-0'>
      <div className='flex items-center gap-4'>
        <button
          onClick={toggleSidebar}
          className='p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100'
          aria-label='Toggle Sidebar'
        >
          <Menu className='w-5 h-5' />
        </button>
        <h2 className='text-xl font-bold text-[#1e2653] capitalize'>{title}</h2>
      </div>

      <div className='flex items-center gap-3'>
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className='flex items-center gap-2 cursor-pointer group p-1 rounded-lg hover:bg-slate-50 transition-all'>
              <div className='w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0'>
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.full_name || 'Facilitator'}`}
                  alt='avatar'
                  className='w-full h-full object-cover'
                />
              </div>
              <ChevronDown className='w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-data-[state=open]:rotate-180' />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align='end' className='w-60 p-2 mt-2 shadow-xl border-slate-200'>
            <DropdownMenuLabel className='font-normal p-2'>
              <p className='text-sm font-bold text-[#1e2653]'>{user?.full_name || 'Facilitator'}</p>
              <p className='text-[11px] text-slate-500 truncate'>{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className='cursor-pointer py-2.5 rounded-md gap-2'
              onClick={() => navigate('/dashboard/facilitator/settings')}
            >
              <User className='h-4 w-4 text-slate-400' />
              <span className='text-sm font-medium'>My Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer py-2.5 rounded-md gap-2'
              onClick={() => navigate('/dashboard/facilitator/settings')}
            >
              <Settings className='h-4 w-4 text-slate-400' />
              <span className='text-sm font-medium'>Account Settings</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className='cursor-pointer py-2.5 rounded-md text-red-600 focus:text-red-700 focus:bg-red-50 gap-2'
              onClick={handleLogout}
            >
              <LogOut className='h-4 w-4' />
              <span className='text-sm font-bold'>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
