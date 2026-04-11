import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import ActionButton from "./ActionButton";
import EvaluationModal from "./EvaluationModal";
import apiClient from "@/services/api";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

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
  batches_count?: number;
  submissions_count?: number;
  status: string;
}

const EvaluationTable = ({ search, selectedCollege, selectedDomain, selectedBatch, refresh, onEvaluationComplete }: Props) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

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
            <th className="px-4 py-3 font-medium">Assignment Name</th>
            <th className="px-4 py-3 font-medium">Course / Domain</th>
            <th className="px-4 py-3 font-medium">Colleges</th>
            <th className="px-4 py-3 font-medium">Batches</th>
            <th className="px-4 py-3 font-medium">Submissions</th>
            <th className="px-4 py-3 font-medium">Status</th>
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
              <td className="px-4 py-3 text-slate-500 text-[14px]">{item.course}</td>
              <td className="px-4 py-3 text-slate-700 text-[14px]">{item.college_name}</td>
              <td className="px-4 py-3 text-slate-700 text-[14px]">{item.batches_count}</td>
              <td className="px-4 py-3 text-slate-700 font-medium text-[14px]">{item.submissions_count}</td>
              <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
              <td className="px-4 py-3 text-right">
                <ActionButton
                  status={item.status}
                  onClick={() => {
                    setSelectedAssignment(item.title);
                    setSelectedAssignmentId(item.id);
                    setOpen(true);
                  }}
                />
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
    </div>
  );
};

export default EvaluationTable;
