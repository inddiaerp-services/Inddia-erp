import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../../components/ui/Card";
import { AdminPageHeader } from "./adminPageUtils";
import {
  listApplicants,
  listEmployees,
  listFees,
  listLeaves,
  listStaffAttendance,
  listSalary,
  listTransportRoutes,
  listVehicles,
} from "../../services/adminService";
import { getIndiaTodayIso } from "../../utils/date";

type Metric = {
  label: string;
  value: string;
  detail: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const MetricCards = ({ metrics }: { metrics: Metric[] }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {metrics.map((metric) => (
      <Card key={metric.label} className="metric-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{metric.label}</p>
        <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{metric.detail}</p>
      </Card>
    ))}
  </div>
);

const DashboardShell = ({
  title,
  description,
  metrics,
  links,
}: {
  title: string;
  description: string;
  metrics: Metric[];
  links: Array<{ title: string; body: string; path: string }>;
}) => {
  const chartData = useMemo(
    () =>
      metrics.map((metric) => ({
        name: metric.label.split(" ")[0],
        value: Number.parseFloat(metric.value.replace(/[^0-9.]/g, "")) || 0,
      })),
    [metrics],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} description={description} />
      <MetricCards metrics={metrics} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-200/80 bg-white p-0">
          <div className="border-b border-slate-200/80 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-950">Operational Snapshot</h2>
            <p className="mt-1 text-sm text-slate-500">A quick chart view for the most important workspace totals.</p>
          </div>
          <div className="h-[300px] p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-slate-200/80 bg-white p-0">
          <div className="border-b border-slate-200/80 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-950">Quick Access</h2>
            <p className="mt-1 text-sm text-slate-500">Move into the most common workflows without extra clicks.</p>
          </div>
          <div className="space-y-3 p-6">
            {links.map((link) => (
              <Link key={link.path} to={link.path} className="block rounded-[1.4rem] border border-slate-200 bg-slate-50/70 px-4 py-4 transition hover:border-blue-200 hover:bg-blue-50/60">
                <p className="text-sm font-semibold text-slate-900">{link.title}</p>
                <p className="mt-1 text-sm text-slate-500">{link.body}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const LoadingState = () => <Card className="border-slate-200 bg-white">Loading dashboard...</Card>;

export const HrDashboardPage = () => {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);

  useEffect(() => {
    void (async () => {
      const today = getIndiaTodayIso();
      const [employees, leaves, attendance] = await Promise.all([listEmployees(), listLeaves(), listStaffAttendance({ date: today })]);
      setMetrics([
        { label: "Total Employees", value: String(employees.length), detail: "Staff records synced from admin setup." },
        { label: "Marked Today", value: String(attendance.length), detail: `Staff attendance saved for ${today}.` },
        { label: "Pending Leaves", value: String(leaves.filter((item) => item.status === "Pending_HR").length), detail: "Requests waiting for HR action." },
        { label: "Approved Leaves", value: String(leaves.filter((item) => item.status === "Approved").length), detail: "Approved leave requests on record." },
      ]);
    })();
  }, []);

  if (!metrics) return <LoadingState />;

  return (
    <DashboardShell
      title="HR Dashboard"
      description="Monitor employees, leave approvals, and workforce health from one polished workspace."
      metrics={metrics}
      links={[
        { title: "Employees", body: "View and manage employee records, subjects, and coordinator flags.", path: "/dashboard/employees" },
        { title: "Staff Attendance", body: "Mark daily staff attendance, late arrivals, and leave-linked presence from HR.", path: "/dashboard/staff-attendance" },
        { title: "Leaves", body: "Review leave requests, then approve or reject them from a live queue.", path: "/dashboard/leaves" },
      ]}
    />
  );
};

export const AccountsDashboardPage = () => {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);

  useEffect(() => {
    void (async () => {
      const [fees, salary] = await Promise.all([listFees(), listSalary()]);
      const totalFeesCollected = fees.reduce((sum, item) => sum + item.paidAmount, 0);
      const pendingFees = fees.reduce((sum, item) => sum + item.remainingAmount, 0);
      const totalSalaryPaid = salary.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.amount, 0);

      setMetrics([
        { label: "Total Fees Collected", value: formatCurrency(totalFeesCollected), detail: "Recorded fee payments across students." },
        { label: "Pending Fees", value: formatCurrency(pendingFees), detail: "Outstanding balance still pending collection." },
        { label: "Total Salary Paid", value: formatCurrency(totalSalaryPaid), detail: "Disbursed salary across paid entries." },
        { label: "Unpaid Salary", value: String(salary.filter((item) => item.status !== "Paid").length), detail: "Salary rows still awaiting release." },
      ]);
    })();
  }, []);

  if (!metrics) return <LoadingState />;

  return (
    <DashboardShell
      title="Accounts Dashboard"
      description="Track collections, dues, salary disbursement, and finance workflows with a cleaner SaaS finance view."
      metrics={metrics}
      links={[
        { title: "Fees", body: "Open fee records and continue payment updates from student fee detail pages.", path: "/dashboard/fees" },
        { title: "Salary", body: "Review monthly salary entries and mark unpaid records as paid.", path: "/dashboard/salary" },
      ]}
    />
  );
};

export const TransportDashboardPage = () => {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);

  useEffect(() => {
    void (async () => {
      const [vehicles, routes] = await Promise.all([listVehicles(), listTransportRoutes()]);
      const activeVehicles = vehicles.filter((item) => (item.status ?? "Active") === "Active").length;
      const totalCapacity = vehicles.reduce((sum, item) => sum + item.capacity, 0);
      const assignedVehicleIds = new Set(routes.map((item) => item.vehicleId).filter(Boolean));
      const assignedCapacity = vehicles.filter((item) => assignedVehicleIds.has(item.id)).reduce((sum, item) => sum + item.capacity, 0);
      const capacityUsage = totalCapacity > 0 ? `${Math.round((assignedCapacity / totalCapacity) * 100)}%` : "0%";

      setMetrics([
        { label: "Total Vehicles", value: String(vehicles.length), detail: "Fleet records managed in transport." },
        { label: "Active Vehicles", value: String(activeVehicles), detail: "Vehicles currently available for daily operations." },
        { label: "Routes Count", value: String(routes.length), detail: "Configured routes linked with vehicles." },
        { label: "Capacity Usage", value: capacityUsage, detail: "Fleet seating capacity already attached to assigned routes." },
      ]);
    })();
  }, []);

  if (!metrics) return <LoadingState />;

  return (
    <DashboardShell
      title="Transport Dashboard"
      description="Manage school vehicles, route planning, and transport capacity in one modern operations workspace."
      metrics={metrics}
      links={[
        { title: "Vehicles", body: "Maintain vehicle numbers, driver data, and carrying capacity.", path: "/dashboard/vehicles" },
        { title: "Routes", body: "Create and update transport routes with assigned vehicles.", path: "/dashboard/routes" },
      ]}
    />
  );
};

export const AdmissionDashboardPage = () => {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);

  useEffect(() => {
    void (async () => {
      const applicants = await listApplicants();
      setMetrics([
        { label: "Total Applicants", value: String(applicants.length), detail: "Admission records in the pipeline." },
        { label: "Pending", value: String(applicants.filter((item) => item.status === "Pending").length), detail: "Applicants awaiting review." },
        { label: "Approved", value: String(applicants.filter((item) => item.status === "Approved").length), detail: "Applicants converted into live student records." },
        { label: "Rejected", value: String(applicants.filter((item) => item.status === "Rejected").length), detail: "Applications closed without conversion." },
      ]);
    })();
  }, []);

  if (!metrics) return <LoadingState />;

  return (
    <DashboardShell
      title="Admission Dashboard"
      description="Track applicant intake, approvals, and pipeline health with a consistent enterprise admissions UI."
      metrics={metrics}
      links={[
        { title: "Applicants", body: "Create new applicants, review details, and complete approval or rejection actions.", path: "/dashboard/applicants" },
        { title: "Students", body: "Move approved applicants into fully linked student records.", path: "/dashboard/students" },
      ]}
    />
  );
};
