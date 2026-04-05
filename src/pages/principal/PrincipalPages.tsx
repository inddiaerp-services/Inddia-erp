import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  approveApplicant,
  getAnalyticsDashboard,
  listApplicants,
  listAttendance,
  listClasses,
  listLeaves,
  listResults,
  listStaff,
  listStudents,
  rejectApplicant,
  reviewLeaveByAdmin,
} from "../../services/adminService";
import type {
  ApplicantApprovalValues,
  ApplicantRecord,
  AttendanceRecord,
  ClassRecord,
  LeaveRecord,
  ResultRecord,
  StaffRecord,
  StudentRecord,
} from "../../types/admin";
import { AdminPageHeader, CompactMetricCard, DetailField, DetailSection } from "../dashboard/adminPageUtils";

const CHART_COLORS = ["#2563eb", "#0f766e", "#f59e0b", "#ef4444"];

const formatPercent = (value: number) => `${Math.round(value)}%`;

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
};

const buildAttendanceByClass = (attendance: AttendanceRecord[]) => {
  const map = new Map<string, { className: string; section: string; total: number; present: number }>();

  attendance.forEach((record) => {
    const className = record.className ?? "Unassigned";
    const section = record.section ?? "-";
    const key = `${className}::${section}`;
    const current = map.get(key) ?? { className, section, total: 0, present: 0 };

    current.total += 1;
    if (String(record.status ?? "").toLowerCase() === "present") {
      current.present += 1;
    }

    map.set(key, current);
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      rate: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
    }))
    .sort((left, right) => left.rate - right.rate);
};

const PrincipalMetricGrid = ({
  students,
  staff,
  attendanceRate,
  pendingApprovals,
}: {
  students: number;
  staff: number;
  attendanceRate: number;
  pendingApprovals: number;
}) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <CompactMetricCard label="Total Students" value={students} detail="School-wide enrolled student records." icon={<span className="text-sm font-bold">ST</span>} />
    <CompactMetricCard label="Total Staff" value={staff} detail="Faculty and staff visible in this school." icon={<span className="text-sm font-bold">SF</span>} />
    <CompactMetricCard label="Attendance %" value={formatPercent(attendanceRate)} detail="School-wide present rate from attendance records." icon={<span className="text-sm font-bold">AT</span>} />
    <CompactMetricCard label="Pending Approvals" value={pendingApprovals} detail="Leave and admission requests waiting for a decision." icon={<span className="text-sm font-bold">AP</span>} />
  </div>
);

export const PrincipalDashboardPage = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [applicants, setApplicants] = useState<ApplicantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const [studentRows, staffRows, attendanceRows, resultRows, leaveRows, applicantRows] = await Promise.all([
          listStudents(),
          listStaff(),
          listAttendance(),
          listResults(),
          listLeaves(),
          listApplicants(),
        ]);

        if (!active) return;

        setStudents(studentRows);
        setStaff(staffRows);
        setAttendance(attendanceRows);
        setResults(resultRows);
        setLeaves(leaveRows);
        setApplicants(applicantRows);
        setError("");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load principal dashboard.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const attendanceByClass = useMemo(() => buildAttendanceByClass(attendance), [attendance]);
  const attendanceRate = useMemo(() => {
    if (attendance.length === 0) return 0;
    const present = attendance.filter((record) => String(record.status ?? "").toLowerCase() === "present").length;
    return (present / attendance.length) * 100;
  }, [attendance]);
  const pendingApprovals = leaves.filter((leave) => leave.status === "Pending_Admin").length + applicants.filter((applicant) => applicant.status === "Pending").length;
  const averagePerformance = useMemo(
    () => average(results.map((result) => Number(result.percentage ?? 0)).filter((value) => Number.isFinite(value))),
    [results],
  );
  const performanceByExam = useMemo(() => {
    const map = new Map<string, number[]>();
    results.forEach((result) => {
      const key = result.examName ?? "Unknown";
      map.set(key, [...(map.get(key) ?? []), Number(result.percentage ?? 0)]);
    });
    return Array.from(map.entries()).map(([label, values]) => ({ label, value: Math.round(average(values)) }));
  }, [results]);
  const lowAttendanceClasses = attendanceByClass.slice(0, 5);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Principal Dashboard"
        description="Leadership overview for school-wide monitoring, approval decisions, attendance health, and academic performance."
      />

      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}

      <PrincipalMetricGrid
        students={students.length}
        staff={staff.length}
        attendanceRate={attendanceRate}
        pendingApprovals={pendingApprovals}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-700">Attendance Trends</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Low attendance classes</h2>
          <div className="mt-6 h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart...</div>
            ) : lowAttendanceClasses.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No attendance data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lowAttendanceClasses}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="className" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="rate" radius={[12, 12, 0, 0]} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-700">Academic Performance</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Average result percentage by exam</h2>
          <p className="mt-2 text-sm text-slate-500">Current average performance is {Math.round(averagePerformance)}% across all results.</p>
          <div className="mt-6 h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart...</div>
            ) : performanceByExam.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No performance data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceByExam}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DetailSection title="Leadership Alerts">
          <DetailField label="Low Attendance Classes" value={lowAttendanceClasses.length ? lowAttendanceClasses.map((item) => `${item.className} / ${item.section} (${item.rate}%)`).join(", ") : "No attendance alerts right now"} />
          <DetailField label="Pending Leave Approvals" value={leaves.filter((leave) => leave.status === "Pending_Admin").length} />
          <DetailField label="Pending Admission Decisions" value={applicants.filter((applicant) => applicant.status === "Pending").length} />
          <DetailField label="Discipline Signals" value={lowAttendanceClasses.length > 0 ? "Attendance-based alerts available in Discipline." : "No major discipline signals detected from attendance data."} />
        </DetailSection>

        <DetailSection title="Principal Notes">
          <DetailField label="Dashboard Mode" value="Observer + decision maker" />
          <DetailField label="Write Access" value="Approvals only. Core data editing remains disabled." />
          <DetailField label="Read Scope" value="School-wide academic, attendance, staff, and approval visibility." />
          <DetailField label="Best Next Step" value={pendingApprovals > 0 ? "Open Approvals to clear pending decisions." : "Open Analytics to review school performance trends."} />
        </DetailSection>
      </div>
    </div>
  );
};

export const PrincipalAnalyticsPage = () => {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getAnalyticsDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const next = await getAnalyticsDashboard();
        if (active) {
          setDashboard(next);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load principal analytics.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Principal Analytics"
        description="Executive analytics focused on attendance movement, academic performance, and operational monitoring."
      />

      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(dashboard?.metrics ?? []).slice(0, 4).map((metric, index) => (
          <CompactMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.helper}
            icon={<span className="text-sm font-bold">{index + 1}</span>}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Monthly fees signal</h2>
          <div className="mt-6 h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart...</div>
            ) : !dashboard || dashboard.monthlyFees.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No fee chart data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.monthlyFees}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => `${value}`} />
                  <Bar dataKey="value" fill="#2563eb" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Attendance distribution</h2>
          <div className="mt-6 h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart...</div>
            ) : !dashboard || dashboard.attendance.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No attendance chart data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboard.attendance} dataKey="value" nameKey="label" innerRadius={74} outerRadius={112}>
                    {dashboard.attendance.map((entry, index) => (
                      <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const PrincipalStudentsPage = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [performanceFilter, setPerformanceFilter] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const [studentRows, resultRows, classRows] = await Promise.all([listStudents(), listResults(), listClasses()]);
        if (!active) return;
        setStudents(studentRows);
        setResults(resultRows);
        setClasses(classRows);
        setError("");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load students.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const performanceByStudent = useMemo(() => {
    const map = new Map<string, number[]>();
    results.forEach((result) => {
      map.set(result.studentId, [...(map.get(result.studentId) ?? []), Number(result.percentage ?? 0)]);
    });
    return map;
  }, [results]);

  const rows = useMemo(() => students.map((student) => {
    const averagePercentage = Math.round(average((performanceByStudent.get(student.id) ?? []).filter((value) => Number.isFinite(value))));
    const performanceBand = averagePercentage >= 75 ? "High" : averagePercentage >= 50 ? "Medium" : "Low";

    return {
      ...student,
      averagePercentage,
      performanceBand,
    };
  }), [performanceByStudent, students]);

  const filtered = rows.filter((student) => {
    const haystack = `${student.name} ${student.className ?? ""} ${student.section ?? ""} ${student.studentCode ?? ""}`.toLowerCase();
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
    const matchesClass = !classFilter || student.className === classFilter;
    const matchesPerformance = !performanceFilter || student.performanceBand === performanceFilter;
    return matchesSearch && matchesClass && matchesPerformance;
  });

  const classOptions = Array.from(new Set(classes.map((item) => item.className))).sort((left, right) => left.localeCompare(right));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Principal Students"
        description="Read-only student visibility with class and performance filters for school-level monitoring."
      />

      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students..." />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Class</span>
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
              <option value="">All classes</option>
              {classOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Performance</span>
            <select value={performanceFilter} onChange={(event) => setPerformanceFilter(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
              <option value="">All bands</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>
        </div>
      </Card>

      <DataTable
        title="Student Overview"
        description="Principal view is read-only and optimized for oversight."
        data={filtered}
        getRowId={(item) => item.id}
        loading={loading}
        emptyMessage="No students found for the current filters."
        mobileTitle={(item) => item.name}
        mobileSubtitle={(item) => `${item.className ?? "-"} / ${item.section ?? "-"} • ${item.performanceBand}`}
        columns={[
          { key: "student", label: "Student", render: (item) => <div><p className="font-semibold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{item.studentCode ?? "No ID"}</p></div>, emphasis: true },
          { key: "class", label: "Class", render: (item) => `${item.className ?? "-"} / ${item.section ?? "-"}` },
          { key: "performance", label: "Performance", render: (item) => `${item.averagePercentage || 0}% (${item.performanceBand})` },
          { key: "parent", label: "Parent", render: (item) => item.parentName ?? "-" },
        ]}
        pageSize={10}
      />
    </div>
  );
};

export const PrincipalStaffPage = () => {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const rows = await listStaff();
        if (!active) return;
        setStaff(rows);
        setError("");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load staff.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Principal Staff"
        description="Read-only directory of school staff for leadership visibility and workload monitoring."
      />

      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <CompactMetricCard label="Total Staff" value={staff.length} detail="All visible staff records in this school." icon={<span className="text-sm font-bold">SF</span>} />
        <CompactMetricCard label="Teachers" value={staff.filter((member) => String(member.role).toLowerCase() === "teacher").length} detail="Subject-linked teaching staff." icon={<span className="text-sm font-bold">TC</span>} />
        <CompactMetricCard label="Principal" value={staff.filter((member) => String(member.role).toLowerCase() === "principal").length} detail="Leadership account count for the school." icon={<span className="text-sm font-bold">PR</span>} />
      </div>

      <DataTable
        title="Staff Directory"
        description="Principal workspace is view-only."
        data={staff}
        getRowId={(item) => item.id}
        loading={loading}
        emptyMessage="No staff records found."
        mobileTitle={(item) => item.name}
        mobileSubtitle={(item) => `${item.role}${item.subjectName ? ` • ${item.subjectName}` : ""}`}
        columns={[
          { key: "name", label: "Staff", render: (item) => <div><p className="font-semibold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{item.email}</p></div>, emphasis: true },
          { key: "role", label: "Role", render: (item) => item.designation ?? item.role },
          { key: "subject", label: "Subject", render: (item) => item.subjectName ?? "-" },
          { key: "status", label: "Status", render: (item) => item.status ?? "active" },
        ]}
        pageSize={10}
      />
    </div>
  );
};

export const PrincipalAttendancePage = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const rows = await listAttendance();
        if (!active) return;
        setAttendance(rows);
        setError("");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load attendance.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const classRows = buildAttendanceByClass(attendance);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Principal Attendance"
        description="Class-wise tracking of attendance performance with a read-only leadership view."
      />

      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}

      <DataTable
        title="Class Attendance Health"
        description="Sorted from lowest attendance rate to highest so leadership can act quickly."
        data={classRows}
        getRowId={(item) => `${item.className}-${item.section}`}
        loading={loading}
        emptyMessage="No attendance records found."
        mobileTitle={(item) => `${item.className} / ${item.section}`}
        mobileSubtitle={(item) => `${item.rate}% present`}
        columns={[
          { key: "class", label: "Class", render: (item) => `${item.className} / ${item.section}`, emphasis: true },
          { key: "present", label: "Present", render: (item) => item.present },
          { key: "total", label: "Total", render: (item) => item.total },
          { key: "rate", label: "Attendance %", render: (item) => `${item.rate}%` },
        ]}
        pageSize={10}
      />
    </div>
  );
};

export const PrincipalApprovalsPage = () => {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [applicants, setApplicants] = useState<ApplicantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leaveTarget, setLeaveTarget] = useState<LeaveRecord | null>(null);
  const [leaveDecision, setLeaveDecision] = useState<"Approved" | "Rejected_By_Admin">("Approved");
  const [leaveComment, setLeaveComment] = useState("");
  const [approvalTarget, setApprovalTarget] = useState<ApplicantRecord | null>(null);
  const [approvalForm, setApprovalForm] = useState<ApplicantApprovalValues>({ applicantId: "", section: "", studentPassword: "", parentPassword: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const [leaveRows, applicantRows] = await Promise.all([listLeaves(), listApplicants()]);
    setLeaves(leaveRows);
    setApplicants(applicantRows);
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        await loadData();
        if (active) {
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load approvals.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const pendingLeaves = leaves.filter((leave) => leave.status === "Pending_Admin");
  const pendingApplicants = applicants.filter((applicant) => applicant.status === "Pending");

  const handleLeaveSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leaveTarget) return;

    setSubmitting(true);
    try {
      await reviewLeaveByAdmin(leaveTarget.id, leaveDecision, leaveComment);
      setLeaveTarget(null);
      setLeaveComment("");
      await loadData();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to review leave.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplicantApproval = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!approvalTarget) return;

    setSubmitting(true);
    try {
      await approveApplicant({ ...approvalForm, applicantId: approvalTarget.id });
      setApprovalTarget(null);
      setApprovalForm({ applicantId: "", section: "", studentPassword: "", parentPassword: "" });
      await loadData();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to approve applicant.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Principal Approvals"
        description="Review leave requests and pending admissions with controlled approval actions."
      />

      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CompactMetricCard label="Pending Leaves" value={pendingLeaves.length} detail="Admin-stage leave decisions waiting for the principal." icon={<span className="text-sm font-bold">LV</span>} />
        <CompactMetricCard label="Pending Admissions" value={pendingApplicants.length} detail="Applicants ready for final approval or rejection." icon={<span className="text-sm font-bold">AD</span>} />
      </div>

      <DataTable
        title="Leave Approvals"
        description="Approve or reject admin-stage leave requests."
        data={pendingLeaves}
        getRowId={(item) => item.id}
        loading={loading}
        emptyMessage="No leave approvals are pending."
        mobileTitle={(item) => item.employeeName}
        mobileSubtitle={(item) => `${item.startDate} to ${item.endDate}`}
        columns={[
          { key: "employee", label: "Employee", render: (item) => item.employeeName, emphasis: true },
          { key: "role", label: "Role", render: (item) => item.role ?? "-" },
          { key: "dates", label: "Dates", render: (item) => `${item.startDate} to ${item.endDate}` },
          { key: "reason", label: "Reason", render: (item) => item.reason ?? "-" },
        ]}
        renderActions={(item) => (
          <Button variant="outline" onClick={() => { setLeaveTarget(item); setLeaveDecision("Approved"); setLeaveComment(""); }}>
            Review
          </Button>
        )}
      />

      <DataTable
        title="Admission Approvals"
        description="Approve to create linked student and parent accounts, or reject the request."
        data={pendingApplicants}
        getRowId={(item) => item.id}
        loading={loading}
        emptyMessage="No admission approvals are pending."
        mobileTitle={(item) => item.name}
        mobileSubtitle={(item) => `${item.className} • ${item.parentName ?? "No parent"}`}
        columns={[
          { key: "applicant", label: "Applicant", render: (item) => item.name, emphasis: true },
          { key: "class", label: "Class", render: (item) => item.className },
          { key: "parent", label: "Parent", render: (item) => item.parentName ?? "-" },
          { key: "email", label: "Email", render: (item) => item.email },
        ]}
        renderActions={(item) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setApprovalTarget(item); setApprovalForm({ applicantId: item.id, section: "", studentPassword: "", parentPassword: "" }); }}>
              Approve
            </Button>
            <Button variant="ghost" onClick={() => void rejectApplicant(item.id).then(loadData).catch((submissionError) => setError(submissionError instanceof Error ? submissionError.message : "Failed to reject applicant."))}>
              Reject
            </Button>
          </div>
        )}
      />

      <Modal open={Boolean(leaveTarget)} onClose={() => setLeaveTarget(null)} title="Review Leave Request" description="Principal can approve or reject leave requests at the admin stage.">
        <form className="space-y-4" onSubmit={handleLeaveSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Decision</span>
            <select value={leaveDecision} onChange={(event) => setLeaveDecision(event.target.value as "Approved" | "Rejected_By_Admin")} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
              <option value="Approved">Approve</option>
              <option value="Rejected_By_Admin">Reject</option>
            </select>
          </label>
          <Input label="Comment" value={leaveComment} onChange={(event) => setLeaveComment(event.target.value)} placeholder="Optional note for the final decision" />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setLeaveTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Decision"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(approvalTarget)} onClose={() => setApprovalTarget(null)} title="Approve Applicant" description="Create linked student and parent accounts as part of the final approval step.">
        <form className="space-y-4" onSubmit={handleApplicantApproval}>
          <Input label="Section" value={approvalForm.section} onChange={(event) => setApprovalForm((current) => ({ ...current, section: event.target.value }))} required />
          <Input label="Student Password" type="password" value={approvalForm.studentPassword} onChange={(event) => setApprovalForm((current) => ({ ...current, studentPassword: event.target.value }))} required />
          <Input label="Parent Password" type="password" value={approvalForm.parentPassword} onChange={(event) => setApprovalForm((current) => ({ ...current, parentPassword: event.target.value }))} required />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setApprovalTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Approving..." : "Approve Applicant"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const PrincipalDisciplinePage = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const [studentRows, attendanceRows] = await Promise.all([listStudents(), listAttendance()]);
        if (!active) return;
        setStudents(studentRows);
        setAttendance(attendanceRows);
        setError("");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load discipline view.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const byStudent = useMemo(() => {
    const attendanceMap = new Map<string, AttendanceRecord[]>();
    attendance.forEach((record) => {
      attendanceMap.set(record.studentId, [...(attendanceMap.get(record.studentId) ?? []), record]);
    });

    return students
      .map((student) => {
        const records = attendanceMap.get(student.id) ?? [];
        const present = records.filter((record) => String(record.status ?? "").toLowerCase() === "present").length;
        const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
        return {
          id: student.id,
          name: student.name,
          className: student.className ?? "-",
          section: student.section ?? "-",
          rate,
          concern: rate > 0 && rate < 75 ? "Attendance risk" : "Stable",
        };
      })
      .filter((student) => student.concern !== "Stable")
      .sort((left, right) => left.rate - right.rate);
  }, [attendance, students]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Principal Discipline"
        description="Current discipline visibility is derived from attendance-risk signals until a dedicated incident module is introduced."
      />

      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}

      <DetailSection title="Current Scope">
        <DetailField label="Source" value="Attendance-linked discipline signal monitoring" />
        <DetailField label="Dedicated Incident Module" value="Not yet implemented in this codebase" />
        <DetailField label="Principal Action" value="Use these signals to investigate classes or students needing intervention." />
        <DetailField label="Risk Threshold" value="Students below 75% attendance appear here." />
      </DetailSection>

      <DataTable
        title="Student Concern Signals"
        description="Read-only monitoring list based on attendance risk."
        data={byStudent}
        getRowId={(item) => item.id}
        loading={loading}
        emptyMessage="No current discipline signals detected."
        mobileTitle={(item) => item.name}
        mobileSubtitle={(item) => `${item.className} / ${item.section} • ${item.rate}%`}
        columns={[
          { key: "student", label: "Student", render: (item) => item.name, emphasis: true },
          { key: "class", label: "Class", render: (item) => `${item.className} / ${item.section}` },
          { key: "rate", label: "Attendance %", render: (item) => `${item.rate}%` },
          { key: "concern", label: "Concern", render: (item) => item.concern },
        ]}
        pageSize={10}
      />
    </div>
  );
};
