import { useEffect, useState } from 'react';
import { X, ExternalLink, FileText, Loader2 } from 'lucide-react';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

type Submission = {
  id: string;
  student_name: string;
  student_email: string;
  college_name?: string;
  submission_link?: string;
  submission_file_url?: string;
  submission_file_name?: string;
  submitted_at: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  assignmentTitle: string;
};

export default function SubmissionsModal({ open, onClose, assignmentId, assignmentTitle }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !assignmentId) return;
    let cancelled = false;
    apiClient
      .get(`/college-assignments/submissions/${assignmentId}`)
      .then((res) => { if (!cancelled) setSubmissions(res.data.data); })
      .catch((err) => { if (!cancelled) toast.error(getErrorMessage(err, 'Failed to load submissions')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, assignmentId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-800 text-base">Student Submissions</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">{assignmentTitle}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={22} className="animate-spin mr-2" />
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <FileText size={32} className="opacity-30" />
              <p className="text-sm">No submissions yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="pb-2 pr-4 font-medium">Student</th>
                  <th className="pb-2 pr-4 font-medium">College</th>
                  <th className="pb-2 pr-4 font-medium">Submitted</th>
                  <th className="pb-2 font-medium text-right">Submission</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-800">{s.student_name}</div>
                      <div className="text-xs text-slate-400">{s.student_email}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs">{s.college_name || '—'}</td>
                    <td className="py-3 pr-4 text-slate-500 text-xs whitespace-nowrap">
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 text-right">
                      {s.submission_link ? (
                        <a
                          href={s.submission_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          <ExternalLink size={12} /> View Link
                        </a>
                      ) : s.submission_file_url ? (
                        <a
                          href={s.submission_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          <FileText size={12} /> {s.submission_file_name || 'Download'}
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 text-right">
          <span className="text-xs text-slate-400">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
