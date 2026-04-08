import { Play, RotateCcw } from "lucide-react";

type Props = {
  status: string;
  onClick: () => void;
};

const ActionButton = ({ status, onClick }: Props) => {
  const isPending = status === "pending";

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-end gap-2 text-[12px] font-medium transition"
    >
      {isPending ? (
        <>
          <Play className="w-4 h-4 text-emerald-500" />
          <span className="text-emerald-500 hover:text-emerald-600">
            Run Evaluation
          </span>
        </>
      ) : (
        <>
          <RotateCcw className="w-4 h-4 text-blue-500" />
          <span className="text-blue-500 hover:text-blue-600">
            Re-evaluate
          </span>
        </>
      )}
    </button>
  );
};

export default ActionButton;