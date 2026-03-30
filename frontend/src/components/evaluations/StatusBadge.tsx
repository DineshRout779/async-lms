type Props = {
  status: string;
};

const StatusBadge = ({ status }: Props) => {
  const isPending = status === "pending";

  return (
    <span
      className={`px-3 py-2 text-xs rounded-full font-medium ${
        isPending
          ? "bg-yellow-100 text-yellow-700"
          : "bg-green-100 text-green-700"
      }`}
    >
      {isPending ? "Pending" : "Evaluated"}
    </span>
  );
};

export default StatusBadge;