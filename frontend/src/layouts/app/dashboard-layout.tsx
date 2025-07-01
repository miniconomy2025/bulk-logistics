import { MobileMenu } from "../../components/mobile-menu";
import { SidebarMenu } from "../../components/sidebar-menu";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  return (
    <div className="min-h-screen bg-gray-100 font-inter block lg:flex">
      <MobileMenu />
      <SidebarMenu />
      {children}
    </div>
  );
};
