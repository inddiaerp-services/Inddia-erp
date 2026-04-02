import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authStore } from "../../store/authStore";
import { ROLES } from "../../config/roles";

export const ProtectedRoute = () => {
  const { user, loading, role, school } = authStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading dashboard...
      </div>
    );
  }

  if (user === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (
    role !== ROLES.SUPER_ADMIN &&
    (school?.subscriptionStatus === "Expired" || school?.subscriptionStatus === "Suspended") &&
    location.pathname !== "/subscription-expired"
  ) {
    return <Navigate to="/subscription-expired" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
