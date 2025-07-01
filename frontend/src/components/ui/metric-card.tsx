interface MetricCardProps {
    title: string;
    value: string;
    change: string;
    changeType: "increase" | "decrease";
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType, icon, bgColor, textColor }) => (
    <div className="flex flex-grow items-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className={`rounded-full p-3 ${bgColor} ${textColor} flex items-center justify-center`}>{icon}</div>
        <div className="ml-4">
            <p className="text-sm text-gray-500">{title}</p>
            <div className="mt-1 flex items-baseline">
                <p className="text-xl font-semibold text-gray-900">{value}</p>
                <span className={`ml-2 text-xs font-medium ${changeType === "increase" ? "text-green-600" : "text-red-600"}`}>
                    {change} vs last period
                </span>
            </div>
        </div>
    </div>
);
