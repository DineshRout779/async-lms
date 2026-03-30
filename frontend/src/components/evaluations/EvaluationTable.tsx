import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import ActionButton from "./ActionButton";
import EvaluationModal from "./EvaluationModal";

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
  const [open, setOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  const token = localStorage.getItem("token");

  const fetchAssignments = async () => {
    try {
      const query = new URLSearchParams();
      if (selectedCollege) query.append("collegeId", selectedCollege);
      if (selectedDomain) query.append("domain", selectedDomain);
      // if (selectedBatch) query.append("batchId", selectedBatch);
      if (search) query.append("search", search);
      console.log("API PARAMS:", {
  selectedCollege,
  selectedDomain,
  search,
});
      const res = await fetch(`http://localhost:3001/api/v1/college-assignments/evaluation-filters?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      console.log("🔥 data", data);
      console.log("SELECTED DOMAIN:", selectedDomain);
      if (data.success) setAssignments(data.data);
    } catch (err) {
      console.error("Failed to fetch assignments", err);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [search, selectedCollege, selectedDomain, selectedBatch, refresh]);

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
          <td className="px-4 py-3 font-medium text-slate-800 text-[14px]">
            {item.title}
          </td>

          <td className="px-4 py-3 text-slate-500 text-[14px]">
            {item.course}
          </td>

          <td className="px-4 py-3 text-slate-700 text-[14px]">
            {item.college_name}
          </td>

          <td className="px-4 py-3 text-slate-700 text-[14px]">
            {item.batches_count}
          </td>

          <td className="px-4 py-3 text-slate-700 font-medium text-[14px]">
            {item.submissions_count}
          </td>

          <td className="px-4 py-3">
            <StatusBadge status={item.status} />
          </td>

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