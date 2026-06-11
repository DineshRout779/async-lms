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
              <td className="p-3">{item.feedback}</td>
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