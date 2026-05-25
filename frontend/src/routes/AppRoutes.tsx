import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Loader2 } from 'lucide-react';
import App from '@/App';
import PrivateRoute from './PrivateRoute';
import ErrorBoundary from '@/components/common/ErrorBoundary';

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
const ConfirmStep = lazy(() => import('@/pages/onboarding/ConfirmStep'));
const SuccessStep = lazy(() => import('@/pages/onboarding/SuccessStep'));

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
const CollegeAssignmentView = lazy(
  () => import('@/pages/dashboard/student/CollegeAssignmentView'),
);
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
const ResumeBuilder = lazy(
  () => import('@/pages/dashboard/student/ResumeBuilder'),
);
const CourseViewLayout = lazy(() => import('@/layouts/CourseLayout'));

// Facilitator Dashboard
const FacilitatorDashboardLayout = lazy(
  () => import('@/layouts/FacilitatorDashboardLayout'),
);
const FacilitatorHome = lazy(
  () => import('@/pages/dashboard/facilitator/FacilitatorHome'),
);
const FacilitatorStudents = lazy(
  () => import('@/pages/dashboard/facilitator/FacilitatorUsers'),
);
const FacilitatorEvaluations = lazy(
  () => import('@/pages/dashboard/facilitator/FacilitatorEvaluations'),
);
const ResultsPage = lazy(
  () => import('@/pages/dashboard/facilitator/ResultsPage'),
);
const FacilitatorAnalytics = lazy(
  () => import('@/pages/dashboard/facilitator/FacilitatorAnalytics'),
);
const FacilitatorStudentGrowth = lazy(
  () => import('@/pages/dashboard/facilitator/FacilitatorStudentGrowth'),
);
const FacilitatorReports = lazy(
  () => import('@/pages/dashboard/facilitator/FacilitatorReports'),
);
const FacilitatorSettings = lazy(
  () => import('@/pages/dashboard/facilitator/FacilitatorSettings'),
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
const AssignmentManagement = lazy(
  () => import('@/pages/dashboard/admin/AssignmentManagement'),
);
const CreateAssignment = lazy(
  () => import('@/pages/dashboard/admin/CreateAssignment'),
);
const AssignmentSuccess = lazy(
  () => import('@/pages/dashboard/admin/AssignmentSuccess'),
);
const Evaluations = lazy(
  () => import('@/pages/dashboard/admin/Evaluations'),
);
const AdminProfile = lazy(
  () => import('@/pages/dashboard/admin/AdminProfile'),
);

// AI Curriculum Builder (shared)
const AiCurriculumList = lazy(
  () => import('@/pages/dashboard/shared/AiCurriculumList'),
);
const AiCurriculumBuilder = lazy(
  () => import('@/pages/dashboard/shared/AiCurriculumBuilder'),
);
const AiCurriculumEditor = lazy(
  () => import('@/pages/dashboard/shared/AiCurriculumEditor'),
);
const AiCurriculumReview = lazy(
  () => import('@/pages/dashboard/shared/AiCurriculumReview'),
);
const AiCurriculumPreview = lazy(
  () => import('@/pages/dashboard/shared/AiCurriculumPreview'),
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
              { path: 'confirm', element: <ConfirmStep /> },
              { path: 'success', element: <SuccessStep /> },
            ],
          },

          {
            path: 'dashboard/student',
            element: <StudentDashboardLayout />,
            children: [
              { index: true, element: <StudentDashboardHome /> },
              { path: 'editor-profile', element: <EditorProfile /> },
              { path: 'assignments', element: <Assignments /> },
              { path: 'assignments/:id', element: <CollegeAssignmentView /> },
              { path: 'ai-assistant', element: <Assistant /> },
              { path: 'leaderboard', element: <Leaderboard /> },
              { path: 'profile', element: <StudentProfile /> },
              { path: 'settings', element: <StudentSettings /> },
              { path: 'resume-builder', element: <ResumeBuilder /> },
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
              { path: 'students', element: <FacilitatorStudents /> },
              { path: 'assignments', element: <AssignmentManagement /> },
              { path: 'create-assignment', element: <CreateAssignment /> },
              { path: 'assignment-success', element: <AssignmentSuccess /> },
              { path: 'evaluations', element: <FacilitatorEvaluations /> },
              { path: 'results/:id', element: <ResultsPage /> },
              { path: 'ai-curriculum', element: <AiCurriculumList /> },
              { path: 'ai-curriculum/new', element: <AiCurriculumBuilder /> },
              { path: 'ai-curriculum/:id/edit', element: <AiCurriculumEditor /> },
              { path: 'ai-curriculum/:id/preview', element: <AiCurriculumPreview /> },
              { path: 'ai-curriculum/:id/review', element: <AiCurriculumReview /> },
              { path: 'analytics', element: <FacilitatorAnalytics /> },
              { path: 'student-growth', element: <FacilitatorStudentGrowth /> },
              { path: 'reports', element: <FacilitatorReports /> },
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
              {
                path: 'assignment-management',
                element: <AssignmentManagement />,
              },
              {
                path: 'create-assignment',
                element: <CreateAssignment />,
              },
              {
                path: 'assignment-success',
                element: <AssignmentSuccess />,
              },
              { path: 'evaluations', element: <Evaluations /> },
              { path: 'results/:id', element: <ResultsPage /> },
              { path: 'profile', element: <AdminProfile /> },
              { path: 'ai-curriculum', element: <AiCurriculumList /> },
              { path: 'ai-curriculum/new', element: <AiCurriculumBuilder /> },
              { path: 'ai-curriculum/:id/edit', element: <AiCurriculumEditor /> },
              { path: 'ai-curriculum/:id/preview', element: <AiCurriculumPreview /> },
              { path: 'ai-curriculum/:id/review', element: <AiCurriculumReview /> },
            ],
          },
        ],
      },

      { path: '*', element: <NotFound /> },
    ],
  },
]);

const PageLoader = () => (
  <div className='flex h-screen items-center justify-center'>
    <Loader2 className='h-8 w-8 animate-spin text-indigo-600' />
  </div>
);

// ---------- App Routes ----------

const AppRoutes = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default AppRoutes;
