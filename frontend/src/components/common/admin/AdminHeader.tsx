import { Search, Bell, Menu, LogOut, UserCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppDispatch } from '@/app/hooks';
import { logout } from '@/features/auth/authSlice';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';

export default function AdminHeader({
  toggleSidebar,
}: {
  toggleSidebar: () => void;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    <header className='h-16 bg-white border-b flex items-center justify-between px-6 shrink-0'>
      <div className='flex items-center gap-6'>
        <button
          onClick={toggleSidebar}
          className='text-slate-500 hover:text-slate-900 transition-colors'
        >
          <Menu size={20} />
        </button>
        {/* Title matches image */}
        <h2 className='text-xl font-bold text-[#1e2653]'>Evaluations</h2>
      </div>

      <div className='flex items-center gap-4'>
        {/* Search Bar - Specific to the image */}
        <div className='relative hidden lg:block w-72'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4' />
          <input
            type='text'
            placeholder='Search...'
            className='w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
          />
        </div>

        {/* Filter Pill */}
        <Button
          variant='outline'
          size='sm'
          className='hidden sm:flex rounded-full border-blue-100 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold px-4'
        >
          All Colleges
        </Button>

        {/* Notifications and Profile Dropdown */}
        <div className='flex items-center gap-2'>
          <button className='p-2 text-slate-400 hover:text-slate-600 relative'>
            <Bell size={20} />
            <span className='absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white'></span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className='p-2 text-slate-400 hover:text-blue-600 outline-none transition-colors'>
                <UserCircle size={24} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56 mt-2'>
              <DropdownMenuLabel className='font-normal'>
                <div className='flex flex-col space-y-1'>
                  <p className='text-sm font-medium leading-none text-[#1e2653]'>
                    Admin User
                  </p>
                  <p className='text-xs leading-none text-muted-foreground'>
                    admin@codeguru.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className='cursor-pointer gap-2'>
                <Settings size={16} /> Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className='cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50'
              >
                <LogOut size={16} /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
