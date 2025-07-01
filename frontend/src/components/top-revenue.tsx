interface TopRevenueSourceProps {
    name: string;
    description: string;
    amount: string;
    status: string;
}

export const TopRevenueSource: React.FC<TopRevenueSourceProps> = ({ name, description, amount, status }) => (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0">
        <div>
            <p className="text-sm font-medium text-gray-900">{name}</p>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{amount}</p>
            <span className="text-xs text-gray-500">{status}</span>
        </div>
    </div>
);
