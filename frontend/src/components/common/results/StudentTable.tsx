import { useState, useEffect, useMemo, Fragment } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

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

  const filteredResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return results;
    return results.filter((r) => {
      const name = (r.student_name || '').toLowerCase();
      const feedback = (r.feedback || '').toLowerCase();
      return name.includes(q) || feedback.includes(q);
    });
  }, [results, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, results]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, currentPage, pageSize]);

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
      setSelectedSubmissions(filteredResults.map(r => r.submission_id || r.id || ''));
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
    <div className="mt-4 sm:mt-6 border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs min-w-0">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <h2 className="font-bold text-xs sm:text-sm text-slate-900 shrink-0">Student Results</h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or feedback..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 min-h-[36px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {evaluation && (
          <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0'>
            <select
              value={bulkEvaluatorType}
              onChange={(e) => setBulkEvaluatorType(e.target.value)}
              className='text-xs sm:text-sm border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-slate-700 min-h-[36px]'
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
              className="text-xs sm:text-sm font-semibold px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[36px] transition shadow-xs"
              onClick={handleBulkReevaluate}
              disabled={bulkReEvaluating || selectedSubmissions.length === 0}
            >
              {bulkReEvaluating ? 'Evaluating...' : (evaluation?.id ? 'Re-evaluate Selected' : 'Evaluate Selected')}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Card View (< md) */}
      <div className="md:hidden divide-y divide-slate-100">
        {results.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs">No students available</div>
        ) : filteredResults.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs">No matching student results found</div>
        ) : (
          paginatedResults.map((item, i) => {
            const rowId = item.submission_id || item.id || '';
            return (
              <div key={i} className="p-3.5 space-y-2.5 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <input 
                      type="checkbox" 
                      checked={selectedSubmissions.includes(rowId)}
                      onChange={() => handleSelect(rowId)}
                      className="w-4 h-4 rounded border-slate-300 shrink-0"
                    />
                    <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {item.student_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.status === 'pending' ? (
                      <span className="text-yellow-600 text-[10px] font-bold bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">Pending...</span>
                    ) : item.status === 'failed' ? (
                      <span className="text-red-600 text-[10px] font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Failed</span>
                    ) : (
                      <span className="text-green-700 text-[10px] font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Evaluated</span>
                    )}
                    <span className="font-extrabold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.marks} pts
                    </span>
                  </div>
                </div>

                {/* Feedback */}
                {item.feedback && (
                  <div className="text-[11px] bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-slate-700">
                    <FeedbackCell feedback={item.feedback} />
                  </div>
                )}

                {/* Action */}
                <div className="flex items-center justify-end pt-1">
                  {item.submission_link ? (
                    <a href={item.submission_link} target="_blank" rel="noreferrer" className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg">
                      View Link
                    </a>
                  ) : item.submission_file_url ? (
                    <a href={item.submission_file_url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg">
                      View File
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar w-full min-w-0">
        <table className="w-full min-w-[700px] text-xs sm:text-sm border-separate border-spacing-0">
          <thead className="bg-slate-50/60 text-slate-500 text-[11px] sm:text-xs uppercase">
            <tr>
              <th className="p-3 text-left w-12">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={filteredResults.length > 0 && selectedSubmissions.length === filteredResults.length}
                  className="w-4 h-4 rounded border-slate-300"
                />
              </th>
              <th className="p-3 text-left font-semibold">Student</th>
              <th className="p-3 font-semibold text-center">Status</th>
              <th className="p-3 font-semibold text-center">Score</th>
              <th className="p-3 font-semibold">Feedback</th>
              <th className="p-3 font-semibold text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400 text-xs sm:text-sm">
                  No matching student results found.
                </td>
              </tr>
            ) : (
              paginatedResults.map((item, i) => {
                const rowId = item.submission_id || item.id || '';
                return (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                  <td className="p-3 text-left">
                    <input 
                      type="checkbox" 
                      checked={selectedSubmissions.includes(rowId)}
                      onChange={() => handleSelect(rowId)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  </td>
                  <td className="p-3 font-medium text-slate-900">{item.student_name}</td>
                  <td className="p-3 text-center">
                    {item.status === 'pending' ? (
                      <span className="text-yellow-600 text-xs font-semibold bg-yellow-50 px-2 py-0.5 rounded-full">Pending...</span>
                    ) : item.status === 'failed' ? (
                      <span className="text-red-600 text-xs font-semibold bg-red-50 px-2 py-0.5 rounded-full">Failed</span>
                    ) : (
                      <span className="text-green-600 text-xs font-semibold bg-green-50 px-2 py-0.5 rounded-full">Evaluated</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900">{item.marks}</td>
                  <td className="p-3"><FeedbackCell feedback={item.feedback} /></td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.submission_link ? (
                        <a href={item.submission_link} target="_blank" rel="noreferrer" className="text-blue-600 text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1">
                          View Link
                        </a>
                      ) : item.submission_file_url ? (
                        <a href={item.submission_file_url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1">
                          View File
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs sm:text-sm">—</span>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredResults.length > 0 && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-50/80">
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, filteredResults.length)}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredResults.length}</span> results
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-lg h-7 px-2 text-xs text-slate-700 bg-white shadow-2xs hover:bg-slate-50"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              Prev
            </Button>

            <div className="flex items-center gap-1 mx-0.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="text-slate-300 text-xs px-0.5 select-none">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={cn(
                        'w-6 h-6 rounded-md text-xs font-bold transition-all flex items-center justify-center',
                        currentPage === p
                          ? 'bg-[#1e2653] text-white shadow-xs'
                          : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-100',
                      )}
                    >
                      {p}
                    </button>
                  </Fragment>
                ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg h-7 px-2 text-xs text-slate-700 bg-white shadow-2xs hover:bg-slate-50"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTable;