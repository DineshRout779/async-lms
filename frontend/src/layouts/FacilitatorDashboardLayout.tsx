// import AdminHeader from '@/components/common/admin/AdminHeader';
import FacilitatorSidebar from '@/components/common/facilitator/FacilitatorSidebar';
import { useState } from 'react';
import { Outlet } from 'react-router';

const FacilitatorDashboardLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className='flex h-screen bg-slate-100 overflow-hidden'>
      {/* Sidebar */}
      <FacilitatorSidebar
        isOpen={isSidebarOpen}
        toggle={() => setSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content */}
      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        {/* <AdminHeader toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} /> */}

        <main className='flex-1 overflow-y-auto custom-scrollbar'>
          <div className='max-w-400 mx-auto'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default FacilitatorDashboardLayout;
