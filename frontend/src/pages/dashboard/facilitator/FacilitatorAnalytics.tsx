import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import TopHeader from '@/components/common/facilitator/TopHeader';
import { getAnalytics } from '@/services/analytics.ts';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Filters = {
  college?: string;
  domain?: string;
  batch?: string;
  assignment?: string;
};

type Trend = {
  title: string;
  avg_marks: number;
};

type Completion = {
  title: string;
  completed: number;
  pending: number;
};

type DomainPerformance = {
  domain: string;
  avg_marks: number;
};

type ScoreDistribution = {
  '0-20': number;
  '21-40': number;
  '41-60': number;
  '61-80': number;
  '81-100': number;
};

type BatchDomain = {
  batch: string;
  domain: string;
  avg_marks: number | string;
};

type BatchGrowth = {
  batch: string;
  month: string; // or Date if formatted
  avg_marks: number | string;
};

type ChartRow = {
  [key: string]: string | number;
};
type AnalyticsData = {
  trend: Trend[];
  completion: Completion[];
  domainPerformance: DomainPerformance[];
  scoreDistribution: ScoreDistribution;
  batchDomainComparison: BatchDomain[]; // Define properly based on actual data
  batchGrowth: BatchGrowth[]; // Define properly based on actual data
};

const Analytics = () => {
  const [filters, setFilters] = useState<Filters>({}); // TopHeader filters
  const navigate = useNavigate();
  const [colleges, setColleges] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('');

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ FETCH DROPDOWNS
  useEffect(() => {
    const fetchFilters = async () => {
      const token = localStorage.getItem('token');

      const [collegeRes, domainRes, assignmentRes] = await Promise.all([
        fetch('http://localhost:3001/api/v1/colleges', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/v1/subjects/dropdown', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/v1/college-assignments', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const collegeData = await collegeRes.json();
      const domainData = await domainRes.json();
      const assignmentData = await assignmentRes.json();

      setColleges(collegeData.data || []);
      setDomains(domainData.data || []);
      setAssignments(assignmentData.data || []);

      // ✅ DEFAULT VALUES
      if (collegeData.data?.length) setSelectedCollege(collegeData.data[0].id);
      if (domainData.data?.length) setSelectedDomain(domainData.data[0].id);
      if (assignmentData.data?.length)
        setSelectedAssignment(assignmentData.data[0].id);
    };

    fetchFilters();
  }, []);

  // ✅ FETCH ANALYTICS DATA (MERGE BOTH FILTERS)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await getAnalytics({
          ...filters, // from TopHeader
          college: selectedCollege || filters.college,
          domain: selectedDomain || filters.domain,
          assignment: selectedAssignment,
        });

        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, selectedCollege, selectedDomain, selectedAssignment]);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data available</div>;
  const hasData =
    data.trend.length ||
    data.completion.length ||
    data.domainPerformance.length;

  if (!hasData) {
    return <div className='p-6'>No data available</div>;
  }

  const completionData = data.completion.map((item: Completion) => ({
    ...item,
    completed: Number(item.completed),
    pending: Number(item.pending),
  }));

  const scoreDist = Object.entries(data.scoreDistribution).map(
    ([key, val]) => ({
      range: key,
      value: val,
    }),
  );

  const transformBatchDomain = (data: BatchDomain[]) => {
    const result: Record<string, ChartRow> = {};

    data.forEach(({ batch, domain, avg_marks }) => {
      if (!result[domain]) {
        result[domain] = { domain };
      }

      result[domain][batch] = Number(avg_marks);
    });

    return Object.values(result);
  };

  const batchDomainChartData = transformBatchDomain(
    data.batchDomainComparison || [],
  );

  const transformGrowth = (data: BatchGrowth[]) => {
    const result: Record<string, ChartRow> = {};

    data.forEach(({ batch, month, avg_marks }) => {
      if (!result[month]) {
        result[month] = { month };
      }

      result[month][batch] = Number(avg_marks);
    });

    return Object.values(result);
  };

  const growthChartData = transformGrowth(data.batchGrowth || []);

  const batches = [
    ...new Set((data.batchDomainComparison || []).map((item) => item.batch)),
  ];

  const COLORS = ['#113997', '#463ACB', '#10B77F'];

  // const batchDomainData = data.batchDomainComparison;
  // const batchGrowthData = data.batchGrowth;
  // const batchDomainData = (data.batchDomainComparison || []).map(
  //   (item: BatchDomain) => ({
  //     ...item,
  //     avg_marks: Number(item.avg_marks),
  //   }),
  // );

  // const growthData = (data.batchGrowth || []).map((item: BatchGrowth) => ({
  //   ...item,
  //   avg_marks: Number(item.avg_marks),
  // }));
  return (
    <div>
      {/* <TopHeader onFilterChange={setFilters} /> */}
      <TopHeader
        onFilterChange={(newFilters) => {
          setFilters((prev) => {
            if (
              prev.college === newFilters.college &&
              prev.domain === newFilters.domain &&
              prev.batch === newFilters.batch
            ) {
              return prev;
            }
            return newFilters;
          });
        }}
      />
      <div className='flex gap-[24px] flex-col bg-gray-100 min-h-screen px-4 py-3'>
        {/* Breadcrumb */}
        <div className='text-[12px] text-slate-400 line-height-[16px]'>
          Dashboard / <span className='text-black'>Analytics Dashboard</span>
        </div>

        {/* Title Section */}
        <div>
          <h1 className='text-[24px] font-semibold text-slate-800'>
            Analytics Dashboard
          </h1>
          <p className='text-[14px] text-slate-500'>
            Deep insights into performance and trends
          </p>
        </div>
        {/* ✅ PAGE FILTERS */}
        <div className='flex items-center gap-3'>
          {/* COLLEGE */}
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className='border px-3 py-2 rounded text-sm'
          >
            <option value=''>All Colleges</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* DOMAIN */}
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className='border px-3 py-2 rounded text-sm'
          >
            <option value=''>Select Domains</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* ASSIGNMENT */}
          <select
            value={selectedAssignment}
            onChange={(e) => setSelectedAssignment(e.target.value)}
            className='border px-3 py-2 rounded text-sm'
          >
            <option value=''>Select Assignments</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        {/* GRID */}
        <div className='grid grid-cols-2 gap-6'>
          {/* TREND */}
          <div className='bg-white p-4 rounded-[12px] shadow'>
            <h3 className='font-semibold text-[14px] mb-2 line-height-[20px]'>
              Student Performance Trend
            </h3>
            <ResponsiveContainer width='100%' height={250}>
              <LineChart data={data.trend}>
                {/* <CartesianGrid strokeDasharray="3 3" /> */}
                <CartesianGrid stroke='#E5E7EB' vertical={false} />
                <XAxis dataKey='title' />
                <YAxis />
                <Tooltip />
                <Line type='monotone' dataKey='avg_marks' stroke='#3b82f6' />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* COMPLETION */}
          <div className='bg-white p-4 rounded-[12px] shadow'>
            <h3 className='font-semibold text-[14px] mb-2 line-height-[20px]'>
              Assignment Completion
            </h3>
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={completionData}>
                <XAxis dataKey='title' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='completed' stackId='a' fill='#10b981' />
                <Bar dataKey='pending' stackId='a' fill='#f59e0b' />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* DOMAIN */}
          <div className='bg-white p-4 rounded-[12px] shadow'>
            <h3 className='font-semibold text-[14px] mb-2 line-height-[20px]'>
              Domain Performance
            </h3>
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={data.domainPerformance}>
                <XAxis dataKey='domain' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='avg_marks' fill='#6366f1' />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* SCORE DIST */}
          <div className='bg-white p-4 rounded-[12px] shadow'>
            <h3 className='font-semibold text-[14px] mb-2 line-height-[20px]'>
              Score Distribution
            </h3>
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={scoreDist}>
                <XAxis dataKey='range' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='value' fill='#1e3a8a' />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className='bg-white p-4 rounded-[12px] shadow'>
            <h3 className='font-semibold text-[14px] mb-2 line-height-[20px]'>
              Batch Domain Comparison
            </h3>
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={batchDomainChartData}>
                <XAxis dataKey='domain' />
                <YAxis />
                <Tooltip />
                <Legend />

                {batches.map((batch, index) => (
                  <Bar
                    key={batch}
                    dataKey={batch}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className='bg-white p-4 rounded-[12px] shadow'>
            <h3 className='font-semibold text-[14px] mb-2 line-height-[20px]'>
              Batch Growth Over Time
            </h3>
            <ResponsiveContainer width='100%' height={250}>
              <LineChart data={growthChartData}>
                <XAxis dataKey='month' />
                <YAxis />
                <Tooltip />
                <Legend />

                {batches.map((batch, index) => (
                  <Line
                    key={batch}
                    type='monotone'
                    dataKey={batch}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className='bg-white p-4 rounded-[12px] border-l-8-blue shadow flex items-center justify-between'>
          <div>
            <h3 className='text-[14px] font-semibold text-slate-800'>
              View Student-Level Performance
            </h3>
            <p className='text-[12px] text-slate-500 mt-1'>
              Drill down into individual student scores and evaluations
            </p>
          </div>

          <button
            onClick={() => {
              // 👉 navigate to next page (you will implement route)
              navigate(`/dashboard/facilitator/student-growth`);
              console.log('Go to student performance page');
            }}
            className='color-[#0F1729] bg-[#F8FAFC] px-4 py-2 text-[12px] font-medium rounded-md border border-slate-200 hover:bg-slate-50 transition'
          >
            View Students →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
