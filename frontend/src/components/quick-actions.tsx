export const QuickActions = () => {
    return (
        <div className="mt-auto border-t border-gray-200 pt-6">
            <p className="mb-3 text-xs font-semibold text-gray-500 uppercase">Quick Actions</p>
            <button className="mb-2 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700">
                <span className="material-symbols-outlined">add</span>
                New Shipment
            </button>
        </div>
    );
};
