import { MobileMenu } from "../components/mobile-menu";
import { SidebarMenu } from "../components/sidebar-menu";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    return (
        <div className="font-inter block min-h-screen bg-gray-100 lg:flex">
            <MobileMenu />
            <SidebarMenu />
            {children}
        </div>
    );
};
