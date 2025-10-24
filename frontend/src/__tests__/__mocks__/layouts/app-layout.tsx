import React from "react";

interface MockDashboardLayoutProps {
    children: React.ReactNode;
}

const MockDashboardLayout: React.FC<MockDashboardLayoutProps> = ({ children }) => {
    return (
        <div data-testid="dashboard-layout">
            <div data-testid="mobile-menu">Mobile Menu</div>
            <div data-testid="sidebar-menu">Sidebar Menu</div>
            {children}
        </div>
    );
};

export { MockDashboardLayout as DashboardLayout };
