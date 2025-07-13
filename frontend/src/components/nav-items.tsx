import { NavLink } from "./ui/nav-link";

export const NavItems = () => {
    return (
        <nav className="flex-grow">
            <ul className="space-y-2">
                <li>
                    <NavLink
                        href="/"
                        title="Dashboard"
                        icon={<span className="material-symbols-outlined">dashboard</span>}
                    />
                </li>
                <li>
                    <NavLink
                        href="/shipments"
                        title="Shipments"
                        icon={<span className="material-symbols-outlined">local_shipping</span>}
                    />
                </li>
                <li>
                    <NavLink
                        href="/pickup-requests"
                        title="Pickup Requests"
                        icon={<span className="material-symbols-outlined">package_2</span>}
                    />
                </li>
            </ul>
        </nav>
    );
};
