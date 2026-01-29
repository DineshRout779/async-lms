import { useState } from 'react';
import StudentSidebar from '@/components/common/student/StudentSidebar';
import StudentHeader from '@/components/common/student/StudentHeader';
import { Outlet } from 'react-router';

const StudentDashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className='flex h-screen bg-slate-50/50 overflow-hidden'>
      {/* Sidebar: Pass the state and the toggle function.
         We don't need a wrapper div here if the aside is handled inside the component.
      */}
      <StudentSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Area */}
      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        <StudentHeader
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
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
