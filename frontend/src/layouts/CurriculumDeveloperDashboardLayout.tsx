import AdminHeader from '@/components/common/admin/AdminHeader';
import CurriculumDeveloperSidebar from '@/components/common/curriculum-developer/CurriculumDeveloperSidebar';
import { useSidebarState } from '@/hooks/useSidebarState';
import { Outlet, Navigate } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';

const CurriculumDeveloperDashboardLayout = () => {
  const [isSidebarOpen, toggleSidebar] = useSidebarState('sidebar:curriculum-developer');
  const user = useAppSelector(selectUser);

  if (user?.role !== 'curriculum_developer') {
    return <Navigate to='/' replace />;
  }

  return (
    <div className='flex h-screen bg-slate-100 overflow-hidden'>
      <CurriculumDeveloperSidebar
        isOpen={isSidebarOpen}
        toggle={() => toggleSidebar()}
      />

      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        <AdminHeader toggleSidebar={() => toggleSidebar()} />

        <main className='flex-1 overflow-y-auto p-6 custom-scrollbar'>
          <div className='max-w-400 mx-auto'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default CurriculumDeveloperDashboardLayout;
