type Result = {
  expected_graduation_year?: string;
  college_name?: string;
  marks?: number;
};

const BatchTable = ({ results }: { results: Result[] }) => {
  // Group results by college_name
  const grouped = results.reduce((acc: any, r) => {
    const college = r.college_name || "Unknown";
    const year = r.expected_graduation_year;
    
    if (!acc[college]) {
      acc[college] = { college, count: 0, totalScore: 0, years: {} };
    }
    
    acc[college].count += 1;
    acc[college].totalScore += (r.marks || 0);
    
    if (year) {
      acc[college].years[year] = (acc[college].years[year] || 0) + 1;
    }
    
    return acc;
  }, {});

  const data = Object.values(grouped).map((g: any) => {
    // Find the most frequent graduation year for this college
    let mostFrequentYear = "Unknown";
    let maxCount = 0;
    
    for (const [year, count] of Object.entries(g.years)) {
      if ((count as number) > maxCount) {
        maxCount = count as number;
        mostFrequentYear = year;
      }
    }

    return {
      year: mostFrequentYear,
      college: g.college,
      submissions: g.count,
      avg: (g.totalScore / g.count).toFixed(1)
    };
  });

  return (
    <div className="mt-6 border rounded-lg overflow-hidden">
      <h2 className="p-4 font-medium text-sm">Graduation Year Results</h2>

      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Graduation Year</th>
            <th className="p-3 text-left">College</th>
            <th className="p-3">Submissions</th>
            <th className="p-3">Avg Score</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={4} className="p-4 text-center text-slate-500">No data available</td>
            </tr>
          ) : (
            data.map((item: any, i: number) => (
              <tr key={i} className="border-t">
                <td className="p-3">{item.year}</td>
                <td className="p-3">{item.college}</td>
                <td className="p-3 text-center">{item.submissions}</td>
                <td className="p-3 text-center">{item.avg}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BatchTable;