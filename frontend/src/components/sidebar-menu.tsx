import { NavItems } from "./nav-items";
import { QuickActions } from "./quick-actions";
import logo from '../assets/logo.svg'


export const SidebarMenu = () => {
    return (
        <aside className="fixed top-0 left-0 z-20 hidden h-full w-64 flex-col rounded-r-xl bg-white p-6 shadow-lg lg:flex">
            <div className="mt-3 mb-10 flex items-center">
                <a href="/">
                    <img
                        src={logo}
                        alt="Mammoth logo"
                        width={160}
                    />
                </a>
            </div>

            <NavItems />

            <QuickActions />
        </aside>
    );
};
