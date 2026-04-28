import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import TopHeader from '@/components/common/facilitator/TopHeader';
import { getAnalytics } from '@/services/analytics.ts';
import apiClient from '@/services/api';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Filters = {
  college?: string;
  domain?: string;
  batch?: string;
  assignment?: string;
};

type Trend = { title: string; avg_marks: number };
type Completion = { title: string; completed: number; pending: number };
type DomainPerformance = { domain: string; avg_marks: number };
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
type BatchGrowth = { batch: string; month: string; avg_marks: number | string };
type ChartRow = { [key: string]: string | number };

type AnalyticsData = {
  trend: Trend[];
  completion: Completion[];
  domainPerformance: DomainPerformance[];
  scoreDistribution: ScoreDistribution;
  batchDomainComparison: BatchDomain[];
  batchGrowth: BatchGrowth[];
};

type Assignment = { id: string; title: string };

// ─── Chart helpers ────────────────────────────────────────────────────────────

function transformBatchDomain(data: BatchDomain[]): ChartRow[] {
  const result: Record<string, ChartRow> = {};
  data.forEach(({ batch, domain, avg_marks }) => {
    if (!result[domain]) result[domain] = { domain };
    result[domain][batch] = Number(avg_marks);
  });
  return Object.values(result);
}

function transformGrowth(data: BatchGrowth[]): ChartRow[] {
  const result: Record<string, ChartRow> = {};
  data.forEach(({ batch, month, avg_marks }) => {
    if (!result[month]) result[month] = { month };
    result[month][batch] = Number(avg_marks);
  });
  return Object.values(result);
}

const COLORS = ['#113997', '#463ACB', '#10B77F'];

// ─── Component ────────────────────────────────────────────────────────────────

const Analytics = () => {
  const navigate = useNavigate();

  const [topHeaderFilters, setTopHeaderFilters] = useState<Filters>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch assignment dropdown
  useEffect(() => {
    apiClient.get('/college-assignments/facilitator')
      .then((res) => {
        const assignmentData: Assignment[] = res.data?.data || [];
        setAssignments(assignmentData);
      })
      .catch(() => {});
  }, []);

  // Fetch analytics data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await getAnalytics({
          ...topHeaderFilters,
          assignment: selectedAssignment,
        });
        if (!cancelled) { setData(res); setLoading(false); setError(false); }
      } catch {
        if (!cancelled) { setError(true); setLoading(false); }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [topHeaderFilters, selectedAssignment]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader2 className='w-6 h-6 animate-spin text-indigo-500' />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='p-6 text-sm text-slate-500'>
        Failed to load analytics data.
      </div>
    );
  }

  const hasData =
    data.trend.length ||
    data.completion.length ||
    data.domainPerformance.length;
  if (!hasData) {
    return <div className='p-6 text-sm text-slate-500'>No data available.</div>;
  }

  // ── Chart data transforms ──────────────────────────────────────────────────

  const completionData = data.completion.map((item) => ({
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

  const batchDomainChartData = transformBatchDomain(
    data.batchDomainComparison || [],
  );
  const growthChartData = transformGrowth(data.batchGrowth || []);
  const batches = [
    ...new Set((data.batchDomainComparison || []).map((item) => item.batch)),
  ];

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div>
      <TopHeader
        onFilterChange={(newFilters) => {
          setTopHeaderFilters((prev) => {
            if (
              prev.college === newFilters.college &&
              prev.domain === newFilters.domain &&
              prev.batch === newFilters.batch
            )
              return prev;
            return newFilters;
          });
        }}
      />

      <div className='flex gap-6 flex-col bg-gray-100 min-h-screen px-4 py-3'>
        {/* Breadcrumb */}
        <p className='text-[12px] text-slate-400'>
          Dashboard / <span className='text-black'>Analytics Dashboard</span>
        </p>

        {/* Title */}
        <div>
          <h1 className='text-2xl font-semibold text-slate-800'>
            Analytics Dashboard
          </h1>
          <p className='text-sm text-slate-500'>
            Deep insights into performance and trends
          </p>
        </div>

        {/* Assignment filter */}
        <div className='flex items-center gap-3'>
          <select
            value={selectedAssignment}
            onChange={(e) => setSelectedAssignment(e.target.value)}
            className='border px-3 py-2 rounded text-sm'
          >
            <option value=''>All Assignments</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>

        {/* Charts grid */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='bg-white p-4 rounded-xl shadow'>
            <h3 className='font-semibold text-sm mb-2'>
              Student Performance Trend
            </h3>
            <ResponsiveContainer width='100%' height={250}>
              <LineChart data={data.trend}>
                <CartesianGrid stroke='#E5E7EB' vertical={false} />
                <XAxis dataKey='title' />
                <YAxis />
                <Tooltip />
                <Line type='monotone' dataKey='avg_marks' stroke='#3b82f6' />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className='bg-white p-4 rounded-xl shadow'>
            <h3 className='font-semibold text-sm mb-2'>
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

          <div className='bg-white p-4 rounded-xl shadow'>
            <h3 className='font-semibold text-sm mb-2'>Domain Performance</h3>
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={data.domainPerformance}>
                <XAxis dataKey='domain' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='avg_marks' fill='#6366f1' />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className='bg-white p-4 rounded-xl shadow'>
            <h3 className='font-semibold text-sm mb-2'>Score Distribution</h3>
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={scoreDist}>
                <XAxis dataKey='range' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='value' fill='#1e3a8a' />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className='bg-white p-4 rounded-xl shadow'>
            <h3 className='font-semibold text-sm mb-2'>
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

          <div className='bg-white p-4 rounded-xl shadow'>
            <h3 className='font-semibold text-sm mb-2'>
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

        {/* Drill-down CTA */}
        <div className='bg-white p-4 rounded-xl border-l-4 border-blue-600 shadow flex items-center justify-between'>
          <div>
            <h3 className='text-sm font-semibold text-slate-800'>
              View Student-Level Performance
            </h3>
            <p className='text-xs text-slate-500 mt-1'>
              Drill down into individual student scores and evaluations
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/facilitator/student-growth')}
            className='text-[#0F1729] bg-slate-50 px-4 py-2 text-xs font-medium rounded-md border border-slate-200 hover:bg-slate-100 transition'
          >
            View Students →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
