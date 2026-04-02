import { Navigate, Outlet } from "react-router-dom";
import type { AppRole } from "../../config/roles";
import { authStore } from "../../store/authStore";
import { useEffect, useState } from "react";
import { getStaffByUserId } from "../../services/adminService";
import type { StaffWorkspace } from "../../config/staffWorkspaces";
import { normalizeStaffWorkspace } from "../../config/staffWorkspaces";

type RoleProtectedRouteProps = {
  allowedRoles: AppRole[];
  allowedStaffWorkspaces?: StaffWorkspace[];
};

export const RoleProtectedRoute = ({ allowedRoles, allowedStaffWorkspaces }: RoleProtectedRouteProps) => {
  const { role, loading, user } = authStore();
  const [workspaceAllowed, setWorkspaceAllowed] = useState<boolean | null>(allowedStaffWorkspaces ? null : true);

  useEffect(() => {
    let active = true;

    if (!allowedStaffWorkspaces || role !== "staff" || !user?.id) {
      setWorkspaceAllowed(true);
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const staff = await getStaffByUserId(user.id);
        if (active) {
          setWorkspaceAllowed(allowedStaffWorkspaces.includes(normalizeStaffWorkspace(staff?.role)));
        }
      } catch {
        if (active) {
          setWorkspaceAllowed(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [allowedStaffWorkspaces, role, user?.id]);

  if (loading || workspaceAllowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading access...
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard/home" replace />;
  }

  if (role === "staff" && allowedStaffWorkspaces && !workspaceAllowed) {
    return <Navigate to="/dashboard/home" replace />;
  }

  return <Outlet />;
};

export default RoleProtectedRoute;
