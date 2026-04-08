import { BarChart, TrendingUp, TrendingDown, Activity } from "lucide-react";

type Result = {
  student_name: string;
  marks: number;
  feedback: string;
};

type Props = {
  results: Result[];
};

const StatsCard = ({ results }: Props) => {
  if (!results.length) 
    return (
    <div className="mt-6 text-sm text-gray-500">
      No results available
    </div>
  );


  const scores = results.map((r: Result) => r.marks);

  const avg = (
    scores.reduce((a: number, b: number) => a + b, 0) / scores.length
  ).toFixed(1);

  const top = Math.max(...scores);
  const low = Math.min(...scores);

  const data = [
    {
      label: "Average Score",
      value: avg,
      icon: BarChart,
      bg: "bg-blue-50",
      color: "text-blue-600",
    },
    {
      label: "Top Score",
      value: top,
      icon: TrendingUp,
      bg: "bg-green-50",
      color: "text-green-600",
    },
    {
      label: "Lowest Score",
      value: low,
      icon: TrendingDown,
      bg: "bg-red-50",
      color: "text-red-600",
    },
    {
      label: "Submission Count",
      value: results.length,
      icon: Activity,
      bg: "bg-purple-50",
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mt-6">
      {data.map((item, i) => (
        <div
          key={i}
          className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3"
        >
          <div
            className={`w-9 h-9 flex items-center justify-center rounded-lg ${item.bg}`}
          >
            <item.icon className={item.color} size={18} />
          </div>

          <div>
            <p className="text-[12px] text-gray-500">{item.label}</p>
            <p className="text-[20px] font-semibold text-gray-800">
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCard;