import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

type Props = {
  open: boolean;
  onClose: () => void;
  assignmentName: string;
  assignmentId: string;
  onComplete: () => void;
};

const EvaluationModal = ({ open, onClose, assignmentName, assignmentId, onComplete }: Props) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"running" | "completed">("running");
  const [evaluationId, setEvaluationId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
  if (!open) return;

  const runEvaluation = async () => {
    try {
      setStatus("running");
      setProgress(20);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/evaluations/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignmentId }),
        // body: JSON.stringify({
        //   assignmentId: "59550bf7-32b7-4c20-aa87-e456f217a648", // 🔥 IMPORTANT
        // }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      setProgress(70);

      // ✅ store evaluationId
      setEvaluationId(data.evaluationId);

      setProgress(100);
      setStatus("completed");
      onComplete(); //refresh table
    } catch (err) {
      console.error("Evaluation failed", err);
    }
  };

  runEvaluation();
}, [open]);

    
    // await axios.post("/run-evaluation", { assignmentName })

  //   const interval = setInterval(() => {
  //     setProgress((prev) => {
  //       if (prev >= 100) {
  //         clearInterval(interval);
  //         setStatus("completed"); // ✅ switch to success screen
  //         return 100;
  //       }
  //       return prev + 10;
  //     });
  //   }, 400);

  //   return () => clearInterval(interval);
  // }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-[8px] p-6 w-[429px] text-center shadow-lg">

        {/* ================= RUNNING STATE ================= */}
        {status === "running" && (
          <>
            {/* Loader */}
            <div className="w-10 h-10 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />

            <h2 className="text-lg font-semibold">
              Running AI Evaluation
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {assignmentName}
            </p>

            <p className="text-sm text-gray-400 mt-2">
              Analyzing submissions...
            </p>

            {/* Progress */}
            <div className="mt-4">
              <div className="w-full bg-blue-900 h-2 rounded-full">
                <div
                  className="bg-[#5C4BDB] h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {progress}% complete
              </p>
            </div>
          </>
        )}

        {/* ================= COMPLETED STATE ================= */}
        {status === "completed" && (
          <>
            <h2 className="text-[18px] font-semibold text-green-600">
              Evaluation Completed Successfully
            </h2>

            <p className="text-[15.88px] text-gray-500 mt-2">
              All batches for "{assignmentName}" have been evaluated.
            </p>

            <div className="flex justify-center gap-3 mt-5">
              
              {/* View Results */}
              <button
                onClick={() => {
                  navigate(`/dashboard/facilitator/results/${evaluationId}`);
                }}
                className="w-[167px] h-[40px] rounded-[4px] text-sm rounded bg-gray-200 hover:bg-gray-300"
              >
                View Batch Results
              </button>

              {/* Return */}
              <button
                onClick={() => {
                  onClose(); // close modal
                }}
                className="w-[224px] h-[40px] rounded-[4px] text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Return to Evaluation Center
              </button>

            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default EvaluationModal;