type ActionItem = {
  label: string;
  to?: string;
  onClick?: () => void;
};

type SuperAdminMobileActionBarProps = {
  actions: ActionItem[];
};

export const SuperAdminMobileActionBar = ({ actions }: SuperAdminMobileActionBarProps) => {
  void actions;
  return null;
};

export default SuperAdminMobileActionBar;
