import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import { BookOpen, CheckSquare, FileText, TrendingUp, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Mock Data matching the requirements document
const mockMetrics = {
  quizzesAttempted: 15,
  avgQuizScore: 75,
  assignmentsSubmitted: 8,
  assignmentsPending: 2,
  projectsCompleted: 1,
};

const mockRecentQuizzes = [
  { id: '1', name: 'HTML Basics', score: 80, status: 'Passed' },
  { id: '2', name: 'CSS Flexbox', score: 90, status: 'Passed' },
  { id: '3', name: 'JS Functions', score: 45, status: 'Failed' },
];

function StatCard({ label, value, icon: Icon, iconColor, bgColor }: any) {
  return (
    <Card className='border-none shadow-sm hover:shadow-md transition-all duration-300'>
      <CardContent className='pt-6 flex flex-col items-center text-center'>
        <div className={`p-3 rounded-full mb-3 ${bgColor}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className='text-3xl font-bold tracking-tight text-slate-900'>
          {value}
        </div>
        <p className='text-[11px] uppercase font-bold text-slate-500 tracking-widest mt-1'>
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

export default function StudentAnalytics() {
  const user = useAppSelector(selectUser);

  return (
    <div className='p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500'>
      {/* Header */}
      <div>
        <p className='text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1'>
          Student Dashboard / Analytics
        </p>
        <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>
          Performance Dashboard
        </h1>
        <p className='text-sm text-slate-500 mt-1'>
          Viewing analytics for <span className="font-semibold text-slate-700">{user?.full_name || 'Student'}</span>
        </p>
      </div>

      {/* Metrics Grid */}
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'>
        <StatCard
          label='Quizzes Attempted'
          value={mockMetrics.quizzesAttempted}
          icon={BookOpen}
          iconColor='text-indigo-600'
          bgColor='bg-indigo-50'
        />
        <StatCard
          label='Avg Quiz Score'
          value={`${mockMetrics.avgQuizScore}%`}
          icon={TrendingUp}
          iconColor='text-emerald-600'
          bgColor='bg-emerald-50'
        />
        <StatCard
          label='Assignments Submitted'
          value={mockMetrics.assignmentsSubmitted}
          icon={CheckSquare}
          iconColor='text-blue-600'
          bgColor='bg-blue-50'
        />
        <StatCard
          label='Assignments Pending'
          value={mockMetrics.assignmentsPending}
          icon={FileText}
          iconColor='text-amber-600'
          bgColor='bg-amber-50'
        />
        <StatCard
          label='Projects Completed'
          value={mockMetrics.projectsCompleted}
          icon={Trophy}
          iconColor='text-purple-600'
          bgColor='bg-purple-50'
        />
      </div>

      {/* Recent Quizzes Table */}
      <Card className='border-none shadow-sm overflow-hidden'>
        <CardHeader className='border-b border-slate-100 bg-white/50 px-6 py-4'>
          <CardTitle className='text-lg font-bold text-slate-800'>Recent Quizzes</CardTitle>
        </CardHeader>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-slate-50 text-xs text-slate-500 uppercase font-semibold'>
              <tr>
                <th className='text-left px-6 py-4'>Quiz Name</th>
                <th className='text-left px-6 py-4'>Score</th>
                <th className='text-left px-6 py-4'>Status</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {mockRecentQuizzes.map((quiz) => (
                <tr key={quiz.id} className='hover:bg-slate-50 transition-colors'>
                  <td className='px-6 py-4 font-semibold text-slate-800'>
                    {quiz.name}
                  </td>
                  <td className='px-6 py-4 font-medium text-slate-600'>
                    {quiz.score}%
                  </td>
                  <td className='px-6 py-4'>
                    {quiz.status === 'Passed' ? (
                      <Badge className='bg-emerald-50 hover:bg-emerald-50 text-emerald-600 font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit'>
                        <CheckCircle2 className='w-3.5 h-3.5' /> Passed
                      </Badge>
                    ) : (
                      <Badge className='bg-red-50 hover:bg-red-50 text-red-600 font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit'>
                        <XCircle className='w-3.5 h-3.5' /> Failed
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
