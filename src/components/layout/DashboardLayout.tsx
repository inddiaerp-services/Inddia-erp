import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import MobileBottomNav from "./MobileBottomNav";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import TeacherTimetableAlerts from "./TeacherTimetableAlerts";

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isSuperAdminArea = location.pathname.startsWith("/super-admin");

  if (isSuperAdminArea) {
    return (
      <div className="superadmin-shell min-h-screen overflow-x-hidden text-slate-900">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 md:ml-[296px]">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="min-h-[calc(100vh-4.5rem)] overflow-y-auto px-2.5 pb-28 pt-3 sm:px-4 md:min-h-[calc(100vh-5rem)] md:px-6 md:py-6 xl:px-8">
            <Outlet />
          </main>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="erp-shell-bg mobile-app-shell min-h-screen overflow-x-hidden text-slate-900">
      <TeacherTimetableAlerts />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-h-screen md:ml-[304px]">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-h-[calc(100vh-5rem)] px-3 pb-28 pt-4 sm:px-4 md:px-6 md:pb-10 md:pt-6 xl:px-8">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;
