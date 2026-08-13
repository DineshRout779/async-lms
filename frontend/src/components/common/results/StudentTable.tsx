import { useState, useEffect } from 'react';
import apiClient from '@/services/api';

type Result = {
  submission_id?: string;
  id?: string;
  student_name: string;
  marks: number;
  feedback: string;
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
// type: a plain string (Python), or a JSON string with a `summary`/`feedback`
// field plus optional `strengths`/`issues`/`breakdown` arrays (JS/Visual).
// Parse it defensively and render something readable either way.
const FeedbackCell = ({ feedback }: { feedback: string }) => {
  if (!feedback) return <span className="text-slate-400">—</span>;

  let parsed: any = null;
  try {
    parsed = JSON.parse(feedback);
  } catch {
    // not JSON — plain string feedback, render as-is
  }

  if (!parsed || typeof parsed !== 'object') {
    return <span>{feedback}</span>;
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
  const lists: { label: string; items: string[] }[] = [
    { label: 'Strengths', items: parsed.strengths || [] },
    { label: 'Issues', items: parsed.issues || [] },
    {
      label: 'Breakdown',
      items: Array.isArray(parsed.breakdown)
        ? parsed.breakdown.map((b: any) => `${b.item}: ${b.awarded}/${b.max} — ${b.reason}`)
        : [],
    },
  ].filter((l) => l.items.length > 0);

  return (
    <div className="max-w-xs">
      {summary && <p>{summary}</p>}
      {lists.length > 0 && (
        <details className="mt-1 text-xs text-slate-500">
          <summary className="cursor-pointer select-none">Details</summary>
          {lists.map((l) => (
            <div key={l.label} className="mt-1">
              <span className="font-medium">{l.label}:</span>
              <ul className="list-disc list-inside">
                {l.items.map((item, i) => (
                  <li key={i}>{item}</li>
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

  // Poll for updates if any row is pending
  useEffect(() => {
    const hasPending = results.some((r) => r.status === 'pending');
    if (!hasPending || !evaluation?.id || !onRefresh) return;

    const interval = setInterval(async () => {
      try {
        await apiClient.get(`/evaluations/sync/${evaluation.id}`);
        onRefresh();
      } catch (err) {
        console.error('Failed to sync', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [results, evaluation, onRefresh]);

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
                {item.status === 'pending' ? (
                  <span className="text-yellow-600">Pending...</span>
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