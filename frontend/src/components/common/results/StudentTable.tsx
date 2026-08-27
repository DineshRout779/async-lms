import { useState, useEffect, useRef } from 'react';
import apiClient from '@/services/api';

type Result = {
  submission_id?: string;
  id?: string;
  student_name: string;
  marks: number;
  feedback: string | Record<string, any> | null;
  submission_link?: string;
  submission_file_url?: string;
  status?: string;
};

type Props = {
  results: Result[];
  evaluation?: any;
  assignmentId?: string;
  onRefresh?: () => void;
};

// Evaluator feedback comes back in different shapes depending on evaluator
// type: a plain string (Python), or a JSON string/object with `summary`/`feedback`
// field plus optional `strengths`/`issues`/`breakdown` arrays (JS/Visual/React).
// Parse it defensively and render something readable either way.
const FeedbackCell = ({ feedback }: { feedback: string | object | null }) => {
  if (!feedback) return <span className="text-slate-400">—</span>;

  let parsed: any = null;

  if (typeof feedback === 'object') {
    // pg already deserialized JSONB
    parsed = feedback;
  } else {
    try {
      parsed = JSON.parse(feedback as string);
    } catch {
      // not JSON — plain string feedback, render as-is
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return <span>{feedback as string}</span>;
  }

  // Handle arrays (e.g. syntax or validation errors from the evaluator)
  if (Array.isArray(parsed)) {
    return (
      <ul className="list-disc list-inside text-red-600 text-xs mt-1">
        {parsed.map((err, i) => (
          <li key={i}>{err.feedback || err.error || JSON.stringify(err)}</li>
        ))}
      </ul>
    );
  }

  const summary: string | undefined = parsed.summary || parsed.feedback;
  const lists: { label: string; items: string[]; color?: string }[] = [
    {
      label: '✅ Strengths',
      items: parsed.strengths || [],
      color: 'text-emerald-600',
    },
    {
      label: '⚠️ Issues',
      items: parsed.issues || [],
      color: 'text-red-500',
    },
    {
      label: '📊 Score Breakdown',
      items: Array.isArray(parsed.breakdown)
        ? parsed.breakdown.map(
            (b: any) => `${b.item}: ${b.awarded}/${b.max} pts — ${b.reason}`
          )
        : [],
      color: 'text-slate-600',
    },
  ].filter((l) => l.items.length > 0);

  return (
    <div className="max-w-xs">
      {summary && <p className="text-sm text-slate-700 leading-snug">{summary}</p>}
      {lists.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer select-none font-medium text-slate-500 hover:text-slate-700">
            View Details
          </summary>
          {lists.map((l) => (
            <div key={l.label} className="mt-2">
              <span className={`font-semibold ${l.color || 'text-slate-600'}`}>
                {l.label}:
              </span>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                {l.items.map((item, i) => (
                  <li key={i} className={l.color || 'text-slate-500'}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </details>
      )}
      {!summary && lists.length === 0 && (
        <span className="text-slate-400">No feedback details available.</span>
      )}
    </div>
  );
};


const StudentTable = ({ results, evaluation, assignmentId, onRefresh }: Props) => {
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [bulkEvaluatorType, setBulkEvaluatorType] = useState<string>('');
  const [bulkReEvaluating, setBulkReEvaluating] = useState(false);

  // Keep refs to latest values so setInterval callbacks are never stale
  const onRefreshRef = useRef(onRefresh);
  const resultsRef = useRef(results);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);
  useEffect(() => { resultsRef.current = results; }, [results]);

  // Poll for updates if any row is pending — interval is only created once per evaluation
  useEffect(() => {
    if (!evaluation?.id) return;

    let retries = 0;
    const MAX_RETRIES = 40; // ~2 minutes at 3s interval
    let lastCompletedCount = -1; // Track progress — only refresh when count increases

    const interval = setInterval(async () => {
      // Only poll for REAL pending rows (those with an `id` in evaluation_results).
      // Virtual rows (new submissions not yet queued) have no `id` — they need
      // manual 'Evaluate Selected', not automatic polling.
      const hasPending = resultsRef.current.some((r) => r.status === 'pending' && r.id);
      if (!hasPending || retries >= MAX_RETRIES) {
        clearInterval(interval);
        return;
      }
      retries++;
      try {
        const { data } = await apiClient.get(`/evaluations/sync/${evaluation.id}`);
        const newCount = data?.progress?.completed ?? 0;
        const isFinished = data?.progress?.isFinished ?? false;
        if (isFinished) {
          // Evaluation done — refresh once and stop polling entirely
          onRefreshRef.current?.();
          clearInterval(interval);
          return;
        }
        // Only refresh when a new job just completed (count went up)
        if (newCount > lastCompletedCount) {
          lastCompletedCount = newCount;
          onRefreshRef.current?.();
        }
      } catch (err) {
        console.error('Failed to sync', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluation?.id]);

  const handleBulkReevaluate = async () => {
    if (!onRefresh || selectedSubmissions.length === 0) return;
    const type = bulkEvaluatorType || evaluation?.evaluator_type || 'REACT';

    try {
      setBulkReEvaluating(true);
      await apiClient.post('/evaluations/re-evaluate', {
        evaluationId: evaluation?.id,
        assignmentId: assignmentId,
        submissionIds: selectedSubmissions,
        evaluatorType: type
      });
      setSelectedSubmissions([]); // Clear selection on success
      onRefresh();
    } catch (err: any) {
      alert("Failed to bulk re-evaluate: " + (err.response?.data?.message || err.message));
    } finally {
      setBulkReEvaluating(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSubmissions(results.map(r => r.submission_id || r.id || ''));
    } else {
      setSelectedSubmissions([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedSubmissions(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };
  return (
    <div className="mt-6 border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-medium text-sm">Student Results</h2>
        
        {evaluation && (
          <div className='flex items-center gap-2'>
            <select
              value={bulkEvaluatorType}
              onChange={(e) => setBulkEvaluatorType(e.target.value)}
              className='text-sm border-gray-300 rounded-md py-1.5'
            >
              <option value=''>Auto (based on assignment)</option>
              <option value='REACT'>React</option>
              <option value='JS'>JavaScript</option>
              <option value='VISUAL'>Visual</option>
              <option value='backend'>Backend (Node)</option>
              <option value='python'>Python</option>
              <option value='fullstack'>Fullstack</option>
            </select>
            <button 
              className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              onClick={handleBulkReevaluate}
              disabled={bulkReEvaluating || selectedSubmissions.length === 0}
            >
              {bulkReEvaluating ? 'Evaluating...' : (evaluation?.id ? 'Re-evaluate Selected' : 'Evaluate Selected')}
            </button>
          </div>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left w-12">
              <input 
                type="checkbox" 
                onChange={handleSelectAll}
                checked={results.length > 0 && selectedSubmissions.length === results.length}
                className="w-4 h-4 rounded border-gray-300"
              />
            </th>
            <th className="p-3 text-left">Student</th>
            <th className="p-3">Status</th>
            <th className="p-3">Score</th>
            <th className="p-3">Feedback</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {results.map((item, i) => {
            const rowId = item.submission_id || item.id || '';
            return (
            <tr key={i} className="border-t">
              <td className="p-3 text-left">
                <input 
                  type="checkbox" 
                  checked={selectedSubmissions.includes(rowId)}
                  onChange={() => handleSelect(rowId)}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </td>
              <td className="p-3">{item.student_name}</td>
              <td className="p-3">
                {item.status === 'pending' && item.id ? (
                  <span className="text-yellow-600">Pending...</span>
                ) : item.status === 'pending' && !item.id ? (
                  <span className="text-orange-500" title="Submitted after evaluation started — select and click Evaluate Selected">Not evaluated</span>
                ) : item.status === 'failed' ? (
                  <span className="text-red-600">Failed</span>
                ) : (
                  <span className="text-green-600">Evaluated</span>
                )}
              </td>
              <td className="p-3">{item.marks}</td>
              <td className="p-3"><FeedbackCell feedback={item.feedback} /></td>
              <td className="p-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {item.submission_link ? (
                      <a href={item.submission_link} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                        View Link
                      </a>
                    ) : item.submission_file_url ? (
                      <a href={item.submission_file_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                        View File
                      </a>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </div>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;