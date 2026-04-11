import FacilitatorSidebar from '@/components/common/facilitator/FacilitatorSidebar';
import FacilitatorHeader from '@/components/common/facilitator/FacilitatorHeader';
import { useSidebarState } from '@/hooks/useSidebarState';
import { Outlet } from 'react-router';

const FacilitatorDashboardLayout = () => {
  const [isSidebarOpen, toggleSidebar] = useSidebarState('sidebar:facilitator');

  return (
    <div className='flex h-screen bg-slate-100 overflow-hidden'>
      <FacilitatorSidebar
        isOpen={isSidebarOpen}
        toggle={() => toggleSidebar()}
      />

      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        <FacilitatorHeader toggleSidebar={() => toggleSidebar()} />

        <main className='flex-1 overflow-y-auto p-6 custom-scrollbar'>
          <div className='max-w-400 mx-auto'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default FacilitatorDashboardLayout;
