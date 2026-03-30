import { useState, useEffect } from "react";
import TopHeader from "@/components/common/facilitator/TopHeader";
import EvaluationTable from "@/components/evaluations/EvaluationTable";

const FacilitatorEvaluations = () => {
  const [filters, setFilters] = useState({ college: "", domain: "", batch: "" });
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(false); // trigger table refetch after evaluation
  const [domains, setDomains] = useState<{ id: string; name: string }[]>([]);


useEffect(() => {
  const fetchDomains = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:3001/api/v1/subjects/dropdown", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setDomains(data.data || []);
    } catch (err) {
      console.error("Failed to fetch domains", err);
    }
  };

  fetchDomains();
}, []);

  return (
    <div>
      <TopHeader onFilterChange={(f) => setFilters(f)} />

      <div className="mt-4 space-y-4 px-4 py-3"> {/* controls vertical spacing */}

        {/* Breadcrumb */}
        <div className="text-[12px] text-slate-400">
          Dashboard / <span className="text-black">Evaluation Center</span>
        </div>

        {/* Title Section */}
        <div>
          <h1 className="text-[24px] font-semibold text-slate-800">
            Evaluation Center
          </h1>
          <p className="text-[14px] text-slate-500">
            Evaluate assignments by domain, batch, and students
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select className="border border-slate-200 px-3 py-2 rounded-md text-sm"
          value={filters.domain}
          onChange={(e) => setFilters((prev) => ({ ...prev, domain: e.target.value }))}
          >
            <option value="">All Domains</option>

  {domains.map((d) => (
    <option key={d.id} value={d.name}>
      {d.name}
    </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search assignments..."
            className="border border-slate-200 px-3 py-2 rounded-md text-sm w-64 focus:outline-none focus:ring-1 focus:ring-slate-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <EvaluationTable
          search={search}
          selectedCollege={filters.college}
          selectedDomain={filters.domain}
          selectedBatch={filters.batch}
          refresh={refresh}
          onEvaluationComplete={() => setRefresh((r) => !r)}
        />
      </div>
    </div>
  );
};

export default FacilitatorEvaluations;