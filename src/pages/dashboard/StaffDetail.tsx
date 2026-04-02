import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { getStaffDetail, listAttendance, listLeaves, listResults, listSalary, loadTimetable } from "../../services/adminService";
import { AdminPageHeader, DetailField, DetailSection } from "./adminPageUtils";
import type { AttendanceRecord, LeaveRecord, ResultRecord, SalaryRecord, StaffRecord, TimetableSlotRecord } from "../../types/admin";

const quickLinkClassName =
  "rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-brand-300 hover:bg-brand-50";

const getLeaveBadgeClassName = (status: LeaveRecord["status"]) => {
  if (status === "Approved") {
    return "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700";
  }

  if (status === "Rejected_By_HR" || status === "Rejected_By_Admin") {
    return "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700";
  }

  if (status === "Pending_Admin") {
    return "rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700";
  }

  return "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700";
};

const getLeaveStatusLabel = (status: LeaveRecord["status"]) => {
  switch (status) {
    case "Pending_HR":
      return "Sent To HR";
    case "Pending_Admin":
      return "Sent To Admin";
    case "Rejected_By_HR":
      return "Rejected By HR";
    case "Rejected_By_Admin":
      return "Rejected By Admin";
    default:
      return "Approved";
  }
};

export const StaffDetailPage = () => {
  const { id = "" } = useParams();
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlotRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [salary, setSalary] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const staffDetail = await getStaffDetail(id);
        setStaff(staffDetail);

        const [allTimetable, allAttendance, allResults, allLeaves, allSalary] = await Promise.all([
          staffDetail.assignedClass && staffDetail.assignedSection
            ? loadTimetable(staffDetail.assignedClass, staffDetail.assignedSection)
            : Promise.resolve([] as TimetableSlotRecord[]),
          listAttendance(),
          listResults(),
          listLeaves(),
          listSalary(),
        ]);

        setTimetableSlots(allTimetable.filter((slot) => slot.teacherId === staffDetail.id));
        setAttendance(allAttendance.filter((row) => row.teacherId === staffDetail.id));
        setResults(
          allResults.filter((row) =>
            row.className === staffDetail.assignedClass &&
            row.section === staffDetail.assignedSection,
          ),
        );
        setLeaves(allLeaves.filter((row) => row.staffId === staffDetail.id));
        setSalary(allSalary.filter((row) => row.staffId === staffDetail.id));
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load staff member.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const summary = useMemo(() => {
    const approvedLeaves = leaves.filter((row) => row.status === "Approved").length;
    const pendingLeaves = leaves.filter((row) => row.status === "Pending_HR" || row.status === "Pending_Admin").length;
    const paidSalary = salary.filter((row) => row.status === "Paid");
    const unpaidSalary = salary.filter((row) => row.status !== "Paid");
    const totalSalaryPaid = paidSalary.reduce((sum, row) => sum + row.amount, 0);

    return {
      timetableCount: timetableSlots.length,
      attendanceCount: attendance.length,
      resultCount: results.length,
      leaveCount: leaves.length,
      approvedLeaves,
      pendingLeaves,
      salaryCount: salary.length,
      totalSalaryPaid,
      unpaidSalaryCount: unpaidSalary.length,
      latestSalary: salary[0] ?? null,
    };
  }, [attendance.length, leaves, results.length, salary, timetableSlots.length]);

  if (loading) {
    return <Card className="border-slate-200 bg-white shadow-sm">Loading staff details...</Card>;
  }

  if (error || !staff) {
    return <Card className="border-rose-200 bg-rose-50 shadow-sm text-rose-700">{error || "Staff member not found."}</Card>;
  }

  const isTeacher = staff.role === "Teacher";
  const isCoordinator = staff.isClassCoordinator;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={staff.name}
        description="Staff hub with role-aware profile data, academic relationships, coordinator access, and connected workflow links."
        action={
          <Link to="/dashboard/staff">
            <Button variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
              Back to Staff
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Timetable Slots</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.timetableCount}</p>
          <p className="mt-2 text-sm text-slate-500">Weekly class assignments found</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attendance Sessions</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.attendanceCount}</p>
          <p className="mt-2 text-sm text-slate-500">Subject attendance records linked</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Result Coverage</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.resultCount}</p>
          <p className="mt-2 text-sm text-slate-500">Results mapped through subject relation</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Leave Requests</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.leaveCount}</p>
          <p className="mt-2 text-sm text-slate-500">{summary.pendingLeaves} pending, {summary.approvedLeaves} approved</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Salary Paid</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.totalSalaryPaid}</p>
          <p className="mt-2 text-sm text-slate-500">{summary.unpaidSalaryCount} unpaid records remaining</p>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {staff.photoUrl ? (
            <img
              src={staff.photoUrl}
              alt={staff.name}
              className="h-24 w-24 rounded-3xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-100 text-2xl font-semibold text-slate-500">
              {staff.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Staff Photo</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {staff.photoUrl ? "Profile picture added" : "No picture uploaded"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {staff.photoUrl
                ? "This image is used anywhere the staff profile is shown in the dashboard."
                : "Add a photo URL from the staff form to show the picture here and in the staff list."}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <DetailSection title="Basic Info">
            <DetailField label="Name" value={staff.name} />
            <DetailField label="Email" value={staff.email} />
            <DetailField label="Mobile Number" value={staff.mobileNumber} />
            <DetailField label="Role" value={staff.role} />
            <DetailField label="Date Of Joining" value={staff.dateOfJoining ?? "-"} />
            <DetailField label="Monthly Salary" value={staff.monthlySalary != null ? staff.monthlySalary.toLocaleString() : "-"} />
            <DetailField label="Subject" value={staff.subjectName ?? "Not assigned"} />
            <DetailField label="User ID" value={staff.userId} />
            <DetailField label="Photo" value={staff.photoUrl ? "Uploaded" : "Not added"} />
          </DetailSection>

          <DetailSection title="Role Details">
            <DetailField label="Teacher Access" value={isTeacher ? "Yes" : "No"} />
            <DetailField label="Class Coordinator" value={isCoordinator ? "Yes" : "No"} />
            <DetailField label="Assigned Class" value={staff.assignedClass ?? "-"} />
            <DetailField label="Assigned Section" value={staff.assignedSection ?? "-"} />
            <DetailField
              label="Coordinator Access"
              value={isCoordinator ? "Yes. This staff member can coordinate the assigned class timetable." : "No coordinator access"}
            />
            <DetailField
              label="Role Summary"
              value={
                isTeacher
                  ? `Handles ${staff.subjectName ?? "an assigned subject"}${staff.assignedClass ? ` for ${staff.assignedClass}` : ""}.`
                  : `${staff.role} workflow staff member with ERP access.`
              }
            />
          </DetailSection>

          <Card className="border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Current Salary Status</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {summary.latestSalary ? `${summary.latestSalary.amount} for ${summary.latestSalary.month}` : "No salary record"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {summary.latestSalary
                    ? `${summary.latestSalary.status} salary entry is the most recent payroll record.`
                    : "Create salary entries from the salary module to start payroll history."}
                </p>
              </div>
              {summary.latestSalary ? (
                <span
                  className={
                    summary.latestSalary.status === "Paid"
                      ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                  }
                >
                  {summary.latestSalary.status}
                </span>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employment Snapshot</p>
            <dl className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-slate-500">Mobile Number</dt>
                <dd className="text-sm font-semibold text-slate-900">{staff.mobileNumber}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-slate-500">Date Of Joining</dt>
                <dd className="text-sm font-semibold text-slate-900">{staff.dateOfJoining ?? "-"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-slate-500">Base Monthly Salary</dt>
                <dd className="text-sm font-semibold text-slate-900">{staff.monthlySalary != null ? staff.monthlySalary.toLocaleString() : "-"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-slate-500">Salary Records</dt>
                <dd className="text-sm font-semibold text-slate-900">{summary.salaryCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-slate-500">Approved Leaves</dt>
                <dd className="text-sm font-semibold text-slate-900">{summary.approvedLeaves}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-slate-500">Pending Leaves</dt>
                <dd className="text-sm font-semibold text-slate-900">{summary.pendingLeaves}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-slate-500">Attendance Sessions</dt>
                <dd className="text-sm font-semibold text-slate-900">{summary.attendanceCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-slate-500">Exam Result Sets</dt>
                <dd className="text-sm font-semibold text-slate-900">{summary.resultCount}</dd>
              </div>
            </dl>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Quick Links</h2>
            <p className="mt-2 text-sm text-slate-500">
              Jump into the modules connected to this staff record.
            </p>
            <div className="mt-5 grid gap-4">
              <Link
                to={`/dashboard/timetable${staff.assignedClass && staff.assignedSection ? `?class=${encodeURIComponent(staff.assignedClass)}&section=${encodeURIComponent(staff.assignedSection)}` : ""}`}
                className={quickLinkClassName}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Timetable</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">View Timetable</p>
                <p className="mt-1 text-sm text-slate-500">Open class schedule and teacher slots.</p>
              </Link>
              <Link to={`/dashboard/leaves?staffId=${staff.id}`} className={quickLinkClassName}>
                <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Leaves</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">View Leave History</p>
                <p className="mt-1 text-sm text-slate-500">Review all leave requests linked to this employee.</p>
              </Link>
              <Link to={`/dashboard/salary?staffId=${staff.id}`} className={quickLinkClassName}>
                <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Salary</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">View Salary History</p>
                <p className="mt-1 text-sm text-slate-500">Open payroll records and payment status.</p>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Salary History</h2>
          <p className="mt-2 text-sm text-slate-500">Complete payroll trail for this staff member.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Month</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-slate-500">No salary history found for this staff member.</td>
                </tr>
              ) : (
                salary.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4 text-slate-700">{row.month}</td>
                    <td className="px-6 py-4 text-slate-700">{row.amount}</td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          row.status === "Paid"
                            ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                            : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/dashboard/salary/${row.id}`}>
                        <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Leave History</h2>
          <p className="mt-2 text-sm text-slate-500">Track approved, pending, and rejected leave requests.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">From</th>
                <th className="px-6 py-4 font-medium">To</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-slate-500">No leave history found for this staff member.</td>
                </tr>
              ) : (
                leaves.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4 text-slate-700">{row.startDate}</td>
                    <td className="px-6 py-4 text-slate-700">{row.endDate}</td>
                    <td className="px-6 py-4 text-slate-700">{row.reason ?? "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={getLeaveBadgeClassName(row.status)}
                      >
                        {getLeaveStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/dashboard/leaves/${row.id}`}>
                        <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Academic Activity</h2>
          <p className="mt-2 text-sm text-slate-500">Connected timetable, attendance, and result workload overview.</p>
        </div>
        <div className="grid gap-6 p-6 xl:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Timetable Slots</p>
            <div className="mt-4 space-y-3">
              {timetableSlots.length === 0 ? (
                <p className="text-sm text-slate-500">No timetable slots found.</p>
              ) : (
                timetableSlots.slice(0, 5).map((slot) => (
                  <div key={slot.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{slot.subjectName}</p>
                    <p className="mt-1 text-xs text-slate-500">{slot.day} • {slot.startTime} - {slot.endTime}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent Attendance Sessions</p>
            <div className="mt-4 space-y-3">
              {attendance.length === 0 ? (
                <p className="text-sm text-slate-500">No attendance sessions recorded.</p>
              ) : (
                attendance.slice(0, 5).map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{row.subjectName ?? "Subject"}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.className ?? "-"} / {row.section ?? "-"} • {row.date ?? "-"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent Results Coverage</p>
            <div className="mt-4 space-y-3">
              {results.length === 0 ? (
                <p className="text-sm text-slate-500">No result summaries linked yet.</p>
              ) : (
                results.slice(0, 5).map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{row.examName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.totalMarks} / {row.maxMarks} • {row.percentage}% • {row.finalGrade}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StaffDetailPage;
