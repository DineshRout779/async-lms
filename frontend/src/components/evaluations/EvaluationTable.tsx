import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import ActionButton from "./ActionButton";
import EvaluationModal from "./EvaluationModal";
import SubmissionsModal from "./SubmissionsModal";
import apiClient from "@/services/api";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye } from "lucide-react";

type Props = {
  search: string;
  selectedCollege: string;
  selectedDomain: string;
  selectedBatch: string;
  refresh: boolean;
  onEvaluationComplete: () => void;
};

type Assignment = {
  id: string;
  title: string;
  course?: string;
  college_name?: string;
  type: 'unit' | 'college';
  batches_count?: number;
  submissions_count?: number;
  status: string;
  evaluation_id?: string;
}

const EvaluationTable = ({ search, selectedCollege, selectedDomain, selectedBatch, refresh, onEvaluationComplete }: Props) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [submissionsAssignment, setSubmissionsAssignment] = useState({ id: "", title: "" });

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedCollege) params.collegeId = selectedCollege;
      if (selectedDomain) params.domain = selectedDomain;
      if (search) params.search = search;

      const res = await apiClient.get('/college-assignments/evaluation-filters', { params });
      if (res.data.success) setAssignments(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch assignments'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [search, selectedCollege, selectedDomain, selectedBatch, refresh]);

  if (loading) {
    return (
      <div className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 gap-4 px-4 py-3 border-b">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-4 px-4 py-4 border-b border-slate-100 items-center">
            <Skeleton className="h-4 w-full col-span-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="text-slate-500 text-[12px] uppercase">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Assignment Name</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-left font-medium">Course / Domain</th>
            <th className="px-4 py-3 text-left font-medium">Colleges</th>
            <th className="px-4 py-3 text-left font-medium">Submissions</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>

        <tbody className="[&>tr:first-child]:border-t-0">
          {assignments.map((item) => (
            <tr
              key={item.id}
              className="border-t border-slate-100 hover:bg-slate-50 transition"
            >
              <td className="px-4 py-3 font-medium text-slate-800 text-[14px]">{item.title}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  item.type === 'unit' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.type === 'unit' ? 'Curriculum' : 'College'}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500 text-[14px]">{item.course}</td>
              <td className="px-4 py-3 text-slate-700 text-[14px]">{item.college_name}</td>
              <td className="px-4 py-3 text-slate-700 font-medium text-[14px]">{item.submissions_count}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <StatusBadge status={item.status} />
                  {item.status === 'evaluated' && item.evaluation_id && (
                    <a
                      href={`/dashboard/facilitator/results/${item.evaluation_id}`}
                      className="text-[10px] text-blue-600 hover:underline font-medium"
                    >
                      View Results
                    </a>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => { setSubmissionsAssignment({ id: item.id, title: item.title }); setSubmissionsOpen(true); }}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded px-2 py-1 transition"
                    title="View student submissions"
                  >
                    <Eye size={12} /> Submissions
                  </button>
                  <ActionButton
                    status={item.status}
                    onClick={() => {
                      setSelectedAssignment(item.title);
                      setSelectedAssignmentId(item.id);
                      setOpen(true);
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <EvaluationModal
        open={open}
        onClose={() => setOpen(false)}
        assignmentName={selectedAssignment}
        assignmentId={selectedAssignmentId}
        onComplete={() => {
          setOpen(false);
          onEvaluationComplete();
        }}
      />

      <SubmissionsModal
        key={submissionsAssignment.id}
        open={submissionsOpen}
        onClose={() => setSubmissionsOpen(false)}
        assignmentId={submissionsAssignment.id}
        assignmentTitle={submissionsAssignment.title}
      />
    </div>
  );
};

export default EvaluationTable;
