import { NavLink } from "./ui/nav-link";

export const NavItems = () => {
    return (
        <nav className="flex-grow">
            <ul className="space-y-2">
                <li>
                    <NavLink
                        href="#"
                        title="Dashboard"
                        icon={<span className="material-symbols-outlined">dashboard</span>}
                    />
                </li>
                <li>
                    <NavLink
                        href="#"
                        title="Shipments"
                        icon={<span className="material-symbols-outlined">delivery_truck_speed</span>}
                    />
                </li>
                <li>
                    <NavLink
                        href="#"
                        title="Clients"
                        icon={<span className="material-symbols-outlined">groups</span>}
                    />
                </li>
                <li>
                    <NavLink
                        href="#"
                        title="Transactions"
                        icon={<span className="material-symbols-outlined">contract</span>}
                    />
                </li>
            </ul>
        </nav>
    );
};
