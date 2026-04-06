import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ROLES } from "../../config/roles";
import { authStore } from "../../store/authStore";
import MobileBottomNav from "./MobileBottomNav";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import TeacherTimetableAlerts from "./TeacherTimetableAlerts";
import { isDashboardLikePath } from "../../utils/navigation";

const SuperAdminLayout = ({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
}) => (
  <div data-theme="super-admin" className="dashboard-shell overflow-x-hidden">
    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <div className="min-w-0 md:ml-[304px]">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <main className="dashboard-main overflow-y-auto px-3 pb-28 pt-3 sm:px-4 md:px-6 md:pb-10 md:pt-6 xl:px-8">
        <div className="mx-auto max-w-[1680px]">
          <Outlet />
        </div>
      </main>
    </div>
    <MobileBottomNav />
  </div>
);

const SchoolDashboardLayout = ({
  sidebarOpen,
  setSidebarOpen,
  showTeacherAlerts,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  showTeacherAlerts: boolean;
}) => (
  <div data-theme="school" className="dashboard-shell overflow-x-hidden">
    {showTeacherAlerts ? <TeacherTimetableAlerts /> : null}
    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <div className="min-h-screen md:ml-[304px]">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <main className="dashboard-main px-3 pb-28 pt-4 sm:px-4 md:px-6 md:pb-10 md:pt-6 xl:px-8">
        <div className="mx-auto max-w-[1600px]">
          <Outlet />
        </div>
      </main>
    </div>
    <MobileBottomNav />
  </div>
);

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { role } = authStore();
  const isSuperAdminArea = location.pathname.startsWith("/super-admin");
  const isPrincipalArea = location.pathname.startsWith("/principal");

  if (role === ROLES.SUPER_ADMIN || isSuperAdminArea) {
    return <SuperAdminLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />;
  }

  return <SchoolDashboardLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} showTeacherAlerts={!isPrincipalArea && isDashboardLikePath(location.pathname)} />;
};

export default DashboardLayout;
