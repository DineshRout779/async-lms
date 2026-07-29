import { useEffect, useState } from 'react';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import {
  BookOpen, CheckSquare, FileText, TrendingUp, Trophy,
  CheckCircle2, XCircle, Loader2, Zap, Star, Clock, Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/services/api';

type Metrics = {
  quizzes_attempted: number;
  avg_quiz_score: number;
  assignments_submitted: number;
  assignments_pending: number;
  projects_completed: number;
  current_streak: number;
  last_activity: string | null;
  days_since_active: number;
  total_xp: number;
};

type RecentQuiz = {
  id: string;
  name: string;
  score: number;
  status: 'Passed' | 'Failed';
};

type TopicRow = {
  topic_id: string;
  topic_title: string;
  quiz_score: number;
  quiz_max: number;
  assignment_status: 'Submitted' | 'Pending';
  project_status: 'Approved' | 'Submitted' | 'Not Started' | null;
  progress: number;
};

type SubjectGroup = {
  subject_id: string;
  subject_name: string;
  topics: TopicRow[];
};

function StatCard({ label, value, icon: Icon, iconColor, bgColor }: {
  label: string; value: string | number;
  icon: React.ElementType; iconColor: string; bgColor: string;
}) {
  return (
    <Card className='border-none shadow-sm hover:shadow-md transition-all duration-300'>
      <CardContent className='pt-6 flex flex-col items-center text-center'>
        <div className={`p-3 rounded-full mb-3 ${bgColor}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className='text-3xl font-bold tracking-tight text-slate-900'>{value}</div>
        <p className='text-[11px] uppercase font-bold text-slate-500 tracking-widest mt-1'>{label}</p>
      </CardContent>
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-emerald-50 text-emerald-700',
  Approved: 'bg-blue-50 text-blue-700',
  Pending: 'bg-amber-50 text-amber-700',
  'Not Started': 'bg-slate-100 text-slate-500',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

export default function StudentAnalytics() {
  const user = useAppSelector(selectUser);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [subjects, setSubjects] = useState<SubjectGroup[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/students/analytics'),
      apiClient.get('/students/analytics/modules'),
    ])
      .then(([summaryRes, modulesRes]) => {
        setMetrics(summaryRes.data.data.metrics);
        setRecentQuizzes(summaryRes.data.data.recent_quizzes);
        setSubjects(modulesRes.data.data);
        setOverallProgress(modulesRes.data.overall_progress || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className='p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500'>
      <div>
        <p className='text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1'>
          Student Dashboard / Analytics
        </p>
        <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>Performance Dashboard</h1>
        <p className='text-sm text-slate-500 mt-1'>
          Viewing analytics for{' '}
          <span className='font-semibold text-slate-700'>{user?.full_name || 'Student'}</span>
        </p>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-24'>
          <Loader2 className='w-7 h-7 animate-spin text-indigo-500' />
        </div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <StatCard
              label='Overall Progress'
              value={`${overallProgress}%`}
              icon={Target}
              iconColor='text-indigo-600'
              bgColor='bg-indigo-50'
            />
            <StatCard
              label='Learning Streak'
              value={`${metrics?.current_streak ?? 0} Days`}
              icon={Zap}
              iconColor='text-orange-600'
              bgColor='bg-orange-50'
            />
            <StatCard
              label='Total XP Earned'
              value={metrics?.total_xp ?? 0}
              icon={Star}
              iconColor='text-yellow-600'
              bgColor='bg-yellow-50'
            />
            <StatCard
              label='Last Active'
              value={metrics?.days_since_active === 0 ? 'Today' : `${metrics?.days_since_active ?? 0}d ago`}
              icon={Clock}
              iconColor='text-emerald-600'
              bgColor='bg-emerald-50'
            />
            <StatCard
              label='Quizzes Attempted'
              value={metrics?.quizzes_attempted ?? 0}
              icon={BookOpen}
              iconColor='text-blue-600'
              bgColor='bg-blue-50'
            />
            <StatCard
              label='Avg Quiz Score'
              value={`${metrics?.avg_quiz_score ?? 0}%`}
              icon={TrendingUp}
              iconColor='text-teal-600'
              bgColor='bg-teal-50'
            />
            <StatCard
              label='Assignments Submitted'
              value={metrics?.assignments_submitted ?? 0}
              icon={CheckSquare}
              iconColor='text-cyan-600'
              bgColor='bg-cyan-50'
            />
            <StatCard
              label='Projects Completed'
              value={metrics?.projects_completed ?? 0}
              icon={Trophy}
              iconColor='text-purple-600'
              bgColor='bg-purple-50'
            />
          </div>

          {/* Per-module breakdown */}
          {subjects.length > 0 && subjects.map((subject) => (
            <Card key={subject.subject_id} className='border-none shadow-sm overflow-hidden'>
              <CardHeader className='border-b border-slate-100 bg-white/50 px-6 py-4'>
                <CardTitle className='text-lg font-bold text-slate-800'>{subject.subject_name}</CardTitle>
              </CardHeader>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead className='bg-slate-50 text-xs text-slate-500 uppercase font-semibold'>
                    <tr>
                      <th className='text-left px-6 py-4 w-1/3'>Module</th>
                      <th className='text-left px-6 py-4'>Progress</th>
                      <th className='text-left px-6 py-4'>Quiz Score</th>
                      <th className='text-left px-6 py-4'>Assignment</th>
                      <th className='text-left px-6 py-4'>Project</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {subject.topics.map((topic) => (
                      <tr key={topic.topic_id} className='hover:bg-slate-50 transition-colors'>
                        <td className='px-6 py-4 font-semibold text-slate-800'>{topic.topic_title}</td>
                        <td className='px-6 py-4'>
                          <div className='flex items-center gap-3'>
                            <div className='w-full bg-slate-100 rounded-full h-2 min-w-[80px] overflow-hidden flex'>
                              <div
                                className='bg-indigo-500 h-2 rounded-full transition-all duration-1000'
                                style={{ width: `${topic.progress}%` }}
                              />
                            </div>
                            <span className='text-sm font-semibold text-slate-700 min-w-[32px]'>
                              {topic.progress}%
                            </span>
                          </div>
                        </td>
                        <td className='px-6 py-4 text-slate-600'>
                          {topic.quiz_max > 0
                            ? `${topic.quiz_score}/${topic.quiz_max}`
                            : <span className='text-slate-400 text-xs'>No quiz</span>}
                        </td>
                        <td className='px-6 py-4'>
                          <StatusBadge status={topic.assignment_status} />
                        </td>
                        <td className='px-6 py-4'>
                          {topic.project_status
                            ? <StatusBadge status={topic.project_status} />
                            : <span className='text-slate-400 text-xs'>No project</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          {/* Recent Quizzes */}
          <Card className='border-none shadow-sm overflow-hidden'>
            <CardHeader className='border-b border-slate-100 bg-white/50 px-6 py-4'>
              <CardTitle className='text-lg font-bold text-slate-800'>Recent Quizzes</CardTitle>
            </CardHeader>
            {recentQuizzes.length === 0 ? (
              <div className='flex items-center justify-center py-16 text-sm text-slate-400'>
                No quiz attempts yet
              </div>
            ) : (
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
                    {recentQuizzes.map((quiz) => (
                      <tr key={quiz.id} className='hover:bg-slate-50 transition-colors'>
                        <td className='px-6 py-4 font-semibold text-slate-800'>{quiz.name}</td>
                        <td className='px-6 py-4 font-medium text-slate-600'>{quiz.score}%</td>
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
            )}
          </Card>
        </>
      )}
    </div>
  );
}
