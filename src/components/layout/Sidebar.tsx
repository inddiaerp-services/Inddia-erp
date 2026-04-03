import { useEffect, useMemo, useState } from "react";
import { sidebarItems, type SidebarItem as SidebarConfigItem } from "../../config/sidebar";
import { ROLES } from "../../config/roles";
import { getWorkspaceLabel, normalizeStaffWorkspace, STAFF_WORKSPACES, type StaffWorkspace } from "../../config/staffWorkspaces";
import { getStaffByUserId } from "../../services/adminService";
import { authStore } from "../../store/authStore";
import SidebarItem from "./SidebarItem";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

const roleLabels = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "School Admin",
  [ROLES.PARENT]: "Parent",
  [ROLES.STAFF]: "Teacher",
  [ROLES.STUDENT]: "Student",
};

const sectionDefinitions = [
  {
    title: "Overview",
    match: (path: string) => ["/dashboard/home", "/dashboard/analytics", "/dashboard/hr", "/dashboard/accounts", "/dashboard/transport", "/dashboard/admission"].includes(path),
  },
  {
    title: "Academic",
    match: (path: string) =>
      ["/dashboard/students", "/dashboard/staff", "/dashboard/classes", "/dashboard/subjects", "/dashboard/timetable", "/dashboard/timetable/coordinator", "/dashboard/timetable/my", "/dashboard/attendance", "/dashboard/exams", "/dashboard/results", "/dashboard/holidays"].includes(path),
  },
  {
    title: "Operations",
    match: (path: string) =>
      ["/dashboard/applicants", "/dashboard/employees", "/dashboard/staff-attendance", "/dashboard/leaves", "/dashboard/fees", "/dashboard/salary", "/dashboard/vehicles", "/dashboard/routes", "/dashboard/notifications"].includes(path),
  },
  {
    title: "Administration",
    match: (path: string) =>
      ["/dashboard/subscription", "/dashboard/platform-payments", "/dashboard/billing-history", "/dashboard/invoices", "/dashboard/renewal-reminders", "/dashboard/plan-upgrade", "/dashboard/usage", "/dashboard/school-billing-profile", "/dashboard/child", "/dashboard/profile", "/dashboard/audit-logs", "/dashboard/settings"].includes(path),
  },
];

const groupItems = (items: SidebarConfigItem[]) => {
  const used = new Set<string>();

  const grouped = sectionDefinitions
    .map((section) => ({
      title: section.title,
      items: items.filter((item) => {
        const match = section.match(item.path);
        if (match) used.add(item.path);
        return match;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const uncategorized = items.filter((item) => !used.has(item.path));
  if (uncategorized.length > 0) {
    grouped.push({ title: "More", items: uncategorized });
  }

  return grouped;
};

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { role, user, school } = authStore();
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [staffWorkspace, setStaffWorkspace] = useState<StaffWorkspace>(STAFF_WORKSPACES.TEACHER);

  useEffect(() => {
    let active = true;

    if (role !== ROLES.STAFF || !user?.id) {
      setIsCoordinator(false);
      setStaffWorkspace(STAFF_WORKSPACES.TEACHER);
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const staff = await getStaffByUserId(user.id);
        if (active) {
          setIsCoordinator(Boolean(staff?.isClassCoordinator));
          setStaffWorkspace(normalizeStaffWorkspace(staff?.role));
        }
      } catch {
        if (active) {
          setIsCoordinator(false);
          setStaffWorkspace(STAFF_WORKSPACES.TEACHER);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [role, user?.id]);

  const items = useMemo(() => {
    if (role === ROLES.SUPER_ADMIN) {
      return [
        { icon: "DB", label: "Dashboard", path: "/super-admin/dashboard", description: "Platform-level SaaS metrics and revenue visibility.", roles: [ROLES.SUPER_ADMIN] },
        { icon: "ST", label: "Schools", path: "/super-admin/schools", description: "Create and manage tenant schools.", roles: [ROLES.SUPER_ADMIN] },
        { icon: "AC", label: "Billing", path: "/super-admin/billing", description: "Manage subscriptions and renewals.", roles: [ROLES.SUPER_ADMIN] },
        { icon: "FE", label: "Payments", path: "/super-admin/payments", description: "Review all platform payments.", roles: [ROLES.SUPER_ADMIN] },
        { icon: "DR", label: "Storage", path: "/super-admin/storage", description: "Track school storage usage and limits.", roles: [ROLES.SUPER_ADMIN] },
        { icon: "LG", label: "Audit Logs", path: "/super-admin/audit-logs", description: "Review super admin action history.", roles: [ROLES.SUPER_ADMIN] },
      ];
    }

    const filtered = sidebarItems.filter((item) => (role ? item.roles.includes(role) : false));

    if (role !== ROLES.STAFF) {
      return filtered;
    }

    if (staffWorkspace === STAFF_WORKSPACES.HR) {
      return [
        { icon: "AN", label: "Analytics", path: "/dashboard/analytics", description: "Monitor workforce and school operations.", roles: [ROLES.STAFF] },
        { icon: "HR", label: "HR Dashboard", path: "/dashboard/hr", description: "Employee, leave, and people operations.", roles: [ROLES.STAFF] },
        { icon: "EM", label: "Employees", path: "/dashboard/employees", description: "Manage staff and employee records.", roles: [ROLES.STAFF] },
        { icon: "SA", label: "Staff Attendance", path: "/dashboard/staff-attendance", description: "Mark daily attendance and review monthly staff records.", roles: [ROLES.STAFF] },
        { icon: "LV", label: "Leaves", path: "/dashboard/leaves", description: "Approve and track leave requests.", roles: [ROLES.STAFF] },
      ];
    }

    if (staffWorkspace === STAFF_WORKSPACES.ACCOUNTS) {
      return [
        { icon: "AN", label: "Analytics", path: "/dashboard/analytics", description: "Track collections and finance trends.", roles: [ROLES.STAFF] },
        { icon: "AC", label: "Accounts Dashboard", path: "/dashboard/accounts", description: "Fee and salary operations workspace.", roles: [ROLES.STAFF] },
        { icon: "FE", label: "Fees", path: "/dashboard/fees", description: "Review and record fee payments.", roles: [ROLES.STAFF] },
        { icon: "SL", label: "Salary", path: "/dashboard/salary", description: "Manage salary disbursement records.", roles: [ROLES.STAFF] },
        { icon: "NT", label: "Notifications", path: "/dashboard/notifications", description: "Fee reminders and workflow notifications.", roles: [ROLES.STAFF] },
      ];
    }

    if (staffWorkspace === STAFF_WORKSPACES.TRANSPORT) {
      return [
        { icon: "AN", label: "Analytics", path: "/dashboard/analytics", description: "Monitor fleet and route operations.", roles: [ROLES.STAFF] },
        { icon: "TR", label: "Transport Dashboard", path: "/dashboard/transport", description: "Vehicle and route operations workspace.", roles: [ROLES.STAFF] },
        { icon: "VH", label: "Vehicles", path: "/dashboard/vehicles", description: "Manage the school vehicle fleet.", roles: [ROLES.STAFF] },
        { icon: "RT", label: "Routes", path: "/dashboard/routes", description: "Manage routes and stop assignments.", roles: [ROLES.STAFF] },
      ];
    }

    if (staffWorkspace === STAFF_WORKSPACES.ADMISSION) {
      return [
        { icon: "AN", label: "Analytics", path: "/dashboard/analytics", description: "Monitor admission funnel and school operations.", roles: [ROLES.STAFF] },
        { icon: "AD", label: "Admission Dashboard", path: "/dashboard/admission", description: "Admission pipeline and applicant approvals.", roles: [ROLES.STAFF] },
        { icon: "AP", label: "Applicants", path: "/dashboard/applicants", description: "Review, approve, and reject applicants.", roles: [ROLES.STAFF] },
        { icon: "ST", label: "Students", path: "/dashboard/students", description: "Create student records after admission approval.", roles: [ROLES.STAFF] },
      ];
    }

    const withoutTimetable = filtered.filter((item) => item.path !== "/dashboard/timetable");
    const timetableItems: SidebarConfigItem[] = isCoordinator
      ? [
          { icon: "CT", label: "Coordinator Timetable", path: "/dashboard/timetable/coordinator", description: "Manage your assigned class timetable.", roles: [ROLES.STAFF] },
          { icon: "MT", label: "My Teaching Timetable", path: "/dashboard/timetable/my", description: "View the periods assigned to you.", roles: [ROLES.STAFF] },
        ]
      : [
          { icon: "TT", label: "Timetable", path: "/dashboard/timetable/my", description: "View your teaching timetable.", roles: [ROLES.STAFF] },
        ];

    return [
      ...withoutTimetable.filter((item) => item.path !== "/dashboard/notifications"),
      { icon: "NT", label: "Notifications", path: "/dashboard/notifications", description: "Review leave and workflow alerts.", roles: [ROLES.STAFF] },
      { icon: "LV", label: "Leaves", path: "/dashboard/leaves", description: "Request leave and track approval stages.", roles: [ROLES.STAFF] },
      ...timetableItems,
    ];
  }, [isCoordinator, role, staffWorkspace]);

  const groupedItems = useMemo(() => groupItems(items), [items]);
  const roleLabel = role === ROLES.STAFF ? getWorkspaceLabel(staffWorkspace) : role ? roleLabels[role] : "User";
  const isSuperAdminArea = role === ROLES.SUPER_ADMIN;

  if (isSuperAdminArea) {
    return (
      <>
        <div
          className={`fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm transition md:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={onClose}
        />
        <aside
          className={`fixed bottom-3 left-3 top-3 z-40 flex w-[calc(100vw-1.5rem)] max-w-[320px] flex-col rounded-[2rem] border shadow-xl backdrop-blur transition-transform duration-300 md:bottom-0 md:left-0 md:top-0 md:h-screen md:w-[296px] md:max-w-none md:rounded-none md:border-r md:translate-x-0 ${
            "border-white/10 bg-[linear-gradient(180deg,#020617_0%,#0f172a_58%,#0b2942_100%)] text-white shadow-2xl"
          } ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div
            className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-4 py-5 sm:px-5 sm:py-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 to-cyan-400 text-lg font-bold text-slate-950 shadow-lg shadow-sky-500/25">I</div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.28em] text-sky-200">INDDIA ERP</p>
                <h2 className="truncate text-lg font-semibold text-white">{roleLabel} Workspace</h2>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-200">Signed in as</p>
              <p className="mt-2 truncate text-sm font-semibold text-white">{user?.name ?? "ERP User"}</p>
              <p className="mt-2 text-xs leading-5 text-slate-100">
                Control tenant growth, billing, storage, and platform governance from one executive workspace.
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
            <div className="space-y-2">
              {items.map((item) => (
                <SidebarItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  description={item.description}
                  onClick={onClose}
                  variant="superadmin"
                />
              ))}
            </div>
          </div>
        </aside>
      </>
    );
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm transition md:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`erp-sidebar-panel fixed bottom-3 left-3 top-3 z-40 flex w-[calc(100vw-1.5rem)] max-w-[324px] flex-col rounded-[2rem] border border-slate-200/80 text-slate-900 transition-transform duration-300 md:bottom-4 md:left-4 md:top-4 md:h-[calc(100vh-2rem)] md:w-[288px] md:max-w-none md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="border-b border-slate-200/80 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]">I</div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-700">School OS</p>
              <h2 className="truncate text-lg font-semibold text-slate-950">{school?.name ?? "INDDIA ERP"}</h2>
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{roleLabel}</p>
            <p className="mt-1 text-sm text-slate-500">{user?.name ?? "ERP User"}</p>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {groupedItems.map((section) => (
            <div key={section.title}>
              <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {section.title}
              </p>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} description={item.description} onClick={onClose} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
