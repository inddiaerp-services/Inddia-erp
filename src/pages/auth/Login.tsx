import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { authStore } from "../../store/authStore";
import { loginWithIdentifier } from "../../services/authService";
import { ROLES } from "../../config/roles";

export const Login = () => {
  const navigate = useNavigate();
  const { user, setAuth } = authStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={user.role === ROLES.SUPER_ADMIN ? "/super-admin/dashboard" : "/dashboard/home"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await loginWithIdentifier(identifier, password);
      setAuth(result);
      navigate(result.user.role === ROLES.SUPER_ADMIN ? "/super-admin/dashboard" : "/dashboard/home", { replace: true });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to sign in. Please verify your credentials.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.14),transparent_20%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="hidden border-white/10 bg-white/[0.06] text-white shadow-2xl ring-1 ring-white/10 lg:block">
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <span className="inline-flex rounded-full border border-brand-300/30 bg-brand-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-100">
                School ERP Platform
              </span>
              <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight text-white">
                Professional school operations, delivered in one secure workspace.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                Manage academics, attendance, fees, staff, and student workflows with a cleaner
                admin-managed ERP experience.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Access</p>
                <p className="mt-2 text-lg font-semibold text-white">Private Login</p>
                <p className="mt-2 text-sm text-slate-300">No public signup. Accounts are created by admin only.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Users</p>
                <p className="mt-2 text-lg font-semibold text-white">3 Roles</p>
                <p className="mt-2 text-sm text-slate-300">Staff, students, and parents get tailored access.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Security</p>
                <p className="mt-2 text-lg font-semibold text-white">Protected</p>
                <p className="mt-2 text-sm text-slate-300">Session-aware sign-in with role-based routing.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="w-full border-white/12 bg-white/95 p-5 shadow-2xl ring-1 ring-slate-200/70 sm:p-6 md:p-8">
          <div className="mb-6 lg:hidden">
            <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              Secure Access
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">INDDIA ERP Login</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in with your assigned account to enter the ERP workspace.
            </p>
          </div>

          <div className="hidden lg:block">
            <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              Secure Access
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Use one login form for staff, students, and parents.
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5">
              <Input
                label="Email Address or Student ID"
                placeholder="superadmin@gmail.com or SCHOOL-0001"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                error={error}
                required
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Super Admin, school admins, staff, and parents sign in with email. Students sign in with Student ID. Default super admin login:
              <span className="font-semibold text-slate-800"> superadmin@gmail.com / admin123</span>
            </div>

            <Button type="submit" fullWidth disabled={submitting} className="min-h-12">
              {submitting ? "Signing in..." : "Login"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
