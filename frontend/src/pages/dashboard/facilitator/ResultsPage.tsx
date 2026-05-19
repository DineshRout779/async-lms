import TopHeader from "@/components/common/facilitator/TopHeader";
import { useNavigate, useParams } from "react-router";
import { useState, useEffect } from "react";
import StatsCard from "@/components/common/results/StatsCard";
import ScoreChart from "@/components/common/results/ScoreChart";
import BatchTable from "@/components/common/results/BatchTable";
import StudentTable from "@/components/common/results/StudentTable";

type Evaluation = {
  assignment_id: string;
};
const ResultsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // evaluationId

const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
const [results, setResults] = useState([]);

  const assignmentName = evaluation?.assignment_id;
  useEffect(() => {
  const fetchResults = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/evaluations/${id}`);
      const data = await res.json();

      setEvaluation(data.evaluation);
      setResults(data.results);

    } catch (err) {
      console.error("Failed to fetch results", err);
    }
  };

  if (id) fetchResults();
}, [id]);

  return (
    <div>
      <TopHeader onFilterChange={() => {}}/>
    <div className="p-6">

      {/* Back + Title */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600"
          >
          ←
        </button>

        <h1 className="text-xl font-semibold">
          Evaluation Results
        </h1>
      </div>

      {/* Assignment */}
      <p className="text-sm text-gray-500 mt-1">
        {assignmentName}
      </p>

      {/* Cards */}
      <StatsCard results={results} />

      {/* Chart */}
      <ScoreChart results={results}/>

      {/* Batch Table */}
      <BatchTable />

      {/* Student Table */}
      <StudentTable results={results} />
        </div>
    </div>
  );
};

export default ResultsPage;