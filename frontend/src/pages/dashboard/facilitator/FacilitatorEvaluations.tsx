import { useState, useCallback } from 'react';
import TopHeader from '@/components/common/facilitator/TopHeader';
import EvaluationTable from '@/components/evaluations/EvaluationTable';

const FacilitatorEvaluations = () => {
  const [filters, setFilters] = useState({ college: '', domain: '', batch: '' });
  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(false);

  const handleFilterChange = useCallback((f: { college: string; domain: string; batch: string }) => {
    setFilters(f);
  }, []);

  return (
    <div>
      <TopHeader onFilterChange={handleFilterChange} />

      <div className='mt-4 space-y-4 px-4 py-3'>
        <div className='text-xs text-slate-400'>
          Dashboard / <span className='text-black'>Evaluation Center</span>
        </div>

        <div>
          <h1 className='text-2xl font-semibold text-slate-800'>Evaluation Center</h1>
          <p className='text-sm text-slate-500'>
            Evaluate assignments by domain, batch, and students
          </p>
        </div>

        <div className='flex items-center gap-3'>


          <input
            type='text'
            placeholder='Search assignments...'
            className='border border-slate-200 px-3 py-2 rounded-md text-sm w-64 focus:outline-none focus:ring-1 focus:ring-slate-300'
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
