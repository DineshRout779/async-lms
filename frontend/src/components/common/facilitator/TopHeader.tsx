import { useEffect, useState } from 'react';
import apiClient from '@/services/api';

type Props = {
  onFilterChange: (filters: {
    college: string;
    domain: string;
    batch: string;
  }) => void;
};

type College = { id: string; name: string };
type Domain = { id: string; name: string };
type Batch = { id: string; name: string };

const TopHeader = ({ onFilterChange }: Props) => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [collegeRes, domainRes, batchRes] = await Promise.all([
          apiClient.get('/facilitator/colleges'),
          apiClient.get('/subjects/dropdown'),
          apiClient.get('/facilitator/batches'),
        ]);
        setColleges(collegeRes.data.data || []);
        setDomains(domainRes.data.data || []);
        setBatches(batchRes.data.data || []);
      } catch {
        // Non-critical filter data — silently skip
      }
    };
    fetchFilters();
  }, []);

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
    <div className='flex items-center gap-3 my-4'>
      <select
        value={selectedCollege}
        onChange={(e) => setSelectedCollege(e.target.value)}
        className='border border-slate-200 px-3 py-1.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400'
      >
        <option value=''>All Colleges</option>
        {colleges.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={selectedDomain}
        onChange={(e) => setSelectedDomain(e.target.value)}
        className='border border-slate-200 px-3 py-1.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400'
      >
        <option value=''>All Domains</option>
        {domains.map((d) => (
          <option key={d.id} value={d.name}>
            {d.name}
          </option>
        ))}
      </select>

      <select
        value={selectedBatch}
        onChange={(e) => setSelectedBatch(e.target.value)}
        className='border border-slate-200 px-3 py-1.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400'
      >
        <option value=''>All Grad Years</option>
        {batches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TopHeader;
