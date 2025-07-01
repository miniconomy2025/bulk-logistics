export interface Auth {
    user: User;
}

export interface NavItem {
  title: string;
  href: string;
  icon?: React.JSX.IntrinsicElements.span | null;
  isActive?: boolean;
}
