import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { authStore } from "../../store/authStore";
import { loginWithIdentifier } from "../../services/authService";
import { getDefaultRouteForRole } from "../../utils/navigation";

export const Login = () => {
  const navigate = useNavigate();
  const { user, setAuth } = authStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await loginWithIdentifier(identifier, password);
      if (!result.user) {
        throw new Error("Unable to sign in. User profile was not returned.");
      }
      setAuth(result);
      navigate(getDefaultRouteForRole(result.user.role), { replace: true });
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
    <div data-theme="landing" className="auth-shell">
      <div className="auth-shell-inner">
        <Card className="auth-card auth-showcase">
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <span className="auth-showcase-badge">
                School ERP Platform
              </span>
              <h1 className="auth-showcase-title">
                Professional school operations, delivered in one secure workspace.
              </h1>
              <p className="auth-showcase-copy">
                Manage academics, attendance, fees, staff, and student workflows with a cleaner
                admin-managed ERP experience.
              </p>
            </div>

            <div className="auth-showcase-grid">
              <div className="auth-showcase-stat">
                <p className="auth-showcase-stat-label">Access</p>
                <p className="auth-showcase-stat-title">Private Login</p>
                <p className="auth-showcase-stat-copy">
                  No public signup. Accounts are created by admin only.
                </p>
              </div>
              <div className="auth-showcase-stat">
                <p className="auth-showcase-stat-label">Security</p>
                <p className="auth-showcase-stat-title">Protected</p>
                <p className="auth-showcase-stat-copy">
                  Session-aware sign-in with role-based routing.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="auth-card auth-form-card">
          <div className="auth-mobile-intro">
            <span className="auth-kicker">
              Secure Access
            </span>
            <h1 className="auth-title">INDDIA ERP Login</h1>
            <p className="auth-subtitle">
              Sign in with your assigned account to enter the ERP workspace.
            </p>
          </div>

          <div className="auth-desktop-intro">
            <span className="auth-kicker">
              Secure Access
            </span>
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtitle">
              Use one login form for staff, students, and parents.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="grid gap-5">
              <Input
                label="Email Address or Student ID"
                placeholder="Enter email or Student ID"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                variant="dark"
                labelClassName="text-slate-200"
                className="auth-input"
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
                variant="dark"
                labelClassName="text-slate-200"
                className="auth-input"
                required
              />
            </div>

            <Button type="submit" fullWidth disabled={submitting} className="auth-submit">
              {submitting ? "Signing in..." : "Login"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
