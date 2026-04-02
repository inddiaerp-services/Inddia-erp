import { Navigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { authStore } from "../../store/authStore";
import { logoutUser } from "../../services/authService";

export const SubscriptionExpiredPage = () => {
  const { user, school, logout, loading, role } = authStore();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">Loading subscription...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    role === "super_admin" ||
    school?.subscriptionStatus === "Active" ||
    school?.subscriptionStatus === "Trial"
  ) {
    return <Navigate to={role === "super_admin" ? "/super-admin/dashboard" : "/dashboard/home"} replace />;
  }

  const isSuspended = school?.subscriptionStatus === "Suspended";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-2xl rounded-[2rem] border-white/10 bg-white/[0.06] p-8 text-white shadow-2xl ring-1 ring-white/10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200">
          {isSuspended ? "School Access Suspended" : "Subscription Expired"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          {isSuspended ? "Your school access has been suspended." : "Your school subscription has expired."}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          Access to {school?.name ?? "your school"} is currently blocked. Please contact your administrator or the
          platform owner to {isSuspended ? "restore platform access" : "renew billing and reactivate services"}.
        </p>
        <div className="mt-8 flex gap-4">
          <Button
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            onClick={async () => {
              await logoutUser();
              logout();
            }}
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SubscriptionExpiredPage;
