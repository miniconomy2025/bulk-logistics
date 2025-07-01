import { NavItems } from "./nav-items";
import { QuickActions } from "./quick-actions";

export const SidebarMenu = () => {
  return (
    <aside className="w-64 bg-white shadow-lg p-6 flex-col rounded-r-xl fixed h-full top-0 left-0 hidden lg:flex z-20">
      <div className="flex items-center mb-10">BULK LOGISTICS</div>

      <NavItems />

      <QuickActions />
    </aside>
  );
};
