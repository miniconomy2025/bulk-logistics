interface TransactionItemProps {
  label: string;
  percentage: string;
  colorClass: string;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  label,
  percentage,
  colorClass,
}) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center">
      <span className={`w-2 h-2 rounded-full ${colorClass} mr-2`}></span>
      <p className="text-sm text-gray-700">{label}</p>
    </div>
    <p className="text-sm font-medium text-gray-900">{percentage}</p>
  </div>
);
