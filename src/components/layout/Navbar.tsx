import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authStore } from "../../store/authStore";
import { logoutUser } from "../../services/authService";
import { listNotificationsForUser, markNotificationAsRead, syncUpcomingFeeReminders } from "../../services/adminService";
import Button from "../ui/Button";
import { ROLES } from "../../config/roles";
import type { NotificationRecord } from "../../types/admin";
import LanguageSwitcher from "./LanguageSwitcher";

type NavbarProps = {
  onMenuClick?: () => void;
};

const LogoutIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const roleLabels = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.PARENT]: "Parent",
  [ROLES.STAFF]: "Teacher",
  [ROLES.STUDENT]: "Student",
};

export const Navbar = ({ onMenuClick }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, logout, setLoading, school } = authStore();
  const isSuperAdminArea = location.pathname.startsWith("/super-admin");
  const isDashboard = location.pathname.startsWith("/dashboard") || isSuperAdminArea;
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [openNotifications, setOpenNotifications] = useState(false);

  const initials = user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "IU";
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "there";
  const pageTitle = isSuperAdminArea ? "INDDIA ERP Platform Console" : school?.name ?? "INDDIA ERP Control Center";
  const pageSubtitle = isSuperAdminArea ? "Platform command center" : `${user?.role ? roleLabels[user.role] : "User"} workspace`;

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      logout();
      navigate("/login", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    if (!isDashboard || !user?.id || !role || role === ROLES.SUPER_ADMIN || isSuperAdminArea) {
      setUnreadCount(0);
      setNotifications([]);
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        await syncUpcomingFeeReminders(user.id, role);
        const items = await listNotificationsForUser(user.id, role);
        if (active) {
          setNotifications(items.slice(0, 6));
          setUnreadCount(items.filter((item) => !item.isRead).length);
        }
      } catch {
        if (active) {
          setUnreadCount(0);
          setNotifications([]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isDashboard, isSuperAdminArea, location.pathname, role, user?.id]);

  useEffect(() => {
    setOpenNotifications(false);
  }, [location.pathname]);

  const openNotification = async (notification: NotificationRecord) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
      } catch {
        // Keep navigation responsive even if the read-state update fails.
      }
    }

    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
    );
    setUnreadCount((current) => Math.max(current - (notification.isRead ? 0 : 1), 0));
    setOpenNotifications(false);

    navigate(
      notification.relatedFeeId
        ? `/dashboard/fees/${notification.relatedFeeId}`
        : notification.relatedLeaveId
          ? `/dashboard/leave-impact/${notification.relatedLeaveId}?notificationId=${notification.id}`
          : "/dashboard/notifications",
    );
  };

  if (!isDashboard) {
    return (
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link to="/home" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500 text-lg font-bold text-slate-950 shadow-lg shadow-cyan-500/20">
              I
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-200">School OS</p>
              <h1 className="text-lg font-semibold text-white">INDDIA ERP</h1>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#security" className="transition hover:text-white">
              Security
            </a>
            <a href="#launch" className="transition hover:text-white">
              Launch
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher dark />
            {user ? (
              <Link to={user.role === ROLES.SUPER_ADMIN ? "/super-admin/dashboard" : "/dashboard/home"}>
                <Button className="rounded-full px-6">Open Dashboard</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button className="rounded-full px-6">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  if (isSuperAdminArea) {
    return (
      <header className="sticky top-0 z-20 border-b border-transparent bg-transparent text-white">
        <div className="mx-3 mt-3 flex min-h-[5.1rem] items-center justify-between gap-3 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(12,74,110,0.92))] px-4 py-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl md:mx-0 md:mt-0 md:min-h-20 md:rounded-none md:border-b md:border-x-0 md:bg-slate-950 md:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <button type="button" onClick={onMenuClick} className="inline-flex h-11 w-11 items-center justify-center rounded-[1.15rem] border border-white/10 bg-white/10 text-white shadow-sm transition active:scale-[0.98] md:hidden" aria-label="Open sidebar">
              <span className="space-y-1.5">
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
            </button>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Dashboard</p>
              <h1 className="truncate text-lg font-semibold text-white md:text-xl">{pageTitle}</h1>
              <p className="mt-0.5 truncate text-xs text-slate-100">{pageSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher dark />
            <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 sm:flex">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-cyan-400 text-sm font-semibold text-slate-950">{initials}</div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{user?.name ?? "ERP User"}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-100">Platform Owner</p>
              </div>
            </div>
            <Button variant="secondary" onClick={handleLogout} className="inline-flex h-11 gap-2 rounded-[1.15rem] border border-white/10 bg-white/10 px-4 text-white shadow-sm hover:bg-white/15">
              <LogoutIcon />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20">
      <div className="erp-topbar-panel mx-3 flex flex-col gap-4 rounded-[1.75rem] border border-slate-200/80 px-4 py-4 shadow-[0_18px_36px_rgba(15,23,42,0.05)] md:mx-4 md:mt-4 md:flex-row md:items-center md:justify-between md:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onMenuClick} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden" aria-label="Open sidebar">
            <span className="space-y-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-blue-700">Workspace</p>
            <h1 className="truncate text-lg font-semibold text-slate-950 md:text-2xl">{pageTitle}</h1>
            <p className="mt-1 truncate text-sm text-slate-500">
              Welcome back, {firstName}. {pageSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden min-w-[280px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:flex">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-slate-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="text-sm text-slate-400">Search students, classes, fees, or reports</span>
          </div>

          <LanguageSwitcher />

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenNotifications((current) => !current)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              aria-label="Open notifications"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M9 17a3 3 0 0 0 6 0" />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>

            {openNotifications ? (
              <div className="absolute right-0 top-14 z-30 w-[min(92vw,24rem)] rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-2xl">
                <div className="flex items-center justify-between gap-3 px-2 pb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                    <p className="text-xs text-slate-500">{unreadCount} unread</p>
                  </div>
                  <Link to="/dashboard/notifications" className="text-xs font-semibold text-blue-700">
                    View all
                  </Link>
                </div>

                <div className="max-h-[24rem] space-y-2 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">No notifications right now.</div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => void openNotification(notification)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          notification.isRead ? "border-slate-200 bg-white hover:bg-slate-50" : "border-blue-200 bg-blue-50/70 hover:bg-blue-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-slate-900">{notification.message}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                            {notification.module ?? notification.type}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {notification.createdAt ? new Date(notification.createdAt).toLocaleString("en-IN") : "Just now"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-3 py-2 sm:flex">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">{initials}</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{user?.name ?? "ERP User"}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{user?.role ? roleLabels[user.role] : "User"}</p>
            </div>
          </div>

          <Button variant="outline" onClick={handleLogout} className="inline-flex h-11 gap-2 px-4">
            <LogoutIcon />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
