import { useEffect, useState, Fragment } from 'react';
import { Loader2, ChevronDown, ChevronUp, FileCode, CheckSquare, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/services/api';

type TopicRow = {
  topic_id: string;
  topic_title: string;
  quiz_score: number;
  quiz_max: number;
  assignment_status: 'Submitted' | 'Pending';
  project_status: 'Approved' | 'Submitted' | 'Not Started' | null;
  progress: number;
  assignments_list: { id: string; title: string; status: string }[];
  projects_list: { id: string; title: string; status: string }[];
  quizzes_list: { id: string; title: string; status: string; score: number; max_score: number }[];
};

type SubjectGroup = {
  subject_id: string;
  subject_name: string;
  topics: TopicRow[];
};

const STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-emerald-50 text-emerald-700',
  Approved: 'bg-blue-50 text-blue-700',
  Passed: 'bg-emerald-50 text-emerald-700',
  Failed: 'bg-red-50 text-red-700',
  Pending: 'bg-amber-50 text-amber-700',
  'Not Started': 'bg-slate-100 text-slate-500',
  Completed: 'bg-emerald-50 text-emerald-700',
  'In Progress': 'bg-purple-50 text-purple-700',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

function TopicRowView({ topic }: { topic: TopicRow }) {
  const [expanded, setExpanded] = useState(false);
  
  const hasItems = topic.assignments_list.length > 0 || topic.projects_list.length > 0 || topic.quizzes_list.length > 0;

  const asgTotal = topic.assignments_list.length;
  const asgSubmitted = topic.assignments_list.filter(a => ['Submitted', 'Approved', 'Passed'].includes(a.status)).length;
  const asgStatus = asgTotal === 0 ? 'Not Started' 
                    : asgSubmitted >= asgTotal ? 'Completed' 
                    : asgSubmitted > 0 ? 'In Progress' 
                    : 'Not Started';

  const projTotal = topic.projects_list.length;
  const projSubmitted = topic.projects_list.filter(p => ['Submitted', 'Approved', 'Passed'].includes(p.status)).length;
  const projStatus = projTotal === 0 ? 'Not Started' 
                     : projSubmitted >= projTotal ? 'Completed' 
                     : projSubmitted > 0 ? 'In Progress' 
                     : 'Not Started';

  return (
    <Fragment>
      <tr className={`hover:bg-slate-50 transition-colors ${expanded ? 'bg-slate-50' : ''}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasItems ? (
              <button 
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            ) : <div className="w-6" />}
            <span className="font-semibold text-slate-800">{topic.topic_title}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-full bg-slate-100 rounded-full h-2 min-w-[80px] overflow-hidden flex">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${topic.progress}%` }}
              />
            </div>
            <span className="text-[13px] font-semibold text-slate-700 min-w-[32px]">
              {topic.progress}%
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-slate-600">
          {topic.quiz_max > 0 ? (
            `${topic.quiz_score}/${topic.quiz_max}`
          ) : (
            <span className="text-slate-400 text-xs">No quiz</span>
          )}
        </td>
        <td className="px-4 py-3">
          {asgTotal === 0 ? (
            <span className="text-slate-400 text-xs">No assignment</span>
          ) : (
            <div className="flex items-center gap-2">
              <StatusBadge status={asgStatus} />
              <span className="text-xs text-slate-500 font-medium">
                ({asgSubmitted} / {asgTotal})
              </span>
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          {projTotal === 0 ? (
            <span className="text-slate-400 text-xs">No project</span>
          ) : (
            <div className="flex items-center gap-2">
              <StatusBadge status={projStatus} />
              <span className="text-xs text-slate-500 font-medium">
                ({projSubmitted} / {projTotal})
              </span>
            </div>
          )}
        </td>
      </tr>
      
      {expanded && hasItems && (
        <tr>
          <td colSpan={5} className="bg-slate-50/80 p-0 border-b border-slate-200">
            <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-inner">
              
              {/* Quizzes */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" /> Quizzes
                </h4>
                {topic.quizzes_list.length > 0 ? (
                  <ul className="space-y-2">
                    {topic.quizzes_list.map(q => (
                      <li key={q.id} className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <span className="font-semibold text-slate-800 leading-tight">{q.title}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-slate-500 text-xs font-medium">Score: {q.score}/{q.max_score}</span>
                          <StatusBadge status={q.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-white/50 p-3 rounded-lg border border-slate-100 border-dashed">No quizzes for this module.</div>
                )}
              </div>
              
              {/* Assignments */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Assignments
                </h4>
                {topic.assignments_list.length > 0 ? (
                  <ul className="space-y-2">
                    {topic.assignments_list.map(a => (
                      <li key={a.id} className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <span className="font-semibold text-slate-800 leading-tight">{a.title}</span>
                        <div className="flex justify-end mt-1">
                          <StatusBadge status={a.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-white/50 p-3 rounded-lg border border-slate-100 border-dashed">No assignments for this module.</div>
                )}
              </div>
              
              {/* Projects */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" /> Projects
                </h4>
                {topic.projects_list.length > 0 ? (
                  <ul className="space-y-2">
                    {topic.projects_list.map(p => (
                      <li key={p.id} className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <span className="font-semibold text-slate-800 leading-tight">{p.title}</span>
                        <div className="flex justify-end mt-1">
                          <StatusBadge status={p.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-white/50 p-3 rounded-lg border border-slate-100 border-dashed">No projects for this module.</div>
                )}
              </div>

            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export function StudentDetailsModal({
  isOpen,
  onClose,
  studentId,
  studentName,
}: {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  studentName: string;
}) {
  const [subjects, setSubjects] = useState<SubjectGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      apiClient
        .get(`/facilitator/students/${studentId}/modules`)
        .then((res) => {
          setSubjects(res.data.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setSubjects([]);
    }
  }, [isOpen, studentId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-50 p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-bold text-slate-900">
            {studentName}'s Progress Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            No module data available.
          </div>
        ) : (
          <div className="space-y-6">
            {subjects.map((subject) => (
              <Card key={subject.subject_id} className="border border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    {subject.subject_name}
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto bg-white">
                  <table className="w-full text-[13px]">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="text-left px-4 py-3 w-1/3">Module</th>
                        <th className="text-left px-4 py-3">Progress</th>
                        <th className="text-left px-4 py-3">Quiz Score</th>
                        <th className="text-left px-4 py-3">Assignment</th>
                        <th className="text-left px-4 py-3">Project</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subject.topics.map((topic) => (
                        <TopicRowView key={topic.topic_id} topic={topic} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
