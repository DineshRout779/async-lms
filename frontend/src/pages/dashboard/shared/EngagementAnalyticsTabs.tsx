// Shared engagement analytics tab components used by both FacilitatorAnalytics and admin Analytics.
import { useEffect, useState, useCallback } from 'react';
import { Loader2, ListChecks } from 'lucide-react';
import apiClient from '@/services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

export type College = { id: string; name: string };
export type Batch = { id: string; name: string };
export type Subject = { id: string; name: string };
export type Assignment = { id: string; title: string };

type QuizData = {
  enrolled: number; attempted: number; not_attempted: number;
  passed: number; failed: number; avg_score_pct: number;
  score_distribution: { range: string; count: number }[];
  question_analytics?: { question_id: string; question_text: string; correct_pct: number }[];
  question_analytics_total: number;
};

type AssignmentData = {
  total: number; submitted: number; not_submitted: number; rate: number;
  students: { id: string; name: string; email: string; status: string | null }[];
};

type ProjectData = {
  total: number;
  not_started: number; submitted: number; approved: number;
  students: { id: string; name: string; email: string; status: string }[];
};

type BatchSubject = { id: string; name: string; quiz_completion: number; pass_rate: number; assignment_completion: number; project_completion: number; lesson_completion: number; module_progress: number; };
type BatchDashData = {
  enrolled: number; active_students: number; avg_batch_streak: number; avg_module_progress: number;
  quiz_completion_rate: number; quiz_pass_rate: number;
  assignment_completion_rate: number; project_completion_rate: number;
  subjects: BatchSubject[];
};

type StudentRow = {
  id: string; name: string; email: string;
  quiz_submitted_count: number; quiz_total_count: number;
  assignment_submitted_count: number; assignment_total_count: number; 
  project_submitted_count: number; project_total_count: number;
};

// ─── Shared primitives ────────────────────────────────────────────────────────

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Submitted: 'bg-green-100 text-green-700',
    Pending: 'bg-amber-100 text-amber-700',
    Approved: 'bg-blue-100 text-blue-700',
    'Not Started': 'bg-slate-100 text-slate-600',
    'In Progress': 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
    </div>
  );
}

export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-slate-400">{message}</div>
  );
}

export function RateBar({ value, color = 'bg-indigo-500' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-30">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs text-slate-600 w-8 text-right">{value}%</span>
    </div>
  );
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export function PaginationControls({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  const pages = getPageNumbers(page, totalPages);
  
  return (
    <div className="flex gap-1 items-center">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
      >
        Prev
      </button>
      
      {pages.map((p, i) => (
        <button
          key={i}
          onClick={() => typeof p === 'number' && onPageChange(p)}
          disabled={p === '...'}
          className={`w-7 h-7 flex items-center justify-center rounded-md border text-xs transition-colors ${
            p === page 
              ? 'bg-indigo-600 text-white border-indigo-600 font-medium' 
              : p === '...' 
                ? 'border-transparent text-slate-400 cursor-default' 
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
      >
        Next
      </button>
    </div>
  );
}

export function Select({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { id: string; name: string }[]; placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-40"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </div>
  );
}

const CHART_COLOR = '#4F46E5';
const DIST_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6'];

function QuestionAnalyticsTable({ questions }: { questions: { question_id: string; question_text: string; correct_pct: number }[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
        <tr>
          <th className="text-left px-5 py-3">Question</th>
          <th className="text-left px-5 py-3">% Students Correct</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {questions.map((q) => (
          <tr key={q.question_id} className="hover:bg-slate-50 transition-colors">
            <td className="px-5 py-3 font-medium text-slate-800">{q.question_text}</td>
            <td className="px-5 py-3">
              <RateBar
                value={q.correct_pct}
                color={q.correct_pct > 70 ? 'bg-green-500' : q.correct_pct > 40 ? 'bg-amber-500' : 'bg-red-500'}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Tab: Quiz Analytics ──────────────────────────────────────────────────────

const QUIZ_PAGE_SIZE = 10;

export function QuizTab({ colleges, batches, subjects }: { colleges: College[]; batches: Batch[]; subjects: Subject[] }) {
  const [college, setCollege] = useState('');
  const [batch, setBatch] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [quiz, setQuiz] = useState('');
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [quizzes, setQuizzes] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [qPage, setQPage] = useState(1);

  useEffect(() => {
    if (!subject) { setTopics([]); setTopic(''); return; }
    apiClient.get(`/facilitator/analytics/topics?subject_id=${subject}`)
      .then(r => setTopics(r.data?.data ?? []))
      .catch(() => setTopics([]));
  }, [subject]);

  useEffect(() => {
    if (!topic) { setQuizzes([]); setQuiz(''); return; }
    apiClient.get(`/facilitator/analytics/quizzes?topic_id=${topic}`)
      .then(r => setQuizzes(r.data?.data ?? []))
      .catch(() => setQuizzes([]));
  }, [topic]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (college) params.set('college_id', college);
      if (batch) params.set('batch', batch);
      if (subject) params.set('subject_id', subject);
      if (topic) params.set('topic_id', topic);
      if (quiz) params.set('quiz_id', quiz);
      params.set('page', String(p));
      params.set('limit', String(QUIZ_PAGE_SIZE));
      const res = await apiClient.get(`/facilitator/analytics/quiz?${params}`);
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [college, batch, subject, topic, quiz]);

  const handlePageChange = (p: number) => {
    setQPage(p);
    load(p);
  };

  useEffect(() => { setQPage(1); load(1); }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <Select label="College" value={college} onChange={setCollege} options={colleges} placeholder="All Colleges" />
        <Select label="Batch" value={batch} onChange={setBatch} options={batches} placeholder="All Batches" />
        <Select label="Subject" value={subject} onChange={setSubject} options={subjects} placeholder="All Subjects" />
        <Select label="Module" value={topic} onChange={setTopic} options={topics} placeholder="All Modules" />
        <Select label="Quiz" value={quiz} onChange={setQuiz} options={quizzes} placeholder="All Quizzes" />
      </div>

      {loading ? <LoadingState /> : !data ? <EmptyState /> : (
        <>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            <StatCard label="Enrolled" value={data.enrolled} />
            <StatCard label="Attempted" value={data.attempted} />
            <StatCard label="Not Attempted" value={data.not_attempted} />
            <StatCard label="Passed" value={data.passed} />
            <StatCard label="Failed" value={data.failed} />
            <StatCard label="Avg Score" value={`${data.avg_score_pct}%`} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Score Distribution</h3>
            {data.score_distribution.every((d) => d.count === 0) ? (
              <EmptyState message="No quiz attempts yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.score_distribution} barSize={40}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                    {data.score_distribution.map((_, i) => (
                      <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-700">Question Analytics</h3>
            </div>
            {data.question_analytics_total === 0 ? (
              <EmptyState message="No quiz attempts yet — question analytics will appear once students submit quizzes" />
            ) : (() => {
              const totalPages = Math.ceil(data.question_analytics_total / QUIZ_PAGE_SIZE);
              return (
                <>
                  <QuestionAnalyticsTable questions={data.question_analytics!} />
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                      <span>{data.question_analytics_total} questions · page {qPage} of {totalPages}</span>
                      <PaginationControls page={qPage} totalPages={totalPages} onPageChange={handlePageChange} />
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Assignment Tracker ──────────────────────────────────────────────────

export function AssignmentsTab({ colleges, batches, subjects }: { colleges: College[]; batches: Batch[]; subjects: Subject[] }) {
  const [college, setCollege] = useState('');
  const [batch, setBatch] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [assignmentCompound, setAssignmentCompound] = useState(''); // e.g. 'college|123'
  
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [collegeAssignments, setCollegeAssignments] = useState<Assignment[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<{ id: string; name: string }[]>([]);
  
  const [data, setData] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [aPage, setAPage] = useState(1);

  // Fetch topics when subject changes
  useEffect(() => {
    if (!subject) { setTopics([]); setTopic(''); return; }
    apiClient.get(`/facilitator/analytics/topics?subject_id=${subject}`)
      .then(r => setTopics(r.data?.data ?? []))
      .catch(() => setTopics([]));
  }, [subject]);

  // Fetch college assignments when college changes
  useEffect(() => {
    if (!college) { setCollegeAssignments([]); return; }
    apiClient.get(`/college-assignments/facilitator?college_id=${college}`)
      .then((r) => setCollegeAssignments(r.data?.data ?? []))
      .catch(() => setCollegeAssignments([]));
  }, [college]);

  // Fetch course assignments when topic changes
  useEffect(() => {
    if (!topic) { setCourseAssignments([]); return; }
    apiClient.get(`/facilitator/analytics/course-assignments?topic_id=${topic}`)
      .then((r) => setCourseAssignments(r.data?.data ?? []))
      .catch(() => setCourseAssignments([]));
  }, [topic]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (college) params.set('college_id', college);
      if (batch) params.set('batch', batch);
      if (subject) params.set('subject_id', subject);
      if (topic) params.set('topic_id', topic);
      
      if (assignmentCompound) {
        const [type, id] = assignmentCompound.split('|');
        params.set('assignment_type', type);
        params.set('assignment_id', id);
      }
      
      params.set('page', String(p));
      params.set('limit', '10');
      
      const res = await apiClient.get(`/facilitator/analytics/assignments?${params}`);
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [college, batch, subject, topic, assignmentCompound]);

  const handlePageChange = (p: number) => {
    setAPage(p);
    load(p);
  };

  useEffect(() => { setAPage(1); load(1); }, [load]);

  const mergedAssignments = [
    ...collegeAssignments.map(a => ({ id: `college|${a.id}`, name: `[College] ${a.title}` })),
    ...courseAssignments.map(a => ({ id: `course|${a.id}`, name: `[Course] ${a.name}` }))
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <Select label="College" value={college} onChange={setCollege} options={colleges} placeholder="All Colleges" />
        <Select label="Batch" value={batch} onChange={setBatch} options={batches} placeholder="All Batches" />
        <Select label="Subject" value={subject} onChange={setSubject} options={subjects} placeholder="All Subjects" />
        <Select label="Module" value={topic} onChange={setTopic} options={topics} placeholder="All Modules" />
        <Select label="Assignment" value={assignmentCompound} onChange={setAssignmentCompound} options={mergedAssignments} placeholder="Select Assignment" />
      </div>

      {loading ? <LoadingState /> : !data ? <EmptyState /> : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Students" value={data.total} />
            <StatCard label="Submitted" value={data.submitted} />
            <StatCard label="Not Submitted" value={data.not_submitted} />
            <StatCard label="Submission Rate" value={assignmentCompound ? `${data.rate}%` : '—'} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Student Submissions</h3>
            </div>
            {data.students.length === 0 ? <EmptyState message="No students found" /> : (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="text-left px-5 py-3">Student</th>
                      <th className="text-left px-5 py-3">Email</th>
                      {assignmentCompound && <th className="text-left px-5 py-3">Status</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                        <td className="px-5 py-3 text-slate-500">{s.email}</td>
                        {assignmentCompound && <td className="px-5 py-3"><StatusBadge status={s.status ?? 'Pending'} /></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Math.ceil(data.total / 10) > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                    <span>{data.total} students · page {aPage} of {Math.ceil(data.total / 10)}</span>
                    <PaginationControls page={aPage} totalPages={Math.ceil(data.total / 10)} onPageChange={handlePageChange} />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Project Tracker ─────────────────────────────────────────────────────

export function ProjectsTab({ colleges, batches, subjects }: { colleges: College[]; batches: Batch[]; subjects: Subject[] }) {
  const [college, setCollege] = useState('');
  const [batch, setBatch] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [project, setProject] = useState('');

  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pPage, setPPage] = useState(1);

  useEffect(() => {
    if (!subject) { setTopics([]); setTopic(''); return; }
    apiClient.get(`/facilitator/analytics/topics?subject_id=${subject}`)
      .then(r => setTopics(r.data?.data ?? []))
      .catch(() => setTopics([]));
  }, [subject]);

  useEffect(() => {
    if (!topic) { setProjects([]); setProject(''); return; }
    apiClient.get(`/facilitator/analytics/module-projects?topic_id=${topic}`)
      .then(r => setProjects(r.data?.data ?? []))
      .catch(() => setProjects([]));
  }, [topic]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (college) params.set('college_id', college);
      if (batch) params.set('batch', batch);
      if (subject) params.set('subject_id', subject);
      if (topic) params.set('topic_id', topic);
      if (project) params.set('project_id', project);
      params.set('page', String(p));
      params.set('limit', '10');

      const res = await apiClient.get(`/facilitator/analytics/projects?${params}`);
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [college, batch, subject, topic, project]);

  const handlePageChange = (p: number) => {
    setPPage(p);
    load(p);
  };

  useEffect(() => { setPPage(1); load(1); }, [load]);

  const chartData = data
    ? [
        { status: 'Not Started', count: data.not_started },
        { status: 'Submitted', count: data.submitted },
        { status: 'Approved', count: data.approved },
      ]
    : [];

  const statusColors: Record<string, string> = {
    'Not Started': '#94A3B8',
    Submitted: '#F59E0B',
    Approved: '#22C55E',
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <Select label="College" value={college} onChange={setCollege} options={colleges} placeholder="All Colleges" />
        <Select label="Batch" value={batch} onChange={setBatch} options={batches} placeholder="All Batches" />
        <Select label="Subject" value={subject} onChange={setSubject} options={subjects} placeholder="All Subjects" />
        <Select label="Module" value={topic} onChange={setTopic} options={topics} placeholder="All Modules" />
        <Select label="Project" value={project} onChange={setProject} options={projects} placeholder="All Projects" />
      </div>

      {loading ? <LoadingState /> : !data ? <EmptyState /> : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Students" value={data.total ?? 0} />
            <StatCard label="Not Started" value={data.not_started} />
            <StatCard label="Submitted" value={data.submitted} />
            <StatCard label="Approved" value={data.approved} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Project Status Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={60}>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={statusColors[entry.status] ?? CHART_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Student Project Status</h3>
            </div>
            {data.students.length === 0 ? <EmptyState message="No students found" /> : (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="text-left px-5 py-3">Student</th>
                      <th className="text-left px-5 py-3">Email</th>
                      <th className="text-left px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                        <td className="px-5 py-3 text-slate-500">{s.email}</td>
                        <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Math.ceil((data.total ?? 0) / 10) > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                    <span>{data.total} students · page {pPage} of {Math.ceil((data.total ?? 0) / 10)}</span>
                    <PaginationControls page={pPage} totalPages={Math.ceil((data.total ?? 0) / 10)} onPageChange={handlePageChange} />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Batch Dashboard ─────────────────────────────────────────────────────

export function BatchTab({ colleges, batches, subjects }: { colleges: College[]; batches: Batch[]; subjects: Subject[] }) {
  const [college, setCollege] = useState('');
  const [batch, setBatch] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<BatchDashData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subject) { setTopics([]); setTopic(''); return; }
    apiClient.get(`/facilitator/analytics/topics?subject_id=${subject}`)
      .then(r => setTopics(r.data?.data ?? []))
      .catch(() => setTopics([]));
  }, [subject]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (college) params.set('college_id', college);
      if (batch) params.set('batch', batch);
      if (subject) params.set('subject_id', subject);
      if (topic) params.set('topic_id', topic);
      const res = await apiClient.get(`/facilitator/analytics/batch?${params}`);
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [college, batch, subject, topic]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <Select label="College" value={college} onChange={setCollege} options={colleges} placeholder="All Colleges" />
        <Select label="Batch" value={batch} onChange={setBatch} options={batches} placeholder="All Batches" />
        <Select label="Subject" value={subject} onChange={setSubject} options={subjects} placeholder="All Subjects" />
        <Select label="Module" value={topic} onChange={setTopic} options={topics} placeholder="All Modules" />
      </div>

      {loading ? <LoadingState /> : !data ? <EmptyState /> : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Students Enrolled" value={data.enrolled} />
            <StatCard label="Active Students" value={data.active_students} sub="Online & active today" />
            <StatCard label="Avg Batch Streak" value={`${data.avg_batch_streak} days`} />
            <StatCard label="Avg Module Progress" value={`${data.avg_module_progress}%`} />
            <StatCard label="Quiz Completion" value={`${data.quiz_completion_rate}%`} />
            <StatCard label="Quiz Pass Rate" value={`${data.quiz_pass_rate}%`} />
            <StatCard label="Assignment Completion" value={`${data.assignment_completion_rate}%`} />
            <StatCard label="Project Completion" value={`${data.project_completion_rate}%`} />
          </div>

          {data.subjects.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Module-Level Breakdown</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="text-left px-5 py-3">Module</th>
                    <th className="text-left px-5 py-3">Quiz Completion</th>
                    <th className="text-left px-5 py-3">Pass Rate</th>
                    <th className="text-left px-5 py-3">Assignment Completion</th>
                    <th className="text-left px-5 py-3">Project Completion</th>
                    <th className="text-left px-5 py-3">Lessons Read</th>
                    <th className="text-left px-5 py-3">Avg Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="px-5 py-3"><RateBar value={s.quiz_completion} /></td>
                      <td className="px-5 py-3"><RateBar value={s.pass_rate} color="bg-green-500" /></td>
                      <td className="px-5 py-3"><RateBar value={s.assignment_completion} color="bg-amber-500" /></td>
                      <td className="px-5 py-3"><RateBar value={s.project_completion} color="bg-purple-500" /></td>
                      <td className="px-5 py-3"><RateBar value={s.lesson_completion} color="bg-blue-500" /></td>
                      <td className="px-5 py-3"><RateBar value={s.module_progress} color="bg-indigo-600" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab: Student Performance ─────────────────────────────────────────────────

const STUDENTS_PAGE_SIZE = 20;

export function StudentsTab({ colleges, batches, subjects }: { colleges: College[]; batches: Batch[]; subjects: Subject[] }) {
  const [college, setCollege] = useState('');
  const [batch, setBatch] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aggregates, setAggregates] = useState({ quizzes_attempted: 0, assignments_submitted: 0, projects_completed: 0 });

  useEffect(() => {
    if (!subject) { setTopics([]); setTopic(''); return; }
    apiClient.get(`/facilitator/analytics/topics?subject_id=${subject}`)
      .then(r => setTopics(r.data?.data ?? []))
      .catch(() => setTopics([]));
  }, [subject]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (college) params.set('college_id', college);
      if (batch) params.set('batch', batch);
      if (subject) params.set('subject_id', subject);
      if (topic) params.set('topic_id', topic);
      params.set('page', String(p));
      params.set('limit', String(STUDENTS_PAGE_SIZE));
      const res = await apiClient.get(`/facilitator/analytics/students?${params}`);
      setData(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
      setAggregates(res.data.aggregates ?? { quizzes_attempted: 0, assignments_submitted: 0, projects_completed: 0 });
    } catch {
      setData([]);
      setTotal(0);
      setAggregates({ quizzes_attempted: 0, assignments_submitted: 0, projects_completed: 0 });
    } finally {
      setLoading(false);
    }
  }, [college, batch, subject, topic]);

  const handlePageChange = (p: number) => { setPage(p); load(p); };

  useEffect(() => { setPage(1); load(1); }, [load]);

  const totalPages = Math.ceil(total / STUDENTS_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <Select label="College" value={college} onChange={setCollege} options={colleges} placeholder="All Colleges" />
        <Select label="Batch" value={batch} onChange={setBatch} options={batches} placeholder="All Batches" />
        <Select label="Subject" value={subject} onChange={setSubject} options={subjects} placeholder="All Subjects" />
        <Select label="Module" value={topic} onChange={setTopic} options={topics} placeholder="All Modules" />
      </div>

      {loading ? <LoadingState /> : total === 0 ? <EmptyState message="No students found" /> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Quizzes Attempted" value={aggregates.quizzes_attempted} sub={`out of ${total} students`} />
            <StatCard label="Assignments Submitted" value={aggregates.assignments_submitted} sub={`out of ${total} students`} />
            <StatCard label="Projects Completed" value={aggregates.projects_completed} sub={`out of ${total} students`} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Per-Student Performance</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Quizzes</th>
                  <th className="px-5 py-4">Assignment</th>
                  <th className="px-5 py-4">Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={
                          s.quiz_submitted_count === 0 ? 'Not Started'
                            : s.quiz_submitted_count >= s.quiz_total_count ? 'Completed'
                            : 'In Progress'
                        } />
                        <span className="text-xs text-slate-500 font-medium">
                          ({s.quiz_submitted_count} / {s.quiz_total_count})
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={
                          s.assignment_submitted_count === 0 ? 'Not Started'
                            : s.assignment_submitted_count >= s.assignment_total_count ? 'Completed'
                            : 'In Progress'
                        } />
                        <span className="text-xs text-slate-500 font-medium">
                          ({s.assignment_submitted_count} / {s.assignment_total_count})
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={
                          s.project_submitted_count === 0 ? 'Not Started'
                            : s.project_submitted_count >= s.project_total_count ? 'Completed'
                            : 'In Progress'
                        } />
                        <span className="text-xs text-slate-500 font-medium">
                          ({s.project_submitted_count} / {s.project_total_count})
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                <span>{total} students · page {page} of {totalPages}</span>
                <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
