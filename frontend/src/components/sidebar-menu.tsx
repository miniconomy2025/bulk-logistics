import { NavItems } from "./nav-items";
import { QuickActions } from "./quick-actions";

export const SidebarMenu = () => {
    return (
        <aside className="fixed top-0 left-0 z-20 hidden h-full w-64 flex-col rounded-r-xl bg-white p-6 shadow-lg lg:flex">
            <div className="mb-10 flex items-center">BULK LOGISTICS</div>

            <NavItems />

            <QuickActions />
        </aside>
    );
};
