import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from '@/App';
import PrivateRoute from './PrivateRoute';
import FacilitatorSettings from '@/pages/dashboard/facilitator/FacilitatorSettings';

// ---------- Lazy Imports ----------

// Public
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const CodeEditor = lazy(() => import('@/pages/CodeEditor'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const PendingVerification = lazy(() => import('@/pages/PendingVerification'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));

// Onboarding
const CollegeStep = lazy(() => import('@/pages/onboarding/CollegeStep'));
const BatchStep = lazy(() => import('@/pages/onboarding/BatchStep'));
const ProgramStep = lazy(() => import('@/pages/onboarding/ProgramStep'));
const FacilitatorOnboarding = lazy(
  () => import('@/pages/onboarding/FacilitatorOnboarding'),
);

// Student Dashboard
const StudentDashboardLayout = lazy(
  () => import('@/layouts/StudentDashboardLayout'),
);
const StudentDashboardHome = lazy(
  () => import('@/pages/dashboard/student/StudentDashboardHome'),
);
const MyCourses = lazy(() => import('@/pages/dashboard/student/MyCourses'));
const LessonView = lazy(() => import('@/pages/dashboard/student/Lesson'));
const AssignmentView = lazy(
  () => import('@/pages/dashboard/student/AssignmentView'),
);
const CapstoneView = lazy(
  () => import('@/pages/dashboard/student/CapstoneView'),
);
const CourseIntro = lazy(() => import('@/pages/dashboard/student/CourseIntro'));
const EditorProfile = lazy(() => import('@/pages/playground/EditorProfile'));
const Assignments = lazy(() => import('@/pages/dashboard/student/Assignments'));
const Assistant = lazy(() => import('@/pages/dashboard/student/Assistant'));
const Leaderboard = lazy(() => import('@/pages/dashboard/student/Leaderboard'));
const StudentProfile = lazy(
  () => import('@/pages/dashboard/student/StudentProfile'),
);
const StudentSettings = lazy(
  () => import('@/pages/dashboard/student/StudentSettings'),
);
const CourseViewLayout = lazy(() => import('@/layouts/CourseLayout'));

// Facilitator Dashboard
const FacilitatorDashboardLayout = lazy(
  () => import('@/layouts/FacilitatorDashboardLayout'),
);
const FacilitatorHome = lazy(
  () => import('@/pages/dashboard/facilitator/FacilitatorHome'),
);
const FacilitatorUsers = lazy(
  () => import('@/pages/dashboard/facilitator/FacilitatorUsers'),
);

// Admin Dashboard
const AdminDashboardLayout = lazy(
  () => import('@/layouts/AdminDashboardLayout'),
);
const AdminHome = lazy(() => import('@/pages/dashboard/admin/AdminHome'));
const AdminColleges = lazy(
  () => import('@/pages/dashboard/admin/AdminColleges'),
);
const AdminCourses = lazy(() => import('@/pages/dashboard/admin/AdminCourses'));
const LearningFlow = lazy(() => import('@/pages/dashboard/admin/LearningFlow'));
const LockControl = lazy(() => import('@/pages/dashboard/admin/LockControl'));
const Students = lazy(() => import('@/pages/dashboard/admin/Users'));
const Analytics = lazy(() => import('@/pages/dashboard/admin/Analytics'));
const AdminSettings = lazy(
  () => import('@/pages/dashboard/admin/AdminSettings'),
);

// ---------- Router ----------

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'auth/callback', element: <AuthCallback /> },
      { path: 'code-editor', element: <CodeEditor /> },
      { path: 'pending-verification', element: <PendingVerification /> },

      {
        element: <PrivateRoute />,
        children: [
          {
            path: 'onboarding',
            children: [
              { path: 'college', element: <CollegeStep /> },
              { path: 'batch', element: <BatchStep /> },
              { path: 'program', element: <ProgramStep /> },
              { path: 'facilitator', element: <FacilitatorOnboarding /> },
            ],
          },

          {
            path: 'dashboard/student',
            element: <StudentDashboardLayout />,
            children: [
              { index: true, element: <StudentDashboardHome /> },
              { path: 'editor-profile', element: <EditorProfile /> },
              { path: 'assignments', element: <Assignments /> },
              { path: 'ai-assistant', element: <Assistant /> },
              { path: 'leaderboard', element: <Leaderboard /> },
              { path: 'profile', element: <StudentProfile /> },
              { path: 'settings', element: <StudentSettings /> },
              { path: 'courses', element: <MyCourses /> },
              {
                path: 'courses/:slug',
                element: <CourseViewLayout />,
                children: [
                  { index: true, element: <CourseIntro /> },
                  {
                    path: 'lesson/:subtopicSlug',
                    element: <LessonView />,
                  },
                  {
                    path: 'exercise/:exerciseId',
                    element: <LessonView />,
                  },
                  {
                    path: 'assignment/:assignmentId',
                    element: <AssignmentView />,
                  },
                  {
                    path: 'quiz/:quizId',
                    element: <LessonView />,
                  },
                  {
                    path: 'capstone/:projectId',
                    element: <CapstoneView />,
                  },
                ],
              },
            ],
          },

          {
            path: 'dashboard/facilitator',
            element: <FacilitatorDashboardLayout />,
            children: [
              { index: true, element: <FacilitatorHome /> },
              { path: 'users', element: <FacilitatorUsers /> },
              { path: 'settings', element: <FacilitatorSettings /> },
            ],
          },

          {
            path: 'dashboard/admin',
            element: <AdminDashboardLayout />,
            children: [
              { index: true, element: <AdminHome /> },
              { path: 'colleges', element: <AdminColleges /> },
              { path: 'courses', element: <AdminCourses /> },
              { path: 'learning-flow', element: <LearningFlow /> },
              { path: 'lock-control', element: <LockControl /> },
              { path: 'users', element: <Students /> },
              { path: 'analytics', element: <Analytics /> },
              { path: 'settings', element: <AdminSettings /> },
            ],
          },
        ],
      },

      { path: '*', element: <NotFound /> },
    ],
  },
]);

// ---------- App Routes ----------

const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <div className='h-screen flex items-center justify-center text-sm text-muted-foreground'>
          Loading...
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  );
};

export default AppRoutes;
