import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import { ROLES } from "../../config/roles";
import { normalizeStaffWorkspace, STAFF_WORKSPACES } from "../../config/staffWorkspaces";
import { authStore } from "../../store/authStore";
import { changeCurrentUserPassword } from "../../services/authService";
import { getStaffByUserId } from "../../services/adminService";
import {
  loadTeacherTimetableAlertSettings,
  requestBrowserNotificationPermission,
  saveTeacherTimetableAlertSettings,
  type TeacherTimetableAlertSettings,
} from "../../utils/teacherTimetableAlerts";
import { AdminPageHeader, DetailField, DetailSection } from "./adminPageUtils";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  staff: "Teacher",
  student: "Student",
  parent: "Parent",
};

const formatSessionExpiry = (timestamp?: number) => {
  if (!timestamp) return "Not available";
  return new Date(timestamp * 1000).toLocaleString();
};

export const SettingsPage = () => {
  const { session, user, role } = authStore();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dashboardTips, setDashboardTips] = useState(true);
  const [compactCards, setCompactCards] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [isTeacherWorkspace, setIsTeacherWorkspace] = useState(false);
  const [teacherAlertSettings, setTeacherAlertSettings] = useState<TeacherTimetableAlertSettings>(
    loadTeacherTimetableAlertSettings(user?.id),
  );
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  const sessionStatus = session ? "Active" : "No active session";
  const roleLabel = role ? roleLabels[role] ?? role : "User";
  const securityLevel = useMemo(() => {
    if (role === ROLES.ADMIN) return "High access";
    if (role === ROLES.STAFF) return "Managed staff access";
    if (role === ROLES.STUDENT || role === ROLES.PARENT) return "Limited academic access";
    return "Standard access";
  }, [role]);

  useEffect(() => {
    setTeacherAlertSettings(loadTeacherTimetableAlertSettings(user?.id));
    setNotificationPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    const loadWorkspace = async () => {
      if (role !== ROLES.STAFF || !user?.id) {
        setIsTeacherWorkspace(false);
        return;
      }

      try {
        const staff = await getStaffByUserId(user.id);
        if (active) {
          setIsTeacherWorkspace(normalizeStaffWorkspace(staff?.role) === STAFF_WORKSPACES.TEACHER);
        }
      } catch {
        if (active) {
          setIsTeacherWorkspace(false);
        }
      }
    };

    void loadWorkspace();

    return () => {
      active = false;
    };
  }, [role, user?.id]);

  const updateTeacherAlertSettings = async (patch: Partial<TeacherTimetableAlertSettings>) => {
    if (!user?.id) return;

    const nextSettings = { ...teacherAlertSettings, ...patch };

    if (patch.enabled) {
      const permission = await requestBrowserNotificationPermission();
      setNotificationPermission(permission);
    }

    setTeacherAlertSettings(nextSettings);
    saveTeacherTimetableAlertSettings(user.id, nextSettings);
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password must match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("Choose a different new password.");
      return;
    }

    setPasswordSubmitting(true);

    try {
      await changeCurrentUserPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated successfully.");
    } catch (submissionError) {
      setPasswordError(
        submissionError instanceof Error ? submissionError.message : "Failed to change password.",
      );
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        description="Review your session, access model, interface preferences, and ERP usage guidance."
        action={
          <Link to="/dashboard/profile">
            <Button variant="outline">Open Profile</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Session</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{sessionStatus}</p>
          <p className="mt-2 text-sm text-slate-500">Current authentication state in this browser.</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Role Access</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{roleLabel}</p>
          <p className="mt-2 text-sm text-slate-500">{securityLevel}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Email Alerts</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{emailAlerts ? "Enabled" : "Disabled"}</p>
          <p className="mt-2 text-sm text-slate-500">Local preference for your workspace reminders.</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">UI Density</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{compactCards ? "Compact" : "Comfortable"}</p>
          <p className="mt-2 text-sm text-slate-500">Controls how roomy the dashboard feels for you.</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <DetailSection title="Session & Access">
          <DetailField label="Logged In As" value={user?.name ?? "-"} />
          <DetailField label="Email" value={user?.email ?? "-"} />
          <DetailField label="Role" value={roleLabel} />
          <DetailField label="Session Status" value={sessionStatus} />
          <DetailField label="Session Expires" value={formatSessionExpiry(session?.expires_at)} />
          <DetailField label="Access Model" value="Protected route access with role-based visibility" />
        </DetailSection>

        <DetailSection title="Security Guidance">
          <DetailField label="Password" value="Managed through your assigned login credentials" />
          <DetailField label="Account Provisioning" value="Accounts are created and managed by admin only" />
          <DetailField label="Session Restore" value="Your ERP session is restored automatically when available" />
          <DetailField label="Recommended Practice" value="Use a private device and sign out after shared usage" />
          <DetailField label="Sensitive Workflows" value={role === ROLES.ADMIN ? "Includes full system administration" : "Restricted by role permissions"} />
          <DetailField label="Support Path" value="Contact ERP administrator for account changes or access issues" />
        </DetailSection>
      </div>

      <Card>
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Workspace Preferences</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Personalize your dashboard experience</h2>
            <p className="mt-2 text-sm text-slate-500">
              These controls are lightweight UI preferences for this browser session and help make the workspace feel more comfortable.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setEmailAlerts((current) => !current)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
            >
              <p className="text-sm font-semibold text-slate-900">Email alerts</p>
              <p className="mt-2 text-sm text-slate-500">{emailAlerts ? "Receive reminder-style alert preference" : "Muted for now"}</p>
            </button>
            <button
              type="button"
              onClick={() => setDashboardTips((current) => !current)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
            >
              <p className="text-sm font-semibold text-slate-900">Dashboard tips</p>
              <p className="mt-2 text-sm text-slate-500">{dashboardTips ? "Helpful ERP guidance visible" : "Cleaner dashboard view"}</p>
            </button>
            <button
              type="button"
              onClick={() => setCompactCards((current) => !current)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
            >
              <p className="text-sm font-semibold text-slate-900">Card density</p>
              <p className="mt-2 text-sm text-slate-500">{compactCards ? "Compact layout preferred" : "Comfortable spacing preferred"}</p>
            </button>
          </div>
        </div>
      </Card>

      {isTeacherWorkspace ? (
        <Card>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Teacher Alerts</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Real-time timetable reminders</h2>
              <p className="mt-2 text-sm text-slate-500">
                These alerts run only for teachers while the app is open and check your timetable every minute.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => void updateTeacherAlertSettings({ enabled: !teacherAlertSettings.enabled })}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
              >
                <p className="text-sm font-semibold text-slate-900">Enable alerts</p>
                <p className="mt-2 text-sm text-slate-500">
                  {teacherAlertSettings.enabled ? "Teacher timetable alerts are active." : "Alerts are currently turned off."}
                </p>
              </button>
              <button
                type="button"
                onClick={() => void updateTeacherAlertSettings({ soundEnabled: !teacherAlertSettings.soundEnabled })}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
              >
                <p className="text-sm font-semibold text-slate-900">Alarm sound</p>
                <p className="mt-2 text-sm text-slate-500">
                  {teacherAlertSettings.soundEnabled ? "Play an alarm sound with each alert." : "Notifications stay silent."}
                </p>
              </button>
              <button
                type="button"
                onClick={() => void updateTeacherAlertSettings({ preAlertEnabled: !teacherAlertSettings.preAlertEnabled })}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
              >
                <p className="text-sm font-semibold text-slate-900">5-minute pre-alert</p>
                <p className="mt-2 text-sm text-slate-500">
                  {teacherAlertSettings.preAlertEnabled ? "Warn me 5 minutes before class ends." : "Only alert when class ends."}
                </p>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Notification permission: <span className="font-semibold text-slate-900">{notificationPermission}</span>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Security</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Change Password</h2>
            <p className="mt-2 text-sm text-slate-500">
              Update your login password here for any dashboard account.
            </p>
          </div>

          <form className="grid gap-4 md:grid-cols-3" onSubmit={handlePasswordSubmit}>
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={passwordError}
              required
            />
            <div className="md:col-span-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                {passwordSuccess ? <span className="text-emerald-600">{passwordSuccess}</span> : "Password updates are saved to your live auth account."}
              </div>
              <Button type="submit" disabled={passwordSubmitting}>
                {passwordSubmitting ? "Updating..." : "Change Password"}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Quick Links</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Move to the next thing quickly</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/home"><Button variant="outline">Dashboard Home</Button></Link>
            <Link to="/dashboard/profile"><Button variant="outline">Profile</Button></Link>
            {(role === ROLES.ADMIN || role === ROLES.STAFF) ? (
              <Link to="/dashboard/notifications"><Button variant="outline">Notifications</Button></Link>
            ) : null}
            {(role === ROLES.STUDENT || role === ROLES.PARENT || role === ROLES.STAFF) ? (
              <Link to="/dashboard/attendance"><Button variant="outline">Attendance</Button></Link>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
