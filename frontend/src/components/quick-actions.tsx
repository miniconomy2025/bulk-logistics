export const QuickActions = () => {
  return (
    <div className="mt-auto pt-6 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
        Quick Actions
      </p>
      <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 mb-2">
        <span className="material-symbols-outlined">add</span>
        New Shipment
      </button>
    </div>
  );
};
