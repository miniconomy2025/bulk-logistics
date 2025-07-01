import { useState } from "react";
import { QuickActions } from "./quick-actions";
import { NavItems } from "./nav-items";

export const MobileMenu: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 w-full bg-white shadow-lg p-4 flex items-center justify-between z-10">
        <div className="flex items-center">BL</div>
        <button
          className="p-2 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} // Toggle mobile menu
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg p-6 flex flex-col z-40 transform ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-500 ease-in-out lg:hidden`}
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center">BULK LOGISTICS</div>
          <button
            className="p-2 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setIsMobileMenuOpen(false)} // Close mobile menu
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <NavItems />

        <QuickActions />
      </div>
    </>
  );
};
