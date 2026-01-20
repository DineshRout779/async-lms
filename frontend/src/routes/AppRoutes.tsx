import { createBrowserRouter, RouterProvider } from 'react-router';
import App from '@/App';

// Layouts & Auth
import StudentDashboardLayout from '@/layouts/StudentDashboardLayout';

// Public Pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import CodeEditor from '@/pages/CodeEditor';

// Protected Pages
import StudentDashboardHome from '@/pages/dashboard/student/StudentDashboardHome';
import CollegeStep from '@/pages/onboarding/CollegeStep';
import BatchStep from '@/pages/onboarding/BatchStep';
import ProgramStep from '@/pages/onboarding/ProgramStep';
import PrivateRoute from './PrivateRoute';
import MyCourses from '@/pages/dashboard/student/MyCourses';
import AdminDashboardLayout from '@/layouts/AdminDashboardLayout';
import AdminHome from '@/pages/dashboard/admin/AdminHome';
import AdminColleges from '@/pages/dashboard/admin/AdminColleges';
import AdminCourses from '@/pages/dashboard/admin/AdminCourses';
import NotFound from '@/pages/NotFound';
import CourseViewLayout from '@/layouts/CourseLayout';
import LessonView from '@/pages/dashboard/student/Lesson';
import CourseIntro from '@/pages/dashboard/student/CourseIntro';
import EditorProfile from '@/pages/playground/EditorProfile';
import Assignments from '@/pages/dashboard/student/Assignments';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'signup',
        element: <Signup />,
      },
      // editor
      {
        path: 'code-editor',
        element: <CodeEditor />,
      },
      // --- PROTECTED ROUTES (Requires Login) ---
      {
        element: <PrivateRoute />,
        children: [
          // Onboarding Flow
          {
            path: 'onboarding',
            children: [
              { path: 'college', element: <CollegeStep /> },
              { path: 'batch', element: <BatchStep /> },
              { path: 'program', element: <ProgramStep /> },
            ],
          },

          // Student Dashboard
          {
            path: 'dashboard/student',
            element: <StudentDashboardLayout />, // Wrapper for Sidebar + Header
            children: [
              {
                index: true,
                element: <StudentDashboardHome />,
              },
              {
                path: 'editor-profile',
                element: <EditorProfile />,
              },
              {
                path: 'assignments',
                element: <Assignments />,
              },
              // Future dashboard sub-pages go here:
              { path: 'courses', element: <MyCourses /> },
              {
                path: 'courses/:slug',
                element: <CourseViewLayout />,
                children: [
                  {
                    index: true,
                    element: <CourseIntro />, // A "Get Started" page
                  },
                  {
                    path: 'lesson/:subtopicSlug',
                    element: <LessonView />, // The actual content player
                  },
                ],
              },
            ],
          },

          // Facilitator

          // Admin Routes
          {
            path: 'dashboard/admin',
            element: <AdminDashboardLayout />, // Wrapper for Sidebar + Header
            children: [
              {
                index: true,
                element: <AdminHome />,
              },
              // Future dashboard sub-pages go here:
              { path: 'colleges', element: <AdminColleges /> },
              { path: 'courses', element: <AdminCourses /> },
            ],
          },
        ],
      },

      // --- FALLBACKS ---
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;
