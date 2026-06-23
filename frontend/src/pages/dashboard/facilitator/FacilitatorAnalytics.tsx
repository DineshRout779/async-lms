import { useEffect, useState } from 'react';
import { BookOpen, Users, CheckSquare, BarChart2, User } from 'lucide-react';
import apiClient from '@/services/api';
import {
  QuizTab, AssignmentsTab, ProjectsTab, BatchTab, StudentsTab,
  type College, type Batch, type Subject,
} from '@/pages/dashboard/shared/EngagementAnalyticsTabs';

type TabId = 'quiz' | 'assignments' | 'projects' | 'batch' | 'students';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'quiz', label: 'Quiz Analytics', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'assignments', label: 'Assignment Tracker', icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'projects', label: 'Project Tracker', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'batch', label: 'Batch Dashboard', icon: <Users className="w-4 h-4" /> },
  { id: 'students', label: 'Student Dashboard', icon: <User className="w-4 h-4" /> },
];

const FacilitatorAnalytics = () => {
  const [activeTab, setActiveTab] = useState<TabId>('quiz');
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
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] text-slate-400 mb-1">Dashboard / Analytics</p>
        <h1 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Quiz, assignment, project, and student performance insights</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'quiz' && <QuizTab colleges={colleges} batches={batches} subjects={subjects} />}
        {activeTab === 'assignments' && <AssignmentsTab colleges={colleges} batches={batches} />}
        {activeTab === 'projects' && <ProjectsTab colleges={colleges} batches={batches} subjects={subjects} />}
        {activeTab === 'batch' && <BatchTab colleges={colleges} batches={batches} subjects={subjects} />}
        {activeTab === 'students' && <StudentsTab colleges={colleges} batches={batches} subjects={subjects} />}
      </div>
    </div>
  );
};

export default FacilitatorAnalytics;
