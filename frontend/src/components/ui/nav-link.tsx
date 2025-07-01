import type { NavItem } from "../../types";

export const NavLink: React.FC<NavItem> = ({ title, icon, href }) => {
  return (
    <a
      href={href}
      className="flex items-center rounded-lg p-3 text-gray-700 hover:bg-gray-50"
    >
      <span className="mr-3">{icon}</span>
      {title}
    </a>
  );
};
