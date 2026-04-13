// TopHeader.tsx
import { useEffect, useState } from "react";

type Props = {
  onFilterChange: (filters: { college: string; domain: string; batch: string }) => void;
};
type College = {
  id: string;
  name: string;
};

type Domain = {
  id: string;
  name: string;
};

type Batch = {
  id: string;
  name: string;
};

const TopHeader = ({ onFilterChange }: Props) => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [selectedCollege, setSelectedCollege] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchFilters = async () => {
      const [collegeRes, domainRes, batchRes] = await Promise.all([
        fetch("http://localhost:3001/api/v1/colleges", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://localhost:3001/api/v1/subjects/dropdown", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://localhost:3001/api/v1/facilitator/batches", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const collegeData = await collegeRes.json();
      const domainData = await domainRes.json();
      const batchData = await batchRes.json();

      setColleges(collegeData.data || []);
      setDomains(domainData.data || []);
      setBatches(batchData.data || []);
    };

    fetchFilters();
  }, []);

  // Whenever a filter changes, inform parent
  useEffect(() => {
    // onFilterChange({ college: selectedCollege, domain: selectedDomain, batch: selectedBatch });
    const newFilters = {
    college: selectedCollege,
    domain: selectedDomain,
    batch: selectedBatch,
  };

  onFilterChange(newFilters);
  }, [selectedCollege, selectedDomain, selectedBatch, onFilterChange]);

  return (
    <div className="flex items-center justify-between mb-4 bg-white h-[56px] p-[24px]">

      {/* Filters */}
      <div className="flex items-center gap-3">

        {/* COLLEGE */}
        <select
          value={selectedCollege}
          onChange={(e) => setSelectedCollege(e.target.value)}
          className="border px-3 py-2 rounded text-sm"
        >
          <option value="">All Colleges</option>
          {Array.isArray(colleges) && colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* DOMAIN */}
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="border px-3 py-2 rounded text-sm"
        >
          <option value="">All Domains</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* BATCH */}
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="border px-3 py-2 rounded text-sm"
        >
          <option value="">All Batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

      </div>
    </div>
  );
  }; 

export default TopHeader;