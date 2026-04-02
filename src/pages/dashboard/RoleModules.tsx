import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import Input from "../../components/ui/Input";
import ActionIconButton from "../../components/ui/ActionIconButton";
import AttendanceMonthGridView from "../../components/attendance/AttendanceMonthGrid";
import { authStore } from "../../store/authStore";
import {
  AttendancePage as AdminAttendancePage,
  ExamsPage as AdminExamsPage,
  FeesPage as AdminFeesPage,
  ResultsPage as AdminResultsPage,
} from "./AdvancedModules";
import {
  getChildrenByParentUserId,
  getAttendanceMonthGrid,
  getExamMarksEntryAvailabilityMessage,
  getStaffByUserId,
  getStudentByUserId,
  isExamMarksEntryOpen,
  listAttendance,
  listExamSubjects,
  listExams,
  listFees,
  listResults,
} from "../../services/adminService";
import { AdminPageHeader } from "./adminPageUtils";
import type {
  AttendanceRecord,
  ExamRecord,
  FeeRecord,
  ResultRecord,
  StudentRecord,
} from "../../types/admin";
import { ROLES } from "../../config/roles";
import { normalizeStaffWorkspace, STAFF_WORKSPACES, type StaffWorkspace } from "../../config/staffWorkspaces";
import { formatMonthLabel, getIndiaTodayIso } from "../../utils/date";

const statusBadge = (status: string) =>
  status === "Present" || status === "Paid" || status === "Approved"
    ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
    : status === "Partial"
      ? "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
      : "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700";

const resolveViewerStudent = async (userId: string, role: string | null) => {
  if (role === ROLES.STUDENT) {
    return getStudentByUserId(userId);
  }
  if (role === ROLES.PARENT) {
    const children = await getChildrenByParentUserId(userId);
    return children[0] ?? null;
  }
  return null;
};

export const RoleAttendancePage = () => {
  const { user, role } = authStore();
  const [viewerStudent, setViewerStudent] = useState<StudentRecord | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getIndiaTodayIso().slice(0, 7));
  const [monthGrid, setMonthGrid] = useState<Awaited<ReturnType<typeof getAttendanceMonthGrid>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role === ROLES.ADMIN || role === ROLES.STAFF || !user) return;
    const run = async () => {
      setLoading(true);
      try {
        const student = await resolveViewerStudent(user.id, role);
        setViewerStudent(student);
        if (!student) {
          setRecords([]);
          setMonthGrid(null);
        } else {
          const attendanceRows = await listAttendance({
            className: student.className ?? undefined,
            section: student.section ?? undefined,
          });
          setRecords(attendanceRows.filter((row) => row.studentId === student.id));
          if (student.className && student.section) {
            setMonthGrid(
              await getAttendanceMonthGrid({
                month: selectedMonth,
                className: student.className,
                section: student.section,
                studentId: student.id,
              }),
            );
          } else {
            setMonthGrid(null);
          }
        }
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load attendance data.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [role, selectedMonth, user]);

  if (role === ROLES.ADMIN || role === ROLES.STAFF) return <AdminAttendancePage />;

  const total = records.length;
  const present = records.filter((row) => row.status === "Present").length;
  const percentage = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Attendance"
        description={role === ROLES.PARENT ? "Track your child’s attendance on a month calendar aligned to the timetable." : "Track your own attendance on a month calendar aligned to the timetable."}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{viewerStudent?.name ?? "No linked student"}</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attendance %</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{percentage}%</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Present / Total</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{present}/{total}</p>
        </Card>
      </div>
      <Card className="border-slate-200 bg-white shadow-sm">
        <Input label="Month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
      </Card>
      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center text-slate-500">Loading attendance calendar...</div>
        ) : monthGrid ? (
          <AttendanceMonthGridView grid={monthGrid} mode="student" />
        ) : (
          <div className="flex min-h-[220px] items-center justify-center text-slate-500">No attendance calendar available.</div>
        )}
      </Card>
      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-slate-500">No attendance records found.</td></tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4 text-slate-700">{row.date ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-700">{row.subjectName ?? "-"}</td>
                    <td className="px-6 py-4"><span className={statusBadge(row.status ?? "Absent")}>{row.status ?? "-"}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const RoleResultsPage = () => {
  const { user, role } = authStore();
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role === ROLES.ADMIN || !user) return;
    const run = async () => {
      setLoading(true);
      try {
        if (role === ROLES.STAFF) {
          const staff = await getStaffByUserId(user.id);
          if (!staff) {
            setResults([]);
          } else {
            const [allResults, allExams] = await Promise.all([listResults(), listExams()]);
            const allowedExamIds = (
              await Promise.all(
                allExams.map(async (exam) => {
                  const subjects = await listExamSubjects(exam.id);
                  return subjects.some((subject) => subject.teacherId === staff.id) ? exam.id : null;
                }),
              )
            ).filter((value): value is string => Boolean(value));
            setResults(allResults.filter((row) => allowedExamIds.includes(row.examId)));
          }
        } else {
          const allResults = await listResults();
          const student = await resolveViewerStudent(user.id, role);
          setResults(student ? allResults.filter((row) => row.studentId === student.id) : []);
        }
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load results.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [role, user]);

  if (role === ROLES.ADMIN) return <AdminResultsPage />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Results"
        description={
          role === ROLES.STAFF
            ? "Review exam summaries only for classes and subjects assigned to you."
            : role === ROLES.PARENT
              ? "Monitor your child’s exam results and grades."
              : "Review your exam results and report cards."
        }
      />
      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}
      <DataTable
        data={results}
        getRowId={(item) => item.id}
        loading={loading}
        loadingMessage="Loading results..."
        emptyMessage="No result records found."
        mobileTitle={(item) => item.examName}
        mobileSubtitle={(item) => `${item.studentName} • ${item.percentage}%`}
        columns={[
          { key: "studentName", label: "Student", render: (item) => item.studentName },
          { key: "examName", label: "Exam", render: (item) => item.examName, emphasis: true, mobileHidden: true },
          { key: "total", label: "Total", render: (item) => `${item.totalMarks} / ${item.maxMarks}` },
          { key: "percentage", label: "Percentage", render: (item) => `${item.percentage}%` },
          { key: "finalGrade", label: "Final Grade", render: (item) => `${item.finalGrade} (${item.passStatus})` },
        ]}
        renderActions={(item) => (
          <div className="flex gap-2">
            <Link to={`/dashboard/results/${item.id}`}><ActionIconButton action="view" /></Link>
          </div>
        )}
      />
    </div>
  );
};

export const RoleFeesPage = () => {
  const { user, role } = authStore();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [workspace, setWorkspace] = useState<StaffWorkspace>(STAFF_WORKSPACES.TEACHER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role === ROLES.ADMIN || !user) return;
    const run = async () => {
      setLoading(true);
      try {
        if (role === ROLES.STAFF) {
          const staff = await getStaffByUserId(user.id);
          setWorkspace(normalizeStaffWorkspace(staff?.role));
          setFees(await listFees());
          setStudent(null);
          setError("");
          setLoading(false);
          return;
        }
        const linkedStudent = await resolveViewerStudent(user.id, role);
        setStudent(linkedStudent);
        const allFees = await listFees();
        setFees(linkedStudent ? allFees.filter((item) => item.studentId === linkedStudent.id) : []);
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load fee records.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [role, user]);

  if (role === ROLES.ADMIN || (role === ROLES.STAFF && workspace === STAFF_WORKSPACES.ACCOUNTS)) return <AdminFeesPage />;

  const primaryFee = fees[0] ?? null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Fees"
        description={role === ROLES.PARENT ? "Track your child’s fee status, payments, and remaining balance." : "Track your own fee status, dues, and payment progress."}
      />
      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{student?.name ?? "No linked student"}</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{primaryFee?.totalAmount ?? 0}</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Paid</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{primaryFee?.paidAmount ?? 0}</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Remaining</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{primaryFee?.remainingAmount ?? 0}</p>
        </Card>
      </div>
      <DataTable
        data={fees}
        getRowId={(item) => item.id}
        loading={loading}
        loadingMessage="Loading fee records..."
        emptyMessage="No fee records found."
        mobileTitle={(item) => item.studentName}
        mobileSubtitle={(item) => `${item.status ?? "-"} • Due ${item.dueDate ?? "-"}`}
        columns={[
          { key: "studentName", label: "Student", render: (item) => item.studentName, emphasis: true, mobileHidden: true },
          { key: "totalAmount", label: "Total", render: (item) => item.totalAmount },
          { key: "paidAmount", label: "Paid", render: (item) => item.paidAmount },
          { key: "remainingAmount", label: "Remaining", render: (item) => item.remainingAmount },
          { key: "status", label: "Status", render: (item) => <span className={statusBadge(item.status ?? "Unpaid")}>{item.status ?? "-"}</span> },
          { key: "dueDate", label: "Due Date", render: (item) => item.dueDate ?? "-" },
        ]}
        renderActions={(item) => <Link to={`/dashboard/fees/${item.id}`}><ActionIconButton action="view" /></Link>}
      />
    </div>
  );
};

export const RoleExamsPage = () => {
  const { user, role } = authStore();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role === ROLES.ADMIN || !user) return;
    const run = async () => {
      setLoading(true);
      try {
        const staff = await getStaffByUserId(user.id);
        if (!staff?.subjectId) {
          setExams([]);
          setLoading(false);
          return;
        }
        const examRows = await listExams();
        const matches = await Promise.all(
          examRows.map(async (exam) => {
            const subjects = await listExamSubjects(exam.id);
            return subjects.some((subject) => subject.teacherId === staff.id) ? exam : null;
          }),
        );
        setExams(matches.filter((item): item is ExamRecord => Boolean(item)));
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load exams.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [role, user]);

  if (role === ROLES.ADMIN) return <AdminExamsPage />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Exams"
        description="Teachers can open only exams linked to their own subject and continue to marks entry from there."
      />
      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}
      <DataTable
        data={exams}
        getRowId={(item) => item.id}
        loading={loading}
        loadingMessage="Loading exams..."
        emptyMessage="No exams available for your subject."
        mobileTitle={(item) => item.name}
        mobileSubtitle={(item) => `${item.className} / ${item.section}`}
        columns={[
          { key: "name", label: "Exam", render: (item) => item.name, emphasis: true, mobileHidden: true },
          { key: "className", label: "Class", render: (item) => item.className },
          { key: "section", label: "Section", render: (item) => item.section },
          { key: "date", label: "Date", render: (item) => `${item.startDate} to ${item.endDate}` },
          { key: "examSession", label: "Session", render: (item) => item.examSession },
        ]}
        renderActions={(exam) => {
          const marksEntryOpen = isExamMarksEntryOpen(exam);
          const marksEntryMessage = getExamMarksEntryAvailabilityMessage(exam);
          return (
            <div className="flex flex-wrap gap-2">
              <Link to={`/dashboard/exams/${exam.id}`}><ActionIconButton action="view" /></Link>
              {marksEntryOpen ? (
                <Link to={`/dashboard/exams/${exam.id}/marks`}><Button>Enter Marks</Button></Link>
              ) : (
                <Button disabled title={marksEntryMessage}>Locked Till End Date</Button>
              )}
            </div>
          );
        }}
      />
    </div>
  );
};
