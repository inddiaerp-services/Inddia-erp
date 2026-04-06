import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

type SidebarItemProps = {
  icon: string;
  label: string;
  path: string;
  description?: string;
  onClick?: () => void;
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
  "aria-hidden": true,
};

const iconMap: Record<string, JSX.Element> = {
  DB: (
    <svg {...iconProps}>
      <path d="M3 13h8V3H3zM13 21h8v-6h-8zM13 10h8V3h-8zM3 21h8v-4H3z" />
    </svg>
  ),
  ST: (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  CL: (
    <svg {...iconProps}>
      <path d="M4 19.5V6.5A2.5 2.5 0 0 1 6.5 4H20" />
      <path d="M8 16.5V3.5A2.5 2.5 0 0 1 10.5 1H20v18h-9.5A2.5 2.5 0 0 1 8 16.5Z" />
    </svg>
  ),
  HD: (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  SF: (
    <svg {...iconProps}>
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" />
      <path d="M3 21a9 9 0 0 1 18 0" />
    </svg>
  ),
  SB: (
    <svg {...iconProps}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  ),
  TT: (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 4v16M16 4v16" />
    </svg>
  ),
  CT: (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 4v16" />
      <path d="m14 14 2 2 4-4" />
    </svg>
  ),
  MT: (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M12 4v16" />
      <path d="M16 15h.01" />
    </svg>
  ),
  AT: (
    <svg {...iconProps}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  EX: (
    <svg {...iconProps}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  RS: (
    <svg {...iconProps}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  HR: (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  ),
  EM: (
    <svg {...iconProps}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  LV: (
    <svg {...iconProps}>
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  ),
  NT: (
    <svg {...iconProps}>
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  ),
  AC: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 9.5c0-1.38 1.57-2.5 3.5-2.5s3.5 1.12 3.5 2.5S13.93 12 12 12s-3.5 1.12-3.5 2.5S10.07 17 12 17s3.5-1.12 3.5-2.5" />
      <path d="M12 6v12" />
    </svg>
  ),
  FE: (
    <svg {...iconProps}>
      <path d="M12 1v22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  SL: (
    <svg {...iconProps}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 14h.01M11 14h2" />
    </svg>
  ),
  TR: (
    <svg {...iconProps}>
      <path d="M10 17h4M6 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l5 5v5a2 2 0 0 1-2 2h-1" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="17.5" r="2.5" />
    </svg>
  ),
  VH: (
    <svg {...iconProps}>
      <rect x="3" y="8" width="18" height="8" rx="2" />
      <path d="M7 16v2M17 16v2M6 8l1.5-3h9L18 8" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </svg>
  ),
  RT: (
    <svg {...iconProps}>
      <path d="M9 18l6-12" />
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
    </svg>
  ),
  AD: (
    <svg {...iconProps}>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18 2v6M21 5h-6" />
      <path d="M8 11h8M8 15h5" />
    </svg>
  ),
  AP: (
    <svg {...iconProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
    </svg>
  ),
  CH: (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="4" />
      <path d="M17 11l2 2 4-4" />
      <path d="M3 20a6 6 0 0 1 12 0" />
    </svg>
  ),
  PF: (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  ),
  SE: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15.4a1.65 1.65 0 0 0-1.51-1H3.4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5 8.89a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9.11 5c.43-.17.71-.59.71-1.05V3.4a2 2 0 1 1 4 0v.09c0 .46.28.88.71 1.05a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19 8.89c.17.43.59.71 1.05.71h.09a2 2 0 1 1 0 4h-.09c-.46 0-.88.28-1.05.71Z" />
    </svg>
  ),
  LG: (
    <svg {...iconProps}>
      <path d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="9" />
      <path d="M8 3.5h8" />
    </svg>
  ),
};

const fallbackIcon = (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4l2 2" />
  </svg>
);

export const SidebarItem = ({
  icon,
  label,
  path,
  description,
  onClick,
}: SidebarItemProps) => (
  <NavLink
    to={path}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        "layout-nav-item group relative flex items-start gap-3 rounded-xl px-4 py-3 transition duration-200",
        isActive && "layout-nav-item-active",
      )
    }
  >
    {({ isActive }) => (
      <>
        <span
          className={cn(
            "layout-nav-indicator absolute bottom-3 left-0 top-3 w-1 rounded-full opacity-0 transition",
            isActive && "opacity-100",
          )}
        />
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-current/5 text-inherit transition",
            !isActive && "opacity-90",
          )}
        >
          {iconMap[icon] ?? fallbackIcon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-inherit">{label}</span>
          {description ? (
            <span className="mt-1 block text-xs leading-5 text-inherit/75">{description}</span>
          ) : null}
        </span>
      </>
    )}
  </NavLink>
);

export default SidebarItem;
