import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "../../components/ui/Card";
import { authStore } from "../../store/authStore";
import {
  getChildrenByParentUserId,
  getDashboardOverview,
  isFirebaseOnlyMode,
  listClasses,
  listStaff,
  listStudents,
  getStaffByUserId,
  getStudentByUserId,
  listAttendance,
  listApplicants,
  listFees,
  listResults,
  listSalary,
  listTimetableSlots,
  listTransportRoutes,
  listVehicles,
  getStudentsCount,
  getStaffCount,
  getClassesCount,
} from "../../services/adminService";
import { ROLES } from "../../config/roles";
import { normalizeStaffWorkspace, STAFF_WORKSPACES } from "../../config/staffWorkspaces";
import { getIndiaTodayIso } from "../../utils/date";
import { AdminPageHeader } from "./adminPageUtils";

type AdminOverview = Awaited<ReturnType<typeof getDashboardOverview>>;
type RoleStat = { label: string; value: string; detail: string; path: string };
type RoleActivity = { module: string; owner: string; status: string; time: string };

const chartColors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];

const parseMetric = (value: string) => {
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const upcomingEventsForRole = (role: string | null) => {
  if (role === ROLES.ADMIN) {
    return [
      { title: "Fee review window", time: "Today, 03:30 PM", detail: "Finance records due for reconciliation." },
      { title: "Attendance audit", time: "Tomorrow, 09:00 AM", detail: "Check pending classes and unresolved marks." },
      { title: "Leadership sync", time: "Friday, 11:00 AM", detail: "Weekly admin operations review." },
    ];
  }
  if (role === ROLES.STAFF) {
    return [
      { title: "Classroom prep", time: "Today, 08:30 AM", detail: "Confirm timetable and classroom coverage." },
      { title: "Attendance checkpoint", time: "Today, 12:15 PM", detail: "Submit remaining attendance sessions." },
      { title: "Parent communication", time: "Tomorrow, 04:00 PM", detail: "Send updates for pending notices." },
    ];
  }
  if (role === ROLES.PARENT) {
    return [
      { title: "Fee reminder", time: "Today, 06:00 PM", detail: "Review your child’s current payment status." },
      { title: "Class update", time: "Tomorrow, 09:00 AM", detail: "Check timetable and attendance notes." },
      { title: "Progress review", time: "Saturday, 10:30 AM", detail: "See the latest exam and results summary." },
    ];
  }
  return [
    { title: "Daily classes", time: "Today, 08:45 AM", detail: "Check today’s timetable and room plan." },
    { title: "Results update", time: "Tomorrow, 11:00 AM", detail: "Review new marks and performance trends." },
    { title: "Attendance check", time: "Friday, 04:30 PM", detail: "Track your attendance performance." },
  ];
};

const StatCard = ({ stat, index, onOpen }: { stat: RoleStat; index: number; onOpen: () => void }) => (
  <button type="button" onClick={onOpen} className="metric-card text-left">
    <div className="flex h-full items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{stat.label}</p>
        <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{stat.detail}</p>
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {index % 4 === 0 ? "A" : index % 4 === 1 ? "B" : index % 4 === 2 ? "C" : "D"}
      </div>
    </div>
  </button>
);

const SectionShell = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <Card className="border-slate-200/80 bg-white p-0">
    <div className="border-b border-slate-200/80 px-6 py-5">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
    <div className="p-6">{children}</div>
  </Card>
);

export const DashboardHome = () => {
  const navigate = useNavigate();
  const { user, role } = authStore();
  const [stats, setStats] = useState<RoleStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<RoleActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !role) return;

    const loadOverview = async () => {
      setLoading(true);
      try {
        if (role === ROLES.ADMIN) {
          const overview: AdminOverview = await getDashboardOverview();
          setStats(overview.stats);
          setRecentActivity(overview.recentActivity);
        } else if (role === ROLES.STAFF) {
          const staff = await getStaffByUserId(user.id);
          if (!staff) throw new Error("Staff profile not found.");
          const workspace = normalizeStaffWorkspace(staff.role);

          if (isFirebaseOnlyMode) {
            const [studentsCount, staffCount, classesCount] = await Promise.all([getStudentsCount(), getStaffCount(), getClassesCount()]);
            setStats([
              { label: "Workspace", value: workspace === STAFF_WORKSPACES.TEACHER ? "Teacher" : workspace, detail: "Firebase workspace mode", path: "/dashboard/profile" },
              { label: "Students", value: String(studentsCount), detail: "Students available in this school", path: "/dashboard/students" },
              { label: "Staff", value: String(staffCount), detail: "Team members available in this school", path: "/dashboard/staff" },
              { label: "Classes", value: String(classesCount), detail: "Classes available in this school", path: "/dashboard/classes" },
            ]);
            setRecentActivity([
              { module: "Workspace", owner: staff.name, status: staff.role || "Staff", time: "Firebase mode" },
              { module: "Students", owner: `${studentsCount} records`, status: "Available", time: "/dashboard/students" },
              { module: "Staff", owner: `${staffCount} records`, status: "Available", time: "/dashboard/staff" },
              { module: "Classes", owner: `${classesCount} records`, status: "Available", time: "/dashboard/classes" },
            ]);
            setError("");
            setLoading(false);
            return;
          }

          if (workspace === STAFF_WORKSPACES.HR) {
            const overview = await getDashboardOverview();
            setStats([
              { label: "Workspace", value: "HR", detail: "Human resources operations", path: "/dashboard/hr" },
              { label: "Employees", value: overview.stats.find((item) => item.label === "Employees")?.value ?? "-", detail: "Live staff headcount", path: "/dashboard/employees" },
              { label: "Leaves", value: overview.stats.find((item) => item.label === "Leave Requests")?.value ?? "-", detail: "Leave queue summary", path: "/dashboard/leaves" },
              { label: "Quick Access", value: "2", detail: "Employees and leave workflows", path: "/dashboard/hr" },
            ]);
            setRecentActivity([
              { module: "HR", owner: "Employees", status: "Manage records", time: "/dashboard/employees" },
              { module: "HR", owner: "Leaves", status: "Approve queue", time: "/dashboard/leaves" },
            ]);
          } else if (workspace === STAFF_WORKSPACES.ACCOUNTS) {
            const [fees, salary] = await Promise.all([listFees(), listSalary()]);
            setStats([
              { label: "Workspace", value: "Accounts", detail: "Finance operations", path: "/dashboard/accounts" },
              { label: "Fees", value: String(fees.length), detail: "Fee records available", path: "/dashboard/fees" },
              { label: "Pending Fees", value: String(fees.filter((item) => item.status !== "Paid").length), detail: "Due or partial records", path: "/dashboard/fees" },
              { label: "Salary", value: String(salary.filter((item) => item.status !== "Paid").length), detail: "Unpaid salary records", path: "/dashboard/salary" },
            ]);
            setRecentActivity([
              { module: "Accounts", owner: "Fees", status: "Record payments", time: "/dashboard/fees" },
              { module: "Accounts", owner: "Salary", status: "Release payouts", time: "/dashboard/salary" },
            ]);
          } else if (workspace === STAFF_WORKSPACES.TRANSPORT) {
            const [vehicles, routes] = await Promise.all([listVehicles(), listTransportRoutes()]);
            setStats([
              { label: "Workspace", value: "Transport", detail: "Fleet and routes", path: "/dashboard/transport" },
              { label: "Vehicles", value: String(vehicles.length), detail: "Fleet records", path: "/dashboard/vehicles" },
              { label: "Routes", value: String(routes.length), detail: "Transport routes", path: "/dashboard/routes" },
              { label: "Assigned Routes", value: String(routes.filter((item) => item.vehicleId).length), detail: "Routes linked to vehicles", path: "/dashboard/routes" },
            ]);
            setRecentActivity([
              { module: "Transport", owner: "Vehicles", status: "Manage fleet", time: "/dashboard/vehicles" },
              { module: "Transport", owner: "Routes", status: "Update stops", time: "/dashboard/routes" },
            ]);
          } else if (workspace === STAFF_WORKSPACES.ADMISSION) {
            const applicants = await listApplicants();
            setStats([
              { label: "Workspace", value: "Admission", detail: "Applicant processing", path: "/dashboard/admission" },
              { label: "Applicants", value: String(applicants.length), detail: "Total applicant records", path: "/dashboard/applicants" },
              { label: "Pending", value: String(applicants.filter((item) => item.status === "Pending").length), detail: "Awaiting decision", path: "/dashboard/applicants" },
              { label: "Approved", value: String(applicants.filter((item) => item.status === "Approved").length), detail: "Converted to students", path: "/dashboard/applicants" },
            ]);
            setRecentActivity(
              applicants.slice(0, 4).map((item) => ({
                module: "Admission",
                owner: item.name,
                status: item.status,
                time: item.className,
              })),
            );
          } else {
            const timetablePath = staff.isClassCoordinator ? "/dashboard/timetable/coordinator" : "/dashboard/timetable/my";
            const [todayClasses, allAttendance, allTimetable] = await Promise.all([
              listTimetableSlots({ teacherId: staff.id, date: getIndiaTodayIso() }),
              listAttendance(),
              listTimetableSlots({ teacherId: staff.id }),
            ]);

            setStats([
              { label: "Assigned Classes", value: String(new Set(allTimetable.map((slot) => `${slot.className}-${slot.section}`)).size), detail: "Classes linked to your timetable", path: timetablePath },
              { label: "Today's Classes", value: String(todayClasses.length), detail: "Live schedule for today", path: timetablePath },
              { label: "Attendance Pending", value: String(todayClasses.length), detail: "Open today’s classes to mark attendance", path: "/dashboard/attendance" },
              { label: "Attendance Records", value: String(allAttendance.length), detail: staff.subjectName ?? "Current teacher workload", path: "/dashboard/attendance" },
            ]);
            setRecentActivity(
              todayClasses.map((slot) => ({
                module: "Class",
                owner: `${slot.className} / ${slot.section}`,
                status: slot.subjectName,
                time: `${slot.day} ${slot.startTime}-${slot.endTime}`,
              })),
            );
          }
        } else if (role === ROLES.STUDENT) {
          const student = await getStudentByUserId(user.id);
          if (!student) throw new Error("Student profile not found.");

          if (isFirebaseOnlyMode) {
            setStats([
              { label: "Student", value: student.name, detail: `${student.className ?? "-"} / ${student.section ?? "-"}`, path: "/dashboard/profile" },
              { label: "Student ID", value: student.studentCode ?? "-", detail: "School record identifier", path: "/dashboard/profile" },
              { label: "Class", value: student.className ?? "-", detail: "Assigned class", path: "/dashboard/profile" },
              { label: "Section", value: student.section ?? "-", detail: "Assigned section", path: "/dashboard/profile" },
            ]);
            setRecentActivity([
              { module: "Profile", owner: student.name, status: "Loaded", time: "Firebase mode" },
            ]);
            setError("");
            setLoading(false);
            return;
          }

          const [attendance, results, fees, timetable] = await Promise.all([
            listAttendance({ className: student.className ?? undefined, section: student.section ?? undefined }),
            listResults(),
            listFees(),
            student.className && student.section ? listTimetableSlots({ className: student.className, section: student.section, date: getIndiaTodayIso() }) : Promise.resolve([]),
          ]);
          const ownAttendance = attendance.filter((row) => row.studentId === student.id);
          const ownResults = results.filter((row) => row.studentId === student.id);
          const ownFees = fees.filter((row) => row.studentId === student.id);
          const present = ownAttendance.filter((row) => row.status === "Present").length;
          const percent = ownAttendance.length ? Math.round((present / ownAttendance.length) * 100) : 0;

          setStats([
            { label: "Attendance %", value: `${percent}%`, detail: "Your recorded attendance", path: `/dashboard/attendance?studentId=${student.id}` },
            { label: "Results Summary", value: String(ownResults.length), detail: "Exam report cards available", path: `/dashboard/results?studentId=${student.id}` },
            { label: "Fee Status", value: ownFees[0]?.status ?? "No record", detail: "Current fee payment status", path: `/dashboard/fees?studentId=${student.id}` },
            { label: "Today's Timetable", value: String(timetable.length), detail: "Classes scheduled for today", path: `/dashboard/timetable?class=${encodeURIComponent(student.className ?? "")}&section=${encodeURIComponent(student.section ?? "")}` },
          ]);
          setRecentActivity(
            ownResults.slice(0, 4).map((item) => ({
              module: item.examName,
              owner: `${item.className ?? "-"} / ${item.section ?? "-"}`,
              status: `${item.percentage}% • ${item.finalGrade}`,
              time: `${item.startDate} to ${item.endDate}`,
            })),
          );
        } else if (role === ROLES.PARENT) {
          const child = (await getChildrenByParentUserId(user.id))[0] ?? null;
          if (!child) throw new Error("No child linked to this parent account.");

          if (isFirebaseOnlyMode) {
            setStats([
              { label: "Child", value: child.name, detail: `${child.className ?? "-"} / ${child.section ?? "-"}`, path: "/dashboard/child" },
              { label: "Student ID", value: child.studentCode ?? "-", detail: "Linked student record", path: "/dashboard/child" },
              { label: "Class", value: child.className ?? "-", detail: "Child assigned class", path: "/dashboard/child" },
              { label: "Section", value: child.section ?? "-", detail: "Child assigned section", path: "/dashboard/child" },
            ]);
            setRecentActivity([
              { module: "Child Profile", owner: child.name, status: "Loaded", time: "Firebase mode" },
            ]);
            setError("");
            setLoading(false);
            return;
          }

          const [attendance, results, fees] = await Promise.all([
            listAttendance({ className: child.className ?? undefined, section: child.section ?? undefined }),
            listResults(),
            listFees(),
          ]);
          const childAttendance = attendance.filter((row) => row.studentId === child.id);
          const childResults = results.filter((row) => row.studentId === child.id);
          const childFees = fees.filter((row) => row.studentId === child.id);
          const present = childAttendance.filter((row) => row.status === "Present").length;
          const percent = childAttendance.length ? Math.round((present / childAttendance.length) * 100) : 0;

          setStats([
            { label: "Child Info", value: child.name, detail: `${child.className ?? "-"} / ${child.section ?? "-"}`, path: "/dashboard/child" },
            { label: "Attendance", value: `${percent}%`, detail: "Child attendance overview", path: `/dashboard/attendance?studentId=${child.id}` },
            { label: "Results", value: String(childResults.length), detail: "Published child results", path: `/dashboard/results?studentId=${child.id}` },
            { label: "Fees", value: childFees[0]?.status ?? "No record", detail: "Current child fee status", path: `/dashboard/fees?studentId=${child.id}` },
          ]);
          setRecentActivity(
            childResults.slice(0, 4).map((item) => ({
              module: item.examName,
              owner: `${item.className ?? "-"} / ${item.section ?? "-"}`,
              status: `${item.percentage}% • ${item.finalGrade}`,
              time: `${item.startDate} to ${item.endDate}`,
            })),
          );
        }

        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, [role, user]);

  const chartMetrics = useMemo(
    () =>
      stats.slice(0, 4).map((stat) => ({
        name: stat.label,
        value: parseMetric(stat.value),
      })),
    [stats],
  );

  const trendMetrics = useMemo(
    () =>
      stats.slice(0, 4).map((stat, index) => ({
        name: stat.label.split(" ")[0],
        current: parseMetric(stat.value),
        target: Math.max(parseMetric(stat.value) + (index + 1) * 8, 10),
      })),
    [stats],
  );

  const activityRows = recentActivity.slice(0, 5);
  const upcomingEvents = upcomingEventsForRole(role);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="A unified command center for academics, operations, and day-to-day school workflows."
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(loading ? Array.from<RoleStat | null>({ length: 4 }).fill(null) : stats).map((stat, index) =>
          stat ? (
            <StatCard key={stat.label} stat={stat} index={index} onOpen={() => navigate(stat.path)} />
          ) : (
            <Card key={index} className="metric-card">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-4 h-10 w-20 animate-pulse rounded-2xl bg-slate-200" />
              <div className="mt-4 h-4 w-40 animate-pulse rounded-full bg-slate-100" />
            </Card>
          ),
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <SectionShell title="Performance Trend" subtitle="Compare core dashboard KPIs against their current operating target.">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendMetrics}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="current" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionShell>

        <SectionShell title="Distribution" subtitle="A fast view of where the current workload and metrics sit today.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartMetrics}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {chartMetrics.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartMetrics} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {chartMetrics.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionShell>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionShell title="Recent Activity" subtitle="The latest activity across your modules, classes, and workflows.">
          <div className="space-y-3">
            {activityRows.length === 0 ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No recent activity available.
              </div>
            ) : (
              activityRows.map((item, index) => (
                <div key={`${item.module}-${item.owner}-${index}`} className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.module}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.owner}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">{item.status}</span>
                    <span className="text-xs text-slate-500">{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionShell>

        <div className="space-y-6">
          <SectionShell title="Upcoming Events" subtitle="What needs attention next across the school workspace.">
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.title} className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">{event.time}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{event.detail}</p>
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell title="Quick Access" subtitle="Jump straight into the modules your team uses most.">
            <div className="grid gap-3">
              {stats.slice(0, 4).map((item) => (
                <Link key={item.label} to={item.path} className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 px-4 py-4 transition hover:border-blue-200 hover:bg-blue-50/60">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                </Link>
              ))}
            </div>
          </SectionShell>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
