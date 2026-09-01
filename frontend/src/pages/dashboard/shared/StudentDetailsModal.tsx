import { useEffect, useState, Fragment } from 'react';
import { Loader2, ChevronDown, ChevronUp, FileCode, CheckSquare, BookOpen, X, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
  Submitted: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  Approved: 'bg-blue-50 text-blue-700 border-blue-200/60',
  Passed: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  Failed: 'bg-red-50 text-red-700 border-red-200/60',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200/60',
  'Not Started': 'bg-slate-100 text-slate-600 border-slate-200/70',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'In Progress': 'bg-purple-50 text-purple-700 border-purple-200/60',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap inline-flex items-center shrink-0 border ${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-500 border-slate-200/60'}`}>
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
      <tr className={`hover:bg-slate-50/80 transition-colors ${expanded ? 'bg-indigo-50/20' : ''}`}>
        <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
          <div className="flex items-center gap-2.5">
            {hasItems ? (
              <button 
                onClick={() => setExpanded(!expanded)}
                className={`p-1 rounded-lg transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center ${
                  expanded ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                }`}
                title={expanded ? 'Collapse details' : 'Expand details'}
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : <div className="w-7" />}
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">{topic.topic_title}</span>
          </div>
        </td>
        <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
          <div className="flex items-center gap-2.5">
            <div className="w-24 sm:w-28 bg-slate-100 rounded-full h-2 overflow-hidden flex shrink-0">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${topic.progress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-700 min-w-[32px]">
              {topic.progress}%
            </span>
          </div>
        </td>
        <td className="px-4 sm:px-5 py-3.5 text-slate-600 whitespace-nowrap">
          {topic.quiz_max > 0 ? (
            <span className="text-[11px] font-semibold text-slate-600 px-2 py-0.5 bg-slate-100/90 border border-slate-200/70 rounded-md whitespace-nowrap">
              {topic.quiz_score}/{topic.quiz_max}
            </span>
          ) : (
            <span className="text-slate-400 text-xs italic">No quiz</span>
          )}
        </td>
        <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
          {asgTotal === 0 ? (
            <span className="text-slate-400 text-xs italic">No assignment</span>
          ) : (
            <div className="inline-flex items-center gap-2 whitespace-nowrap">
              <StatusBadge status={asgStatus} />
              <span className="text-[11px] text-slate-500 font-semibold px-2 py-0.5 bg-slate-100/90 border border-slate-200/70 rounded-md whitespace-nowrap">
                {asgSubmitted}/{asgTotal}
              </span>
            </div>
          )}
        </td>
        <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
          {projTotal === 0 ? (
            <span className="text-slate-400 text-xs italic">No project</span>
          ) : (
            <div className="inline-flex items-center gap-2 whitespace-nowrap">
              <StatusBadge status={projStatus} />
              <span className="text-[11px] text-slate-500 font-semibold px-2 py-0.5 bg-slate-100/90 border border-slate-200/70 rounded-md whitespace-nowrap">
                {projSubmitted}/{projTotal}
              </span>
            </div>
          )}
        </td>
      </tr>
      
      {expanded && hasItems && (
        <tr>
          <td colSpan={5} className="bg-slate-50/90 p-0 border-b border-slate-200">
            <div className="px-4 sm:px-8 py-4 sm:py-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 shadow-inner">
              
              {/* Quizzes */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 sm:mb-3 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> Quizzes
                </h4>
                {topic.quizzes_list.length > 0 ? (
                  <ul className="space-y-2">
                    {topic.quizzes_list.map(q => (
                      <li key={q.id} className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
                        <span className="font-semibold text-xs sm:text-[13px] text-slate-800 leading-tight">{q.title}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-slate-500 text-[11px] sm:text-xs font-semibold px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100">Score: {q.score}/{q.max_score}</span>
                          <StatusBadge status={q.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-white/70 p-3 rounded-xl border border-slate-200/60 border-dashed">No quizzes for this module.</div>
                )}
              </div>
              
              {/* Assignments */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 sm:mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Assignments
                </h4>
                {topic.assignments_list.length > 0 ? (
                  <ul className="space-y-2">
                    {topic.assignments_list.map(a => (
                      <li key={a.id} className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
                        <span className="font-semibold text-xs sm:text-[13px] text-slate-800 leading-tight">{a.title}</span>
                        <div className="flex justify-end mt-1">
                          <StatusBadge status={a.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-white/70 p-3 rounded-xl border border-slate-200/60 border-dashed">No assignments for this module.</div>
                )}
              </div>
              
              {/* Projects */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 sm:mb-3 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-500" /> Projects
                </h4>
                {topic.projects_list.length > 0 ? (
                  <ul className="space-y-2">
                    {topic.projects_list.map(p => (
                      <li key={p.id} className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow">
                        <span className="font-semibold text-xs sm:text-[13px] text-slate-800 leading-tight">{p.title}</span>
                        <div className="flex justify-end mt-1">
                          <StatusBadge status={p.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-white/70 p-3 rounded-xl border border-slate-200/60 border-dashed">No projects for this module.</div>
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
      <DialogContent 
        showCloseButton={false}
        className="w-[95vw] sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 rounded-2xl shadow-2xl border border-slate-200/80"
      >
        {/* Fixed Header with anchored close button */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base md:text-lg font-bold text-slate-900 truncate tracking-tight">
                {studentName}'s Progress Details
              </DialogTitle>
              <p className="text-[11px] text-slate-400 truncate">Course, module & assessment performance breakdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-slate-100 active:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition-colors shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 custom-scrollbar space-y-4 sm:space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs text-slate-400">Loading student details...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs sm:text-sm">
              <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
              <span>No module data available for this student.</span>
            </div>
          ) : (
            subjects.map((subject) => (
              <Card key={subject.subject_id} className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-4 sm:px-6 py-3 sm:py-3.5">
                  <CardTitle className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span>{subject.subject_name}</span>
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto custom-scrollbar bg-white w-full min-w-0">
                  <table className="w-full min-w-[650px] text-xs sm:text-[13px]">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="text-left px-4 sm:px-5 py-3 whitespace-nowrap w-2/5">Module</th>
                        <th className="text-left px-4 sm:px-5 py-3 whitespace-nowrap">Progress</th>
                        <th className="text-left px-4 sm:px-5 py-3 whitespace-nowrap">Quiz Score</th>
                        <th className="text-left px-4 sm:px-5 py-3 whitespace-nowrap">Assignment</th>
                        <th className="text-left px-4 sm:px-5 py-3 whitespace-nowrap">Project</th>
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
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
