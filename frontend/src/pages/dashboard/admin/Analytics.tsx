import { useEffect, useState } from 'react';
import {
  ClipboardList, Code2, BookOpen, TrendingUp, Users,
  Loader2, CheckSquare, BarChart2, User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/services/api';
import {
  QuizTab, AssignmentsTab, ProjectsTab, BatchTab, StudentsTab,
  type College, type Batch, type Subject,
} from '@/pages/dashboard/shared/EngagementAnalyticsTabs';

// ─── General Analytics types ──────────────────────────────────────────────────

interface AnalyticsData {
  quizStats: { totalAttempts: number; avgScore: number; passedCount: number; passRate: number };
  exerciseStats: { totalSubmissions: number; passedCount: number; passRate: number };
  contentInventory: { topics: number; units: number; subtopics: number; lessons: number; quizzes: number; exercises: number };
  studentsPerCollege: { college: string; count: number }[];
  dailyRegistrations: { label: string; count: number }[];
  subjectActivity: { subject: string; attempts: number; avgScore: number; uniqueStudents: number }[];
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className='h-2 w-full rounded-full bg-slate-100 overflow-hidden'>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor }: {
  icon: React.ElementType; label: string; value: string | number; sub: string; iconBg: string; iconColor: string;
}) {
  return (
    <Card className='border-none shadow-sm'>
      <CardContent className='p-5 flex flex-col justify-between h-28'>
        <div className='flex justify-between items-start'>
          <div>
            <p className='text-sm font-medium text-slate-500'>{label}</p>
            <h3 className='text-2xl font-bold text-slate-900 mt-1'>{value}</h3>
          </div>
          <div className={`${iconBg} p-2.5 rounded-xl`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
        <p className='text-xs text-slate-400 mt-1'>{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── General Analytics tab ────────────────────────────────────────────────────

function GeneralAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<{ success: boolean; data: AnalyticsData }>('/admin/analytics')
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className='flex h-64 items-center justify-center'><Loader2 className='w-8 h-8 animate-spin text-indigo-600' /></div>;
  }

  if (!data) {
    return <div className='flex h-64 items-center justify-center text-slate-400 text-sm'>Failed to load analytics.</div>;
  }

  const { quizStats, exerciseStats, contentInventory, studentsPerCollege, dailyRegistrations, subjectActivity } = data;
  const maxCollegeCount = Math.max(...studentsPerCollege.map((c) => c.count), 1);
  const maxDayCount = Math.max(...dailyRegistrations.map((d) => d.count), 1);
  const maxAttempts = Math.max(...subjectActivity.map((s) => s.attempts), 1);

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard icon={ClipboardList} label='Quiz Attempts' value={quizStats.totalAttempts.toLocaleString()} sub={`${quizStats.passRate}% pass rate · avg ${quizStats.avgScore}`} iconBg='bg-indigo-50' iconColor='text-indigo-600' />
        <StatCard icon={Code2} label='Exercise Submissions' value={exerciseStats.totalSubmissions.toLocaleString()} sub={`${exerciseStats.passRate}% pass rate`} iconBg='bg-emerald-50' iconColor='text-emerald-600' />
        <StatCard icon={BookOpen} label='Content Items' value={(contentInventory.lessons + contentInventory.quizzes + contentInventory.exercises).toLocaleString()} sub={`${contentInventory.lessons} lessons · ${contentInventory.quizzes} quizzes · ${contentInventory.exercises} exercises`} iconBg='bg-amber-50' iconColor='text-amber-600' />
        <StatCard icon={TrendingUp} label='Course Structure' value={contentInventory.topics} sub={`${contentInventory.units} units · ${contentInventory.subtopics} subtopics`} iconBg='bg-violet-50' iconColor='text-violet-600' />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Card className='border-none shadow-sm'>
          <CardHeader className='pb-2 pt-5 px-5'><CardTitle className='text-sm font-semibold text-slate-700 flex items-center gap-2'><Users className='w-4 h-4 text-indigo-500' /> Students per College</CardTitle></CardHeader>
          <CardContent className='px-5 pb-5 space-y-3'>
            {studentsPerCollege.length === 0 ? <p className='text-xs text-slate-400'>No data yet.</p> : studentsPerCollege.map((c) => (
              <div key={c.college} className='space-y-1'>
                <div className='flex justify-between text-xs text-slate-600'><span className='truncate max-w-[70%]'>{c.college}</span><span className='font-semibold text-slate-800'>{c.count}</span></div>
                <Bar pct={(c.count / maxCollegeCount) * 100} color='bg-indigo-400' />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className='border-none shadow-sm'>
          <CardHeader className='pb-2 pt-5 px-5'><CardTitle className='text-sm font-semibold text-slate-700 flex items-center gap-2'><TrendingUp className='w-4 h-4 text-violet-500' /> New Students — Last 7 Days</CardTitle></CardHeader>
          <CardContent className='px-5 pb-5'>
            {dailyRegistrations.length === 0 ? <p className='text-xs text-slate-400'>No new registrations in the last 7 days.</p> : (
              <div className='flex items-end gap-2 h-32'>
                {dailyRegistrations.map((d) => (
                  <div key={d.label} className='flex flex-col items-center gap-1 flex-1 min-w-0'>
                    <span className='text-[10px] font-semibold text-slate-700'>{d.count}</span>
                    <div className='w-full rounded-t bg-violet-400 transition-all duration-500' style={{ height: `${Math.max((d.count / maxDayCount) * 88, 4)}px` }} />
                    <span className='text-[9px] text-slate-400 truncate w-full text-center'>{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className='border-none shadow-sm'>
        <CardHeader className='pb-2 pt-5 px-5'><CardTitle className='text-sm font-semibold text-slate-700'>Subject Activity</CardTitle></CardHeader>
        <CardContent className='px-5 pb-5'>
          {subjectActivity.length === 0 ? <p className='text-xs text-slate-400'>No quiz activity recorded yet.</p> : (
            <div className='space-y-4'>
              {subjectActivity.map((s) => (
                <div key={s.subject} className='space-y-1'>
                  <div className='flex items-center justify-between text-xs'>
                    <span className='font-medium text-slate-700 truncate max-w-[50%]'>{s.subject}</span>
                    <div className='flex items-center gap-4 text-slate-500 shrink-0'>
                      <span>{s.attempts} attempts</span><span>{s.uniqueStudents} students</span>
                      <span className='font-semibold text-slate-700'>avg {s.avgScore || '—'}</span>
                    </div>
                  </div>
                  <Bar pct={(s.attempts / maxAttempts) * 100} color='bg-amber-400' />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = 'general' | 'quiz' | 'assignments' | 'projects' | 'batch' | 'students';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General Analytics', icon: <TrendingUp className='w-4 h-4' /> },
  { id: 'quiz', label: 'Quiz Analytics', icon: <BookOpen className='w-4 h-4' /> },
  { id: 'assignments', label: 'Assignment Tracker', icon: <CheckSquare className='w-4 h-4' /> },
  { id: 'projects', label: 'Project Tracker', icon: <BarChart2 className='w-4 h-4' /> },
  { id: 'batch', label: 'Batch Dashboard', icon: <Users className='w-4 h-4' /> },
  { id: 'students', label: 'Student Dashboard', icon: <User className='w-4 h-4' /> },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [colleges, setColleges] = useState<College[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    Promise.all([
      apiClient.get('/facilitator/colleges'),
      apiClient.get('/facilitator/batches'),
      apiClient.get('/facilitator/analytics/subjects'),
    ]).then(([c, b, s]) => {
      setColleges(c.data?.data ?? []);
      setBatches(b.data?.data ?? []);
      setSubjects(s.data?.data ?? []);
    }).catch(() => {});
  }, []);

  return (
    <div className='p-6 space-y-6 animate-in fade-in duration-500'>
      <div>
        <h2 className='text-xl font-bold text-slate-900'>Analytics</h2>
        <p className='text-sm text-slate-500 mt-0.5'>Platform-wide activity overview</p>
      </div>

      <div className='flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap'>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'general' && <GeneralAnalytics />}
        {activeTab === 'quiz' && <QuizTab colleges={colleges} batches={batches} subjects={subjects} />}
        {activeTab === 'assignments' && <AssignmentsTab colleges={colleges} batches={batches} />}
        {activeTab === 'projects' && <ProjectsTab colleges={colleges} batches={batches} subjects={subjects} />}
        {activeTab === 'batch' && <BatchTab colleges={colleges} batches={batches} subjects={subjects} />}
        {activeTab === 'students' && <StudentsTab colleges={colleges} batches={batches} subjects={subjects} />}
      </div>
    </div>
  );
}
