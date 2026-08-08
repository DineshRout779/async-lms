type Result = {
  student_name: string;
  marks: number;
  feedback: string;
  submission_link?: string;
  submission_file_url?: string;
};

type Props = {
  results: Result[];
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

const StudentTable = ({results} : Props) => {


  return (
    <div className="mt-6 border rounded-lg overflow-hidden">
      <h2 className="p-4 font-medium text-sm">Student Results</h2>

      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Student</th>
            <th className="p-3">Status</th>
            <th className="p-3">Score</th>
            <th className="p-3">Feedback</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {results.map((item, i) => (
            <tr key={i} className="border-t">
              <td className="p-3">{item.student_name}</td>
              <td className="p-3">Evaluated</td>
              <td className="p-3">{item.marks}</td>
              <td className="p-3"><FeedbackCell feedback={item.feedback} /></td>
              <td className="p-3">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;