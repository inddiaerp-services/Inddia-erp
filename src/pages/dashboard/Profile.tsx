import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { ROLES } from "../../config/roles";
import {
  getChildrenByParentUserId,
  getStaffByUserId,
  getStudentByUserId,
  listAttendance,
  listFees,
  listNotificationsForUser,
  listResults,
} from "../../services/adminService";
import { authStore } from "../../store/authStore";
import type { StaffRecord, StudentRecord } from "../../types/admin";
import { AdminPageHeader, CompactMetricCard, DetailField, DetailSection } from "./adminPageUtils";
import { getDefaultRouteForRole } from "../../utils/navigation";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  principal: "Principal",
  staff: "Teacher",
  student: "Student",
  parent: "Parent",
};

type ProfileMetrics = {
  attendanceCount: number;
  resultsCount: number;
  feeCount: number;
  unreadNotifications: number;
};

export const ProfilePage = () => {
  const { user, role } = authStore();
  const userId = user?.id;
  const [staffProfile, setStaffProfile] = useState<StaffRecord | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentRecord | null>(null);
  const [linkedChildren, setLinkedChildren] = useState<StudentRecord[]>([]);
  const [metrics, setMetrics] = useState<ProfileMetrics>({
    attendanceCount: 0,
    resultsCount: 0,
    feeCount: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !role) return;

    const run = async () => {
      setLoading(true);
      try {
        if (role === ROLES.STAFF) {
          const [staff, notifications] = await Promise.all([
            getStaffByUserId(userId),
            listNotificationsForUser(userId, role),
          ]);

          setStaffProfile(staff);
          setStudentProfile(null);
          setLinkedChildren([]);
          setMetrics({
            attendanceCount: 0,
            resultsCount: 0,
            feeCount: 0,
            unreadNotifications: notifications.filter((item) => !item.isRead).length,
          });
          return;
        }

        if (role === ROLES.STUDENT) {
          const student = await getStudentByUserId(userId);
          const [attendance, results, fees] = student
            ? await Promise.all([
                listAttendance({ studentId: student.id }),
                listResults(),
                listFees(),
              ])
            : [[], [], []];

          setStudentProfile(student);
          setStaffProfile(null);
          setLinkedChildren([]);
          setMetrics({
            attendanceCount: attendance.length,
            resultsCount: results.filter((item) => item.studentId === student?.id).length,
            feeCount: fees.filter((item) => item.studentId === student?.id).length,
            unreadNotifications: 0,
          });
          return;
        }

        if (role === ROLES.PARENT) {
          const children = await getChildrenByParentUserId(userId);
          const childIds = new Set(children.map((child) => child.id));
          const [attendance, results, fees] = await Promise.all([
            children.length > 0 ? listAttendance() : Promise.resolve([]),
            children.length > 0 ? listResults() : Promise.resolve([]),
            children.length > 0 ? listFees() : Promise.resolve([]),
          ]);

          setLinkedChildren(children);
          setStudentProfile(children[0] ?? null);
          setStaffProfile(null);
          setMetrics({
            attendanceCount: attendance.filter((item) => childIds.has(item.studentId)).length,
            resultsCount: results.filter((item) => childIds.has(item.studentId)).length,
            feeCount: fees.filter((item) => childIds.has(item.studentId)).length,
            unreadNotifications: 0,
          });
          return;
        }

        const notifications = await listNotificationsForUser(userId, role);
        setStaffProfile(null);
        setStudentProfile(null);
        setLinkedChildren([]);
        setMetrics({
          attendanceCount: 0,
          resultsCount: 0,
          feeCount: 0,
          unreadNotifications: notifications.filter((item) => !item.isRead).length,
        });
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [role, userId]);

  const primaryProfileLabel = useMemo(() => {
    if (role === ROLES.STAFF) {
      return staffProfile?.isClassCoordinator
        ? `Coordinator for ${staffProfile.assignedClass ?? "-"} / ${staffProfile.assignedSection ?? "-"}`
        : staffProfile?.subjectName ?? "Teacher account";
    }

    if (role === ROLES.STUDENT) {
      return studentProfile?.className && studentProfile?.section
        ? `${studentProfile.className} / ${studentProfile.section}`
        : "Student account";
    }

    if (role === ROLES.PARENT) {
      return linkedChildren.length > 0 ? `${linkedChildren.length} linked child account(s)` : "Parent account";
    }

    return "Full ERP administration access";
  }, [linkedChildren.length, role, staffProfile, studentProfile]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Profile"
        description="View your ERP identity, connected role information, and linked academic or workspace context."
        action={
          <Link to={role ? `${getDefaultRouteForRole(role).replace(/\/dashboard$/, "").replace(/\/home$/, "")}/settings` : "/dashboard/settings"}>
            <Button variant="outline">Open Settings</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CompactMetricCard
          label="Profile Type"
          value={role ? roleLabels[role] ?? role : "User"}
          detail={primaryProfileLabel}
          icon={
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20a8 8 0 0 1 16 0" />
            </svg>
          }
        />
        <CompactMetricCard
          label="Attendance Records"
          value={loading ? "-" : metrics.attendanceCount}
          detail="Visible attendance records linked to this profile."
          icon={
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M8 2v4M16 2v4M3 10h18" />
              <rect x="3" y="4" width="18" height="18" rx="2" />
            </svg>
          }
        />
        <CompactMetricCard
          label="Results / Fees"
          value={loading ? "-" : `${metrics.resultsCount} / ${metrics.feeCount}`}
          detail="Academic and finance records visible from your account."
          icon={
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M12 20V10M18 20V4M6 20v-6" />
            </svg>
          }
        />
        <CompactMetricCard
          label="Unread Alerts"
          value={loading ? "-" : metrics.unreadNotifications}
          detail="Notifications that still need review."
          icon={
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M9 17a3 3 0 0 0 6 0" />
            </svg>
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DetailSection title="Account Details">
          <DetailField label="Name" value={user?.name ?? "-"} />
          <DetailField label="Email" value={user?.email ?? "-"} />
          <DetailField label="Role" value={user?.role ? roleLabels[user.role] ?? user.role : "-"} />
          <DetailField label="School ID" value={user?.schoolId ?? "-"} />
          <DetailField label="User ID" value={user?.id ?? "-"} />
          <DetailField label="Access Level" value={role === ROLES.ADMIN ? "Full access" : role === ROLES.PRINCIPAL ? "Read-only leadership access with approvals" : "Role-based workspace access"} />
        </DetailSection>

        <DetailSection title="Role Context">
          {role === ROLES.STAFF ? (
            <>
              <DetailField label="Subject" value={staffProfile?.subjectName ?? "Not assigned"} />
              <DetailField label="Workspace Role" value={staffProfile?.role ?? "Teacher"} />
              <DetailField label="Coordinator" value={staffProfile?.isClassCoordinator ? "Yes" : "No"} />
              <DetailField label="Assigned Class" value={staffProfile?.assignedClass ?? "Not assigned"} />
              <DetailField label="Assigned Section" value={staffProfile?.assignedSection ?? "Not assigned"} />
              <DetailField label="Contact Email" value={staffProfile?.email ?? user?.email ?? "-"} />
            </>
          ) : null}

          {role === ROLES.STUDENT ? (
            <>
              <DetailField label="Class" value={studentProfile?.className ?? "Not assigned"} />
              <DetailField label="Section" value={studentProfile?.section ?? "Not assigned"} />
              <DetailField label="Parent Name" value={studentProfile?.parentName ?? "Not linked"} />
              <DetailField label="Parent Email" value={studentProfile?.parentEmail ?? "Not linked"} />
              <DetailField label="Parent Phone" value={studentProfile?.parentPhone ?? "Not linked"} />
              <DetailField label="Linked Profile" value={studentProfile ? "Student record connected" : "No student record found"} />
            </>
          ) : null}

          {role === ROLES.PARENT ? (
            <>
              <DetailField label="Linked Children" value={linkedChildren.length} />
              <DetailField
                label="Children Overview"
                value={
                  linkedChildren.length > 0
                    ? linkedChildren.map((child) => `${child.name} (${child.className ?? "-"}/${child.section ?? "-"})`).join(", ")
                    : "No children linked"
                }
              />
              <DetailField label="Primary Child" value={linkedChildren[0]?.name ?? "No linked child"} />
              <DetailField label="Primary Class" value={linkedChildren[0] ? `${linkedChildren[0].className ?? "-"} / ${linkedChildren[0].section ?? "-"}` : "-"} />
              <DetailField label="Parent Email" value={user?.email ?? "-"} />
              <DetailField label="Family Access" value="Parent dashboard with linked child records" />
            </>
          ) : null}

          {role === ROLES.ADMIN ? (
            <>
              <DetailField label="Administration Scope" value="School-wide ERP management" />
              <DetailField label="Workflow Control" value="Academics, HR, finance, transport, and admissions" />
              <DetailField label="Notification Access" value="Can review and act on system alerts" />
              <DetailField label="Security Model" value="Private access with admin-managed accounts" />
              <DetailField label="Bootstrap Account" value={user?.isBootstrapAdmin ? "Yes" : "No"} />
              <DetailField label="Workspace" value="Central control center" />
            </>
          ) : null}
        </DetailSection>
      </div>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Quick Access</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Useful next steps from your profile</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/settings"><Button variant="outline">Settings</Button></Link>
            <Link to="/dashboard/home"><Button variant="outline">Dashboard Home</Button></Link>
            {role === ROLES.STAFF || role === ROLES.STUDENT || role === ROLES.PARENT ? (
              <Link to="/dashboard/attendance"><Button variant="outline">Attendance</Button></Link>
            ) : null}
            {(role === ROLES.ADMIN || role === ROLES.STAFF) ? (
              <Link to="/dashboard/notifications"><Button variant="outline">Notifications</Button></Link>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
