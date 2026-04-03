import { useEffect, useMemo, useState } from "react";
import AttendanceStatusToggle from "../../components/attendance/AttendanceStatusToggle";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import { AdminPageHeader, CompactMetricCard } from "./adminPageUtils";
import {
  listEmployees,
  listLeaves,
  listStaffAttendance,
  saveStaffAttendance,
  staffAttendanceStatusOptions,
} from "../../services/adminService";
import { formatMonthLabel, getIndiaTodayIso } from "../../utils/date";
import type {
  EmployeeRecord,
  LeaveRecord,
  StaffAttendanceEntryInput,
  StaffAttendanceRecord,
  StaffAttendanceStatus,
} from "../../types/admin";

type DraftMap = Record<string, StaffAttendanceEntryInput>;

const MetricIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M4 19h16" />
    <path d="M7 16V8" />
    <path d="M12 16V5" />
    <path d="M17 16v-4" />
  </svg>
);

const getStatusBadgeClassName = (status: StaffAttendanceStatus) => {
  switch (status) {
    case "Present":
      return "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700";
    case "Late":
      return "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700";
    case "Half Day":
      return "rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700";
    case "On Leave":
      return "rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700";
    default:
      return "rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700";
  }
};

const StaffAttendancePage = () => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [records, setRecords] = useState<StaffAttendanceRecord[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffAttendanceStatus | "">("");
  const [selectedDate, setSelectedDate] = useState(getIndiaTodayIso());
  const [selectedMonth, setSelectedMonth] = useState(getIndiaTodayIso().slice(0, 7));

  useEffect(() => {
    if (selectedDate.slice(0, 7) !== selectedMonth) {
      setSelectedMonth(selectedDate.slice(0, 7));
    }
  }, [selectedDate, selectedMonth]);

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      try {
        const [employeeData, leaveData] = await Promise.all([listEmployees(), listLeaves()]);
        if (!active) return;
        setEmployees(employeeData);
        setLeaves(leaveData);
        setError("");
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load staff attendance.");
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

  const loadMonthlyAttendance = async (month: string) => {
    const attendance = await listStaffAttendance({ month });
    setRecords(attendance);
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const attendance = await listStaffAttendance({ month: selectedMonth });
        if (!active) return;
        setRecords(attendance);
        setError("");
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load attendance history.");
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedMonth]);

  const leaveKeySet = useMemo(() => {
    const approvedLeaves = leaves.filter((leave) => leave.staffId && leave.status === "Approved");
    const keys = new Set<string>();

    approvedLeaves.forEach((leave) => {
      if (!leave.staffId || !leave.startDate || !leave.endDate) return;
      let cursor = leave.startDate;

      while (cursor <= leave.endDate) {
        keys.add(`${leave.staffId}::${cursor}`);
        const [year, month, day] = cursor.split("-").map(Number);
        const next = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12, 0, 0));
        next.setUTCDate(next.getUTCDate() + 1);
        const nextYear = String(next.getUTCFullYear()).padStart(4, "0");
        const nextMonth = String(next.getUTCMonth() + 1).padStart(2, "0");
        const nextDay = String(next.getUTCDate()).padStart(2, "0");
        cursor = `${nextYear}-${nextMonth}-${nextDay}`;
      }
    });

    return keys;
  }, [leaves]);

  const activeEmployees = useMemo(
    () =>
      employees
        .filter((employee) => !employee.dateOfJoining || employee.dateOfJoining <= selectedDate)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [employees, selectedDate],
  );

  const attendanceByStaffForSelectedDate = useMemo(() => {
    const map = new Map<string, StaffAttendanceRecord>();
    records
      .filter((record) => record.attendanceDate === selectedDate)
      .forEach((record) => map.set(record.staffId, record));
    return map;
  }, [records, selectedDate]);

  useEffect(() => {
    const nextDrafts: DraftMap = {};

    activeEmployees.forEach((employee) => {
      const existing = attendanceByStaffForSelectedDate.get(employee.id);
      const isOnApprovedLeave = leaveKeySet.has(`${employee.id}::${selectedDate}`);

      nextDrafts[employee.id] = {
        staffId: employee.id,
        status: existing?.status === "Absent" || isOnApprovedLeave ? "Absent" : "Present",
        checkInTime: existing?.checkInTime ?? "",
        checkOutTime: existing?.checkOutTime ?? "",
        notes: existing?.notes ?? "",
      };
    });

    setDrafts(nextDrafts);
  }, [activeEmployees, attendanceByStaffForSelectedDate, leaveKeySet, selectedDate]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeEmployees.filter((employee) => {
      const haystack = `${employee.name} ${employee.email} ${employee.mobileNumber} ${employee.role}`.toLowerCase();
      const draftStatus = drafts[employee.id]?.status ?? "";
      return (
        (!query || haystack.includes(query)) &&
        (!roleFilter || employee.role === roleFilter) &&
        (!statusFilter || draftStatus === statusFilter)
      );
    });
  }, [activeEmployees, drafts, roleFilter, search, statusFilter]);

  const historyRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const haystack = `${record.staffName} ${record.role} ${record.notes ?? ""}`.toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!roleFilter || record.role === roleFilter) &&
        (!statusFilter || record.status === statusFilter)
      );
    });
  }, [records, roleFilter, search, statusFilter]);

  const metrics = useMemo(() => {
    const selectedDateRows = records.filter((record) => record.attendanceDate === selectedDate);
    const presentCount = selectedDateRows.filter((record) => record.status === "Present" || record.status === "Late").length;
    const absentCount = selectedDateRows.filter((record) => record.status === "Absent").length;
    const leaveCount = selectedDateRows.filter((record) => record.status === "On Leave").length;
    const markedCount = selectedDateRows.length;

    return {
      totalStaff: activeEmployees.length,
      markedCount,
      presentCount,
      absentCount,
      leaveCount,
      coverage: activeEmployees.length > 0 ? Math.round((markedCount / activeEmployees.length) * 100) : 0,
    };
  }, [activeEmployees.length, records, selectedDate]);

  const handleDraftChange = <K extends keyof StaffAttendanceEntryInput>(
    staffId: string,
    key: K,
    value: StaffAttendanceEntryInput[K],
  ) => {
    setDrafts((current) => ({
      ...current,
      [staffId]: {
        ...(current[staffId] ?? {
          staffId,
          status: "Present",
          checkInTime: "",
          checkOutTime: "",
          notes: "",
        }),
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveStaffAttendance(
        selectedDate,
        Object.values(drafts).sort((left, right) => left.staffId.localeCompare(right.staffId)),
      );
      await loadMonthlyAttendance(selectedMonth);
      setError("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save staff attendance.");
    } finally {
      setSaving(false);
    }
  };

  const roleOptions = Array.from(new Set(employees.map((employee) => employee.role).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff Attendance"
        description="Mark HR-side daily attendance with real database persistence, month-wise history, and role-wise filters."
        action={
          <Button onClick={() => void handleSave()} disabled={saving || activeEmployees.length === 0}>
            {saving ? "Saving..." : "Save Attendance"}
          </Button>
        }
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <CompactMetricCard label="Active Staff" value={String(metrics.totalStaff)} detail="Employees eligible for the selected date." icon={<MetricIcon />} />
        <CompactMetricCard label="Marked Today" value={String(metrics.markedCount)} detail={`${metrics.coverage}% coverage for ${selectedDate}.`} icon={<MetricIcon />} />
        <CompactMetricCard label="Present Or Late" value={String(metrics.presentCount)} detail="Included for payroll-day presence view." icon={<MetricIcon />} />
        <CompactMetricCard label="Absent" value={String(metrics.absentCount)} detail="Employees marked absent on the selected date." icon={<MetricIcon />} />
        <CompactMetricCard label="On Leave" value={String(metrics.leaveCount)} detail="Approved leave or manually marked leave." icon={<MetricIcon />} />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Attendance Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">History Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Search</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StaffAttendanceStatus | "")}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All statuses</option>
              {staffAttendanceStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Daily Attendance Roster</h2>
          <p className="mt-2 text-sm text-slate-500">
            Mark attendance for {selectedDate}. Approved leave is prefilled automatically when available.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Staff</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Check In</th>
                <th className="px-6 py-4 font-medium">Check Out</th>
                <th className="px-6 py-4 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-slate-500">
                    Loading staff roster...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-slate-500">
                    No staff matched the current filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const draft = drafts[employee.id];
                  const isPrefilledLeave = leaveKeySet.has(`${employee.id}::${selectedDate}`);

                  return (
                    <tr key={employee.id}>
                      <td className="px-6 py-4 align-top">
                        <div>
                          <p className="font-semibold text-slate-900">{employee.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{employee.role} • {employee.email}</p>
                          {isPrefilledLeave ? (
                            <p className="mt-2 text-xs font-medium text-violet-700">Approved leave overlaps this date.</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <AttendanceStatusToggle
                          value={draft?.status === "Absent" ? "Absent" : "Present"}
                          onChange={(value) => handleDraftChange(employee.id, "status", value)}
                        />
                      </td>
                      <td className="px-6 py-4 align-top">
                        <input
                          type="time"
                          value={draft?.checkInTime ?? ""}
                          onChange={(event) => handleDraftChange(employee.id, "checkInTime", event.target.value)}
                          className="w-full min-w-[130px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                        />
                      </td>
                      <td className="px-6 py-4 align-top">
                        <input
                          type="time"
                          value={draft?.checkOutTime ?? ""}
                          onChange={(event) => handleDraftChange(employee.id, "checkOutTime", event.target.value)}
                          className="w-full min-w-[130px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                        />
                      </td>
                      <td className="px-6 py-4 align-top">
                        <input
                          type="text"
                          value={draft?.notes ?? ""}
                          onChange={(event) => handleDraftChange(employee.id, "notes", event.target.value)}
                          placeholder="Optional note"
                          className="w-full min-w-[220px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <DataTable
        title="Attendance History"
        description={`Saved records for ${formatMonthLabel(selectedMonth)}.`}
        data={historyRows}
        getRowId={(row) => row.id}
        loading={loading && records.length === 0}
        loadingMessage="Loading attendance history..."
        emptyMessage="No staff attendance records found for the selected month."
        mobileTitle={(row) => row.staffName}
        mobileSubtitle={(row) => `${row.attendanceDate} • ${row.role}`}
        columns={[
          {
            key: "staff",
            label: "Staff",
            emphasis: true,
            render: (row) => (
              <div>
                <p>{row.staffName}</p>
                <p className="mt-1 text-xs text-slate-500">{row.role}</p>
              </div>
            ),
          },
          {
            key: "date",
            label: "Date",
            render: (row) => row.attendanceDate,
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <span className={getStatusBadgeClassName(row.status)}>{row.status}</span>,
          },
          {
            key: "time",
            label: "Time",
            render: (row) => `${row.checkInTime ?? "--:--"} to ${row.checkOutTime ?? "--:--"}`,
          },
          {
            key: "markedBy",
            label: "Marked By",
            render: (row) => row.markedByName ?? "HR / Admin",
          },
          {
            key: "notes",
            label: "Notes",
            render: (row) => row.notes?.trim() || "-",
          },
        ]}
      />
    </div>
  );
};

export default StaffAttendancePage;
