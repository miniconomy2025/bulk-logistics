interface NavLinkProps {
  text: string;
  icon?: React.ReactNode;
}

export const NavLink: React.FC<NavLinkProps> = ({ text, icon }) => {
  return (
    <a
      href="#"
      className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-gray-50"
    >
      <span className="mr-3">{icon}</span>
      {text}
    </a>
  );
};
