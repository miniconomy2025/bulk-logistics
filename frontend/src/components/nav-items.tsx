import { NavLink } from "./ui/nav-link";

export const NavItems = () => {
  return (
    <nav className="flex-grow">
      <ul className="space-y-2">
        <li>
          <NavLink
            text="Dashboard"
            icon={<span className="material-symbols-outlined">dashboard</span>}
          />
        </li>
        <li>
          <NavLink
            text="Shipments"
            icon={
              <span className="material-symbols-outlined">
                delivery_truck_speed
              </span>
            }
          />
        </li>
        <li>
          <NavLink
            text="Clients"
            icon={<span className="material-symbols-outlined">groups</span>}
          />
        </li>
        <li>
          <NavLink
            text="Transactions"
            icon={<span className="material-symbols-outlined">contract</span>}
          />
        </li>
      </ul>
    </nav>
  );
};
