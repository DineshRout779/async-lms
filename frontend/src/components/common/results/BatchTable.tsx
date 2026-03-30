const BatchTable = () => {
  const data = [
    {
      batch: "B1",
      college: "Masai School",
      submissions: "40/45",
      avg: "78.2",
    },
  ];

  return (
    <div className="mt-6 border rounded-lg overflow-hidden">
      <h2 className="p-4 font-medium text-sm">Batch Results</h2>

      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Batch</th>
            <th className="p-3 text-left">College</th>
            <th className="p-3">Submissions</th>
            <th className="p-3">Avg Score</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="border-t">
              <td className="p-3">{item.batch}</td>
              <td className="p-3">{item.college}</td>
              <td className="p-3">{item.submissions}</td>
              <td className="p-3">{item.avg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BatchTable;