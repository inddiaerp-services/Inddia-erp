import { NavLink, useLocation } from "react-router-dom";
import { ROLES } from "../../config/roles";
import { authStore } from "../../store/authStore";
import { cn } from "../../lib/utils";

type MobileNavItem = {
  label: string;
  path: string;
  icon: JSX.Element;
};

const iconClassName = "h-5 w-5";

const homeIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
);

const chartIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
    <path d="M4 19h16" />
    <path d="M7 15V9" />
    <path d="M12 19V5" />
    <path d="M17 19v-8" />
  </svg>
);

const calendarIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M8 2v4M16 2v4M3 10h18" />
  </svg>
);

const bellIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
    <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
    <path d="M9 17a3 3 0 0 0 6 0" />
  </svg>
);

const userIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20a8 8 0 0 1 16 0" />
  </svg>
);

const stackIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 16 9 5 9-5" />
  </svg>
);

const currencyIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
    <path d="M12 2v20" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const getItemsForRole = (role: string | null): MobileNavItem[] => {
  if (role === ROLES.SUPER_ADMIN) {
    return [
      { label: "Home", path: "/super-admin/dashboard", icon: homeIcon },
      { label: "Schools", path: "/super-admin/schools", icon: stackIcon },
      { label: "Billing", path: "/super-admin/billing", icon: currencyIcon },
      { label: "Storage", path: "/super-admin/storage", icon: chartIcon },
      { label: "Audit", path: "/super-admin/audit-logs", icon: userIcon },
    ];
  }

  if (role === ROLES.ADMIN) {
    return [
      { label: "Home", path: "/dashboard/home", icon: homeIcon },
      { label: "Analytics", path: "/dashboard/analytics", icon: chartIcon },
      { label: "Timetable", path: "/dashboard/timetable", icon: calendarIcon },
      { label: "Alerts", path: "/dashboard/notifications", icon: bellIcon },
      { label: "Profile", path: "/dashboard/profile", icon: userIcon },
    ];
  }

  if (role === ROLES.STAFF) {
    return [
      { label: "Home", path: "/dashboard/home", icon: homeIcon },
      { label: "Attendance", path: "/dashboard/attendance", icon: chartIcon },
      { label: "Timetable", path: "/dashboard/timetable/my", icon: calendarIcon },
      { label: "Alerts", path: "/dashboard/notifications", icon: bellIcon },
      { label: "Profile", path: "/dashboard/profile", icon: userIcon },
    ];
  }

  if (role === ROLES.PARENT) {
    return [
      { label: "Home", path: "/dashboard/home", icon: homeIcon },
      { label: "Attendance", path: "/dashboard/attendance", icon: chartIcon },
      { label: "Timetable", path: "/dashboard/timetable", icon: calendarIcon },
      { label: "Alerts", path: "/dashboard/notifications", icon: bellIcon },
      { label: "Profile", path: "/dashboard/profile", icon: userIcon },
    ];
  }

  return [
    { label: "Home", path: "/dashboard/home", icon: homeIcon },
    { label: "Attendance", path: "/dashboard/attendance", icon: chartIcon },
    { label: "Timetable", path: "/dashboard/timetable", icon: calendarIcon },
    { label: "Results", path: "/dashboard/results", icon: bellIcon },
    { label: "Profile", path: "/dashboard/profile", icon: userIcon },
  ];
};

export const MobileBottomNav = () => {
  const { role } = authStore();
  const location = useLocation();
  const items = getItemsForRole(role);

  if (!location.pathname.startsWith("/dashboard") && !location.pathname.startsWith("/super-admin")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 md:hidden">
      <div className="mobile-glass-panel mx-auto grid max-w-xl grid-cols-5 rounded-[1.6rem] border border-slate-200/80 px-2 py-2 shadow-[0_22px_50px_rgba(15,23,42,0.12)]">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-[1.2rem] px-1 text-[11px] font-semibold transition active:scale-[0.98]",
                isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900",
              )
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
