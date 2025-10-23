import React, { useState } from "react";
import { NavItems } from "./nav-items";
import logo from "../assets/logo.svg";

export const MobileMenu: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <>
            <header className="fixed top-0 left-0 z-10 flex w-full items-center justify-between bg-white p-4 shadow-lg lg:hidden">
                <div className="flex items-center">
                    <a href="/">
                        <img
                            src={logo}
                            alt="Mammoth logo"
                            width={160}
                        />
                    </a>
                </div>
                <button
                    className="rounded-md p-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} // Toggle mobile menu
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>
            </header>
            <div
                className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-white p-6 shadow-lg ${
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                } transition-transform duration-500 ease-in-out lg:hidden`}
            >
                <div className="mb-10 flex items-center justify-between">
                    <div className="flex items-center">
                        <a href="/">
                            <img
                                src={logo}
                                alt="Mammoth logo"
                                width={160}
                            />
                        </a>
                    </div>
                    <button
                        className="rounded-md p-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        onClick={() => setIsMobileMenuOpen(false)} // Close mobile menu
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <NavItems />
            </div>
        </>
    );
};
