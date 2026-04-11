import { useSidebarState } from '@/hooks/useSidebarState';
import StudentSidebar from '@/components/common/student/StudentSidebar';
import StudentHeader from '@/components/common/student/StudentHeader';
import { Outlet } from 'react-router';

const StudentDashboardLayout = () => {
  const [isSidebarOpen, toggleSidebar] = useSidebarState('sidebar:student');

  return (
    <div className='flex h-screen bg-slate-50/50 overflow-hidden'>
      <StudentSidebar
        isOpen={isSidebarOpen}
        onToggle={() => toggleSidebar()}
      />

      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        <StudentHeader
          toggleSidebar={() => toggleSidebar()}
          isSidebarOpen={isSidebarOpen}
        />

        <main className='flex-1 overflow-y-auto custom-scrollbar'>
          <div className=''>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboardLayout;
