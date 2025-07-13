interface MetricCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
    type?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, bgColor, textColor, type }) => (
    <div className="flex flex-grow items-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className={`rounded-full p-3 ${bgColor} ${textColor} flex items-center justify-center`}>{icon}</div>
        <div className="ml-4">
            <p className="text-sm text-gray-500">{title}</p>
            <div className="mt-1 flex items-baseline">
                <p className="text-xl font-semibold text-gray-900">
                    {title === "Active Shipments" || type === "shipment" ? null : "Ð"} {value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                </p>
            </div>
        </div>
    </div>
);
