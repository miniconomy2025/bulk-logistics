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
            </ul>
        </nav>
    );
};
