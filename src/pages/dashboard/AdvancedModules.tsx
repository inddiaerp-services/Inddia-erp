import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ActionIconButton from "../../components/ui/ActionIconButton";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import DataTable from "../../components/ui/DataTable";
import AttendanceMonthGridView from "../../components/attendance/AttendanceMonthGrid";
import AttendanceStatusToggle from "../../components/attendance/AttendanceStatusToggle";
import { CrudDetailPage, CrudPage } from "./CrudPage";
import { AdminPageHeader, DetailField, DetailSection } from "./adminPageUtils";
import {
  approveApplicant,
  createApplicant,
  createEmployee,
  createExam,
  createFee,
  createLeave,
  createRoute,
  createSalary,
  createVehicle,
  deleteApplicant,
  deleteEmployee,
  deleteExam,
  deleteFee,
  deleteLeave,
  deleteResult,
  deleteRoute,
  deleteSalary,
  deleteVehicle,
  cancelTimetableImpact,
  getApplicantDetail,
  deleteAttendanceSession,
  getAttendanceGeoSettings,
  getAttendanceMonthGrid,
  getAttendanceDetail,
  getAttendanceSessionDetail,
  getEmployeeDetail,
  getExamDetail,
  getExamGroupDetail,
  getFeeDetail,
  getLeaveImpactDetail,
  getLeaveDetail,
  getExamMarksEntryAvailabilityMessage,
  listExamSubjects,
  getSelectableExamSubjects,
  isExamMarksEntryOpen,
  loadExamMarksSession,
  listNotificationsForUser,
  getResultDetail,
  getRouteDetail,
  getSalaryDetail,
  getStaffByUserId,
  listTimetableTeachers,
  markNotificationAsRead,
  getVehicleDetail,
  listApplicants,
  listAttendance,
  listAttendanceSubjectsFromTimetable,
  listEmployees,
  listExams,
  listExamGroups,
  listFees,
  listLeaves,
  listResults,
  listSalary,
  listStudents,
  listTimetableClassOptions,
  loadMyTeachingTimetable,
  listSubjects,
  listTransportRoutes,
  listVehicles,
  paySalary,
  rejectApplicant,
  rescheduleTimetableImpact,
  reviewLeaveByAdmin,
  reviewLeaveByHr,
  syncUpcomingFeeReminders,
  updateApplicant,
  addFeePayment,
  loadAttendanceRoster,
  saveExamSubjects,
  saveAttendanceSession,
  saveExamMarksSession,
  updateEmployee,
  updateExam,
  updateFee,
  updateLeave,
  updateRoute,
  updateSalary,
  updateVehicle,
} from "../../services/adminService";
import { authStore } from "../../store/authStore";
import { ROLES } from "../../config/roles";
import { normalizeStaffWorkspace, STAFF_WORKSPACES, type StaffWorkspace } from "../../config/staffWorkspaces";
import type {
  ApplicantRecord,
  AttendanceGeoSettings,
  AttendanceSession,
  EmployeeRecord,
  ExamFormValues,
  ExamGroupDetail,
  ExamGroupRecord,
  ExamMarksSession,
  ExamRecord,
  ExamSubjectFormValue,
  ExamSubjectOption,
  FeeRecord,
  LeaveImpactDetail,
  LeaveRecord,
  NotificationRecord,
  ResultRecord,
  RouteRecord,
  SalaryRecord,
  StaffRecord,
  TimetableImpactRecord,
  VehicleRecord,
} from "../../types/admin";
import { formatMonthLabel, formatShortDateFromDateString, getIndiaTodayIso, getWeekdayFromDateString } from "../../utils/date";

type Option = { label: string; value: string };
type AttendanceSessionSummary = {
  id: string;
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
  date: string;
  studentCount: number;
  presentCount: number;
  absentCount: number;
};

const ATTENDANCE_LOCATION_STORAGE_KEY = "inddia-attendance-location";

const calculateDistanceMeters = (latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
};

const getCurrentBrowserLocation = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser does not support GPS location."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });

const readStoredAttendanceLocation = (): AttendanceSession["teacherLocation"] => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ATTENDANCE_LOCATION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AttendanceSession["teacherLocation"];
    if (
      parsed &&
      typeof parsed.latitude === "number" &&
      Number.isFinite(parsed.latitude) &&
      typeof parsed.longitude === "number" &&
      Number.isFinite(parsed.longitude)
    ) {
      return parsed;
    }
  } catch {
    // Ignore invalid cached location.
  }

  window.localStorage.removeItem(ATTENDANCE_LOCATION_STORAGE_KEY);
  return null;
};

const writeStoredAttendanceLocation = (location: AttendanceSession["teacherLocation"]) => {
  if (typeof window === "undefined") return;
  if (!location) {
    window.localStorage.removeItem(ATTENDANCE_LOCATION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ATTENDANCE_LOCATION_STORAGE_KEY, JSON.stringify(location));
};

const IMPACT_TIME_OPTIONS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

const EXAM_TIME_WINDOWS: Record<"Full Day" | "Morning" | "Afternoon", { startTime: string; endTime: string }> = {
  "Full Day": { startTime: "08:00", endTime: "16:30" },
  Morning: { startTime: "08:00", endTime: "12:30" },
  Afternoon: { startTime: "13:30", endTime: "16:30" },
};

const getExamTimeWindow = (examSession: "Full Day" | "Morning" | "Afternoon") => EXAM_TIME_WINDOWS[examSession];

const createExamSubjectFormValue = (
  subject: Pick<ExamSubjectOption, "subjectId" | "subjectName" | "teacherName">,
  examDate: string,
  examSession: "Full Day" | "Morning" | "Afternoon" = "Morning",
  maxMarks = "100",
) => {
  const examWindow = getExamTimeWindow(examSession);
  return {
    subjectId: subject.subjectId,
    subjectName: subject.subjectName,
    teacherName: subject.teacherName,
    examDate,
    examSession,
    startTime: examWindow.startTime,
    endTime: examWindow.endTime,
    maxMarks,
  };
};

const deriveExamSummaryFromSubjects = (subjects: ExamFormValues["subjects"]) => {
  const validSubjects = subjects.filter((item) => item.examDate);
  if (validSubjects.length === 0) return null;

  const sortedDates = validSubjects.map((item) => item.examDate).sort((left, right) => left.localeCompare(right));
  const sessionSet = new Set(validSubjects.map((item) => item.examSession));

  return {
    startDate: sortedDates[0],
    endDate: sortedDates[sortedDates.length - 1],
    examSession: sessionSet.size === 1 ? validSubjects[0].examSession : ("Full Day" as const),
  };
};

type ExamSubjectEditorRow = ExamSubjectOption & {
  selectedConfig: ExamSubjectFormValue | null;
};

const formatExamTimeRange = (startTime: string | null | undefined, endTime: string | null | undefined) =>
  startTime && endTime ? `${startTime} - ${endTime}` : "Time follows the selected session";

const mergeExamSubjectEditorRows = (
  availableSubjects: ExamSubjectOption[],
  selectedSubjects: ExamFormValues["subjects"],
): ExamSubjectEditorRow[] => {
  const selectedMap = new Map(selectedSubjects.map((item) => [item.subjectId, item]));
  const mergedSubjects = [...availableSubjects];
  const existingIds = new Set(availableSubjects.map((item) => item.subjectId));

  selectedSubjects.forEach((subject) => {
    if (existingIds.has(subject.subjectId)) return;
    mergedSubjects.push({
      subjectId: subject.subjectId,
      subjectName: subject.subjectName ?? "Unknown subject",
      maxMarks: Number(subject.maxMarks || "100"),
      teacherId: null,
      teacherName: subject.teacherName ?? null,
      examDate: subject.examDate,
      examSession: subject.examSession,
      startTime: subject.startTime,
      endTime: subject.endTime,
    });
  });

  return mergedSubjects.map((subject) => ({
    ...subject,
    selectedConfig: selectedMap.get(subject.subjectId) ?? null,
  }));
};

const ExamPaperScheduleEditor = ({
  rows,
  loading,
  emptyMessage,
  defaultExamDate,
  onToggle,
  onUpdate,
}: {
  rows: ExamSubjectEditorRow[];
  loading: boolean;
  emptyMessage: string;
  defaultExamDate: string;
  onToggle: (subject: ExamSubjectEditorRow, checked: boolean, defaultExamDate: string) => void;
  onUpdate: (
    subjectId: string,
    field: keyof Pick<ExamSubjectFormValue, "examDate" | "examSession" | "maxMarks">,
    value: string,
  ) => void;
}) => {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading timetable subjects...</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {rows.map((subject) => {
        const selected = subject.selectedConfig;

        return (
          <div key={subject.subjectId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(selected)}
                  onChange={(event) => onToggle(subject, event.target.checked, defaultExamDate)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{subject.subjectName}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {subject.teacherName ? `Teacher: ${subject.teacherName}` : "Teacher not linked from timetable"}
                  </span>
                </span>
              </label>
              {selected ? (
                <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {selected.examSession} • {formatExamTimeRange(selected.startTime, selected.endTime)}
                </span>
              ) : null}
            </div>

            {selected ? (
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <Input
                  label="Exam Date"
                  type="date"
                  value={selected.examDate}
                  required
                  onChange={(event) => onUpdate(subject.subjectId, "examDate", event.target.value)}
                />
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Session</span>
                  <select
                    value={selected.examSession}
                    onChange={(event) => onUpdate(subject.subjectId, "examSession", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="Morning">Morning Exam</option>
                    <option value="Afternoon">Afternoon Exam</option>
                    <option value="Full Day">Full Day Exam</option>
                  </select>
                </label>
                <Input
                  label="Exam Time"
                  value={formatExamTimeRange(selected.startTime, selected.endTime)}
                  disabled
                />
                <Input
                  label="Max Marks"
                  type="text"
                  inputMode="numeric"
                  value={selected.maxMarks}
                  onChange={(event) => onUpdate(subject.subjectId, "maxMarks", event.target.value)}
                  placeholder="100"
                />
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Enable this subject to add its paper date, session, and maximum marks.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

const useDetailRecord = <T,>(load: (id: string) => Promise<T>) => {
  const { id = "" } = useParams();
  const [record, setRecord] = useState<T | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setRecord(await load(id));
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load record.");
      }
    };
    void run();
  }, [id, load]);

  return { id, record, error };
};

const ErrorCard = ({ error }: { error: string }) =>
  error ? (
    <Card className="border-rose-200 bg-rose-50 shadow-sm">
      <p className="text-sm text-rose-700">{error}</p>
    </Card>
  ) : null;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const getStatusBadgeClassName = (status: string | null | undefined, palette: {
  positive: string;
  warning: string;
  negative: string;
}) => {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "paid" || normalized === "approved" || normalized === "active") return palette.positive;
  if (normalized === "partial" || normalized === "pending" || normalized === "maintenance") return palette.warning;
  return palette.negative;
};

const leaveStatusMeta: Record<LeaveRecord["status"], { label: string; className: string; stage: string }> = {
  Pending_HR: {
    label: "Sent To HR",
    className: "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700",
    stage: "HR Review Pending",
  },
  Rejected_By_HR: {
    label: "Rejected By HR",
    className: "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700",
    stage: "Closed At HR Stage",
  },
  Pending_Admin: {
    label: "Sent To Admin",
    className: "rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700",
    stage: "Admin Review Pending",
  },
  Approved: {
    label: "Approved",
    className: "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700",
    stage: "Final Approval Complete",
  },
  Rejected_By_Admin: {
    label: "Rejected By Admin",
    className: "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700",
    stage: "Closed At Admin Stage",
  },
};

const leaveTimelineSteps = [
  { key: "requested", title: "Requested", description: "Staff submitted the leave request." },
  { key: "hr", title: "HR Review", description: "HR reviews the request and decides whether to forward it." },
  { key: "admin", title: "Admin Review", description: "Admin gives the final approval or rejection." },
  { key: "final", title: "Final Status", description: "The leave request reaches its final decision." },
] as const;

const getLeaveTimelineState = (
  status: LeaveRecord["status"],
): Record<(typeof leaveTimelineSteps)[number]["key"], "complete" | "current" | "upcoming"> => {
  switch (status) {
    case "Pending_HR":
      return { requested: "complete", hr: "current", admin: "upcoming", final: "upcoming" };
    case "Pending_Admin":
      return { requested: "complete", hr: "complete", admin: "current", final: "upcoming" };
    case "Approved":
    case "Rejected_By_Admin":
      return { requested: "complete", hr: "complete", admin: "complete", final: "complete" };
    case "Rejected_By_HR":
      return { requested: "complete", hr: "complete", admin: "upcoming", final: "complete" };
    default:
      return { requested: "complete", hr: "current", admin: "upcoming", final: "upcoming" };
  }
};

const getLeaveTimelineDotClassName = (state: "complete" | "current" | "upcoming") => {
  if (state === "complete") return "border-emerald-500 bg-emerald-500";
  if (state === "current") return "border-brand-500 bg-brand-100";
  return "border-slate-300 bg-white";
};

const getLeaveTimelineCardClassName = (state: "complete" | "current" | "upcoming") => {
  if (state === "complete") return "border-emerald-200 bg-emerald-50";
  if (state === "current") return "border-brand-200 bg-brand-50";
  return "border-slate-200 bg-white";
};

const impactStatusBadgeClassName: Record<TimetableImpactRecord["status"], string> = {
  Pending_Action: "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700",
  Rescheduled: "rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700",
  Cancelled: "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700",
};

const useStaffWorkspace = () => {
  const { role, user } = authStore();
  const [workspace, setWorkspace] = useState<StaffWorkspace>(STAFF_WORKSPACES.TEACHER);

  useEffect(() => {
    let active = true;

    if (role !== ROLES.STAFF || !user?.id) {
      setWorkspace(STAFF_WORKSPACES.TEACHER);
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const staff = await getStaffByUserId(user.id);
        if (active) {
          setWorkspace(normalizeStaffWorkspace(staff?.role));
        }
      } catch {
        if (active) {
          setWorkspace(STAFF_WORKSPACES.TEACHER);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [role, user?.id]);

  return workspace;
};

export const AttendancePage = () => {
  const role = authStore((state) => state.role);
  const user = authStore((state) => state.user);
  const isStaffUser = role === ROLES.STAFF;
  const [searchParams] = useSearchParams();
  const [classOptions, setClassOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [sectionOptions, setSectionOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ label: string; value: string; teacherId: string | null; teacherName: string | null }>>([]);
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState(getIndiaTodayIso().slice(0, 7));
  const [filterSubject, setFilterSubject] = useState("");
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [savedSessions, setSavedSessions] = useState<AttendanceSessionSummary[]>([]);
  const [monthGrid, setMonthGrid] = useState<Awaited<ReturnType<typeof getAttendanceMonthGrid>> | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [loadingSavedSessions, setLoadingSavedSessions] = useState(false);
  const [loadingMonthGrid, setLoadingMonthGrid] = useState(false);
  const [loadingGeoSettings, setLoadingGeoSettings] = useState(false);
  const [checkingGeoStatus, setCheckingGeoStatus] = useState(false);
  const [teacherStaffId, setTeacherStaffId] = useState<string | null>(null);
  const [attendanceGeoSettings, setAttendanceGeoSettings] = useState<AttendanceGeoSettings | null>(null);
  const [verifiedTeacherLocation, setVerifiedTeacherLocation] = useState<AttendanceSession["teacherLocation"]>(() => readStoredAttendanceLocation());
  const [geoStatus, setGeoStatus] = useState("");
  const [teacherGeoAllowed, setTeacherGeoAllowed] = useState(false);
  const [teacherGeoChecked, setTeacherGeoChecked] = useState(false);
  const [geoToast, setGeoToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const geoToastTimeoutRef = useRef<number | null>(null);
  const [error, setError] = useState("");
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isStaffUser || !user?.id) {
      setTeacherStaffId(null);
      return;
    }

    let active = true;
    void getStaffByUserId(user.id)
      .then((staff) => {
        if (!active) return;
        setTeacherStaffId(staff?.id ?? null);
      })
      .catch(() => {
        if (!active) return;
        setTeacherStaffId(null);
      });

    return () => {
      active = false;
    };
  }, [isStaffUser, user?.id]);

  useEffect(() => {
    if (!isStaffUser) {
      setAttendanceGeoSettings(null);
      setVerifiedTeacherLocation(null);
      writeStoredAttendanceLocation(null);
      setGeoStatus("");
      setTeacherGeoAllowed(true);
      setTeacherGeoChecked(true);
      return;
    }

    let active = true;
    setLoadingGeoSettings(true);

    void getAttendanceGeoSettings()
      .then((settings) => {
        if (!active) return;
        setAttendanceGeoSettings(settings);
        if (settings.isEnabled) {
          setVerifiedTeacherLocation(null);
          writeStoredAttendanceLocation(null);
          setGeoStatus(`School GPS attendance is active within ${Math.round(settings.radiusMeters ?? 0)} meters.`);
          setTeacherGeoAllowed(false);
          setTeacherGeoChecked(false);
          return;
        }
        if (settings.mapLink) {
          setGeoStatus("School GPS attendance is partially configured. Complete the map link and radius in super admin settings.");
          setTeacherGeoAllowed(true);
          setTeacherGeoChecked(true);
          return;
        }
        setGeoStatus("School GPS attendance is not configured for this school.");
        setTeacherGeoAllowed(true);
        setTeacherGeoChecked(true);
      })
      .catch((loadError) => {
        if (!active) return;
        setGeoStatus(loadError instanceof Error ? loadError.message : "Unable to load school GPS attendance settings.");
        setTeacherGeoAllowed(false);
        setTeacherGeoChecked(true);
      })
      .finally(() => {
        if (active) setLoadingGeoSettings(false);
      });

    return () => {
      active = false;
    };
  }, [isStaffUser]);

  useEffect(() => {
    void (async () => {
      try {
        if (isStaffUser && !user?.id) {
          setClassOptions([]);
          setFilterClass("");
          return;
        }

        if (isStaffUser && user?.id) {
          const teacherSlots = await loadMyTeachingTimetable(user.id);
          const classMap = new Map<string, Set<string>>();
          teacherSlots
            .filter((slot) => !slot.isBreak && !slot.isCancelled)
            .forEach((slot) => {
              const key = slot.className;
              const sections = classMap.get(key) ?? new Set<string>();
              sections.add(slot.section);
              classMap.set(key, sections);
            });
          const teacherClassRows = Array.from(classMap.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([className, sections]) => ({
              className,
              sections: Array.from(sections).sort((left, right) => left.localeCompare(right)),
            }));
          setClassOptions(teacherClassRows.map((item) => ({ label: item.className, value: item.className })));
          const queryClass = searchParams.get("class");
          const defaultClass = queryClass && teacherClassRows.some((item) => item.className === queryClass)
            ? queryClass
            : teacherClassRows[0]?.className ?? "";
          setFilterClass(defaultClass);
          return;
        }

        const classRows = await listTimetableClassOptions();
        setClassOptions(classRows.map((item) => ({ label: item.className, value: item.className })));
        const queryClass = searchParams.get("class");
        const defaultClass = queryClass && classRows.some((item) => item.className === queryClass)
          ? queryClass
          : classRows[0]?.className ?? "";
        setFilterClass(defaultClass);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load attendance filters.");
      }
    })();
  }, [isStaffUser, searchParams, user?.id]);

  useEffect(() => {
    void (async () => {
      try {
        if (isStaffUser && !user?.id) {
          setSectionOptions([]);
          setFilterSection("");
          return;
        }

        if (isStaffUser && user?.id) {
          const teacherSlots = await loadMyTeachingTimetable(user.id);
          const selectedSections = Array.from(
            new Set(
              teacherSlots
                .filter((slot) => !slot.isBreak && !slot.isCancelled && slot.className === filterClass)
                .map((slot) => slot.section),
            ),
          ).sort((left, right) => left.localeCompare(right));
          setSectionOptions(selectedSections.map((section) => ({ label: section, value: section })));
          const querySection = searchParams.get("section");
          setFilterSection((current) => {
            if (current && selectedSections.includes(current)) return current;
            if (querySection && selectedSections.includes(querySection)) return querySection;
            return selectedSections[0] ?? "";
          });
          return;
        }

        const classRows = await listTimetableClassOptions();
        const selectedClass = classRows.find((item) => item.className === filterClass);
        const sections = selectedClass?.sections ?? [];
        setSectionOptions(sections.map((section) => ({ label: section, value: section })));
        const querySection = searchParams.get("section");
        setFilterSection((current) => {
          if (current && sections.includes(current)) return current;
          if (querySection && sections.includes(querySection)) return querySection;
          return sections[0] ?? "";
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load sections.");
      }
    })();
  }, [filterClass, isStaffUser, searchParams, user?.id]);

  useEffect(() => {
    if (!filterClass || !filterSection) {
      setSubjects([]);
      setFilterSubject("");
      return;
    }
    void (async () => {
      let filteredItems;

      if (isStaffUser) {
        if (!user?.id || !teacherStaffId) {
          setSubjects([]);
          setFilterSubject("");
          return;
        }

        const teacherSlots = await loadMyTeachingTimetable(user.id);
        const selectedDay = filterDate ? getWeekdayFromDateString(filterDate) : null;
        filteredItems = Array.from(
          new Map(
            teacherSlots
              .filter((slot) => !slot.isBreak && !slot.isCancelled)
              .filter((slot) => slot.className === filterClass && slot.section === filterSection)
              .filter((slot) => (selectedDay ? slot.day === selectedDay : true))
              .filter((slot) => slot.subjectId && slot.teacherId === teacherStaffId)
              .map((slot) => [
                slot.subjectId!,
                {
                  subjectId: slot.subjectId!,
                  subjectName: slot.subjectName,
                  teacherId: slot.teacherId,
                  teacherName: slot.teacherName,
                },
              ]),
          ).values(),
        );
      } else {
        const items = await listAttendanceSubjectsFromTimetable(filterClass, filterSection, filterDate || undefined);
        filteredItems = items;
      }

      const options = filteredItems.map((item) => ({
        label: item.teacherName ? `${item.subjectName} (${item.teacherName})` : item.subjectName,
        value: item.subjectId,
        teacherId: item.teacherId,
        teacherName: item.teacherName,
      }));
      setSubjects(options);
      setFilterSubject((current) => (options.some((option) => option.value === current) ? current : options[0]?.value ?? ""));
    })();
  }, [filterClass, filterSection, filterDate, isStaffUser, teacherStaffId, user?.id]);

  const showGeoToast = useCallback((message: string, tone: "success" | "error") => {
    if (geoToastTimeoutRef.current) {
      window.clearTimeout(geoToastTimeoutRef.current);
    }
    setGeoToast({ message, tone });
    geoToastTimeoutRef.current = window.setTimeout(() => {
      setGeoToast((current) => (current?.message === message ? null : current));
      geoToastTimeoutRef.current = null;
    }, 5000);
  }, []);

  useEffect(
    () => () => {
      if (geoToastTimeoutRef.current) {
        window.clearTimeout(geoToastTimeoutRef.current);
      }
    },
    [],
  );

  const verifyTeacherLocation = useCallback(async () => {
    if (!isStaffUser) return null;

    setCheckingGeoStatus(true);
    try {
      const position = await getCurrentBrowserLocation();
      const teacherLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      };

      if (
        !attendanceGeoSettings?.isEnabled ||
        attendanceGeoSettings.latitude == null ||
        attendanceGeoSettings.longitude == null ||
        attendanceGeoSettings.radiusMeters == null
      ) {
        setVerifiedTeacherLocation(teacherLocation);
        writeStoredAttendanceLocation(teacherLocation);
        setGeoStatus("Live location captured. This school does not currently enforce GPS attendance blocking.");
        setTeacherGeoAllowed(true);
        setTeacherGeoChecked(true);
        showGeoToast("Location verified.", "success");
        return teacherLocation;
      }

      const distanceMeters = calculateDistanceMeters(
        attendanceGeoSettings.latitude,
        attendanceGeoSettings.longitude,
        teacherLocation.latitude,
        teacherLocation.longitude,
      );

      if (distanceMeters > attendanceGeoSettings.radiusMeters) {
        setVerifiedTeacherLocation(null);
        writeStoredAttendanceLocation(null);
        const message = "You are not in school so you cant mark attendance.";
        setGeoStatus(message);
        setTeacherGeoAllowed(false);
        setTeacherGeoChecked(true);
        showGeoToast(message, "error");
        throw new Error(message);
      }

      setVerifiedTeacherLocation(teacherLocation);
      writeStoredAttendanceLocation(teacherLocation);
      setGeoStatus(`Location verified. You are within the school radius at about ${Math.round(distanceMeters)} meters from the mapped point.`);
      setTeacherGeoAllowed(true);
      setTeacherGeoChecked(true);
      showGeoToast("You are in school. Attendance is unlocked.", "success");
      return teacherLocation;
    } catch (geoError: unknown) {
      const hasGeolocationErrorShape =
        typeof geoError === "object" &&
        geoError !== null &&
        "code" in geoError &&
        typeof (geoError as { code?: unknown }).code === "number";

      if (hasGeolocationErrorShape) {
        const code = (geoError as { code: number }).code;
        const geoMessage =
          code === 1
            ? "Location permission was denied. Allow GPS access to mark attendance."
            : code === 3
              ? "Location request timed out. Try again in an open area with GPS enabled."
              : "Unable to get your current location. Try again.";
        setGeoStatus(geoMessage);
        setVerifiedTeacherLocation(null);
        writeStoredAttendanceLocation(null);
        setTeacherGeoAllowed(false);
        setTeacherGeoChecked(true);
        showGeoToast(geoMessage, "error");
        throw new Error(geoMessage);
      }

      const message = geoError instanceof Error ? geoError.message : "Unable to verify your current location.";
      setGeoStatus(message);
      setVerifiedTeacherLocation(null);
      writeStoredAttendanceLocation(null);
      setTeacherGeoAllowed(false);
      setTeacherGeoChecked(true);
      showGeoToast(message, "error");
      throw new Error(message);
    } finally {
      setCheckingGeoStatus(false);
    }
  }, [attendanceGeoSettings, isStaffUser, showGeoToast]);

  useEffect(() => {
    if (!isStaffUser || !attendanceGeoSettings?.isEnabled) return;
    void verifyTeacherLocation().catch(() => undefined);
  }, [attendanceGeoSettings, isStaffUser, verifyTeacherLocation]);

  const teacherAttendanceLocked =
    isStaffUser &&
    Boolean(attendanceGeoSettings?.isEnabled) &&
    (!teacherGeoChecked || !teacherGeoAllowed);

  useEffect(() => {
    if (!teacherAttendanceLocked) return;
    setSession(null);
    setEditedIds(new Set());
  }, [teacherAttendanceLocked]);

  const loadSavedSessions = useCallback(async () => {
    if (isStaffUser && !teacherStaffId) {
      setSavedSessions([]);
      return;
    }
    if (!isStaffUser && (!filterClass || !filterSection)) {
      setSavedSessions([]);
      return;
    }

    setLoadingSavedSessions(true);
    try {
      const records = await listAttendance({
        className: isStaffUser ? undefined : filterClass || undefined,
        section: isStaffUser ? undefined : filterSection || undefined,
        date: filterDate || undefined,
        subjectId: filterSubject || undefined,
        teacherId: isStaffUser ? teacherStaffId ?? undefined : undefined,
      });

      const grouped = Array.from(
        records.reduce((map, record) => {
          if (!record.className || !record.section || !record.subjectId || !record.subjectName || !record.date) {
            return map;
          }

          const key = `${record.className}::${record.section}::${record.subjectId}::${record.date}`;
          const existing = map.get(key);

          if (existing) {
            existing.studentCount += 1;
            if (record.status === "Present") existing.presentCount += 1;
            if (record.status === "Absent") existing.absentCount += 1;
            return map;
          }

          map.set(key, {
            id: record.id,
            className: record.className,
            section: record.section,
            subjectId: record.subjectId,
            subjectName: record.subjectName,
            date: record.date,
            studentCount: 1,
            presentCount: record.status === "Present" ? 1 : 0,
            absentCount: record.status === "Absent" ? 1 : 0,
          });
          return map;
        }, new Map<string, AttendanceSessionSummary>()),
      )
        .map(([, value]) => value)
        .sort((a, b) => b.date.localeCompare(a.date) || a.subjectName.localeCompare(b.subjectName));

      setSavedSessions(grouped);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load saved attendance.");
    } finally {
      setLoadingSavedSessions(false);
    }
  }, [filterClass, filterSection, filterDate, filterSubject, isStaffUser, teacherStaffId]);

  useEffect(() => {
    void loadSavedSessions();
  }, [loadSavedSessions]);

  useEffect(() => {
    if (!filterMonth) {
      setMonthGrid(null);
      return;
    }
    if (isStaffUser && !teacherStaffId) {
      setMonthGrid(null);
      return;
    }
    if (!isStaffUser && (!filterClass || !filterSection)) {
      setMonthGrid(null);
      return;
    }

    void (async () => {
      setLoadingMonthGrid(true);
      try {
        setMonthGrid(
          await getAttendanceMonthGrid({
            month: filterMonth,
            className: isStaffUser ? undefined : filterClass,
            section: isStaffUser ? undefined : filterSection,
            teacherId: isStaffUser ? teacherStaffId ?? undefined : undefined,
          }),
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load attendance calendar.");
      } finally {
        setLoadingMonthGrid(false);
      }
    })();
  }, [filterClass, filterSection, filterMonth, isStaffUser, teacherStaffId]);

  const handleLoad = async () => {
    if (!filterClass || !filterSection || !filterDate || !filterSubject) {
      setError("Class, section, date, and subject are required.");
      return;
    }
    if (teacherAttendanceLocked) {
      setError("You are not in school so you cant mark attendance.");
      return;
    }
    setLoadingSession(true);
    try {
      const data = await loadAttendanceRoster({
        className: filterClass,
        section: filterSection,
        date: filterDate,
        subjectId: filterSubject,
      });
      setSession(data);
      setEditedIds(new Set());
      setError("");
      await loadSavedSessions();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load attendance roster.");
      setSession(null);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleOpenGridCell = async (date: string, subjectId: string) => {
    if (teacherAttendanceLocked) {
      setError("You are not in school so you cant mark attendance.");
      return;
    }
    setFilterDate(date);
    setFilterSubject(subjectId);
    setLoadingSession(true);
    try {
      const data = await loadAttendanceRoster({
        className: filterClass,
        section: filterSection,
        date,
        subjectId,
      });
      setSession(data);
      setEditedIds(new Set());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load attendance session.");
    } finally {
      setLoadingSession(false);
    }
  };

  const handleStatusChange = (studentId: string, status: "Present" | "Absent") => {
    if (teacherAttendanceLocked) return;
    setSession((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) =>
              row.studentId === studentId ? { ...row, status, changed: true } : row,
            ),
          }
        : current,
    );
    setEditedIds((current) => new Set(current).add(studentId));
  };

  const handleSave = async () => {
    if (!session) return;
    if (teacherAttendanceLocked) {
      setError("You are not in school so you cant mark attendance.");
      return;
    }
    setSavingSession(true);
    try {
      const teacherLocation = isStaffUser ? (await verifyTeacherLocation()) ?? verifiedTeacherLocation ?? readStoredAttendanceLocation() : null;
      if (isStaffUser && attendanceGeoSettings?.isEnabled && !teacherLocation) {
        throw new Error("Allow location access to mark attendance for this school.");
      }
      const saved = await saveAttendanceSession({
        ...session,
        teacherLocation: teacherLocation ?? null,
        ...(teacherLocation
          ? {
              teacherLatitude: teacherLocation.latitude,
              teacherLongitude: teacherLocation.longitude,
            }
          : {}),
      } as AttendanceSession & { teacherLatitude?: number; teacherLongitude?: number });
      setSession(saved);
      setEditedIds(new Set());
      setError("");
      await loadSavedSessions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save attendance.");
    } finally {
      setSavingSession(false);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    if (!window.confirm("Delete attendance for this class, subject, and date?")) return;
    setSavingSession(true);
    try {
      await deleteAttendanceSession(session.className, session.section, session.subjectId, session.date);
      setSession(null);
      setEditedIds(new Set());
      await loadSavedSessions();
      setError("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete attendance.");
    } finally {
      setSavingSession(false);
    }
  };

  const handleEditSession = async (summary: AttendanceSessionSummary) => {
    setLoadingSession(true);
    try {
      const data = await getAttendanceSessionDetail(
        summary.className,
        summary.section,
        summary.subjectId,
        summary.date,
      );
      setFilterClass(summary.className);
      setFilterSection(summary.section);
      setFilterDate(summary.date);
      setFilterSubject(summary.subjectId);
      setSession(data);
      setEditedIds(new Set());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load attendance session.");
    } finally {
      setLoadingSession(false);
    }
  };

  const handleDeleteSavedSession = async (summary: AttendanceSessionSummary) => {
    if (!window.confirm("Delete this saved attendance session?")) return;
    setSavingSession(true);
    try {
      await deleteAttendanceSession(summary.className, summary.section, summary.subjectId, summary.date);
      if (
        session &&
        session.className === summary.className &&
        session.section === summary.section &&
        session.subjectId === summary.subjectId &&
        session.date === summary.date
      ) {
        setSession(null);
        setEditedIds(new Set());
      }
      await loadSavedSessions();
      setError("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete attendance.");
    } finally {
      setSavingSession(false);
    }
  };

  const attendanceSummary = useMemo(() => {
    if (!session) return null;
    const presentCount = session.rows.filter((row) => row.status === "Present").length;
    return {
      total: session.rows.length,
      present: presentCount,
      absent: session.rows.length - presentCount,
    };
  }, [session]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Attendance"
        description="Load students by class and section, fetch subjects from the timetable, and save subject-wise attendance without duplicates."
        action={
          isStaffUser ? (
            <Button
              type="button"
              className={
                checkingGeoStatus
                  ? "w-full bg-slate-500 text-white hover:bg-slate-600 md:w-auto"
                  : teacherGeoChecked && teacherGeoAllowed
                    ? "w-full bg-emerald-600 text-white hover:bg-emerald-700 md:w-auto"
                    : teacherGeoChecked && !teacherGeoAllowed
                      ? "w-full bg-rose-600 text-white hover:bg-rose-700 md:w-auto"
                      : "w-full bg-amber-500 text-white hover:bg-amber-600 md:w-auto"
              }
              onClick={() => {
                void verifyTeacherLocation().catch(() => undefined);
              }}
              disabled={loadingGeoSettings || checkingGeoStatus}
            >
              {checkingGeoStatus ? "Checking location..." : "Check My Location"}
            </Button>
          ) : null
        }
      />

      {!isStaffUser ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 md:grid-cols-6">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Class</span>
              <select
                value={filterClass}
                onChange={(event) => setFilterClass(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Select Class</option>
                {classOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Section</span>
              <select
                value={filterSection}
                onChange={(event) => setFilterSection(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Select Section</option>
                {sectionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <Input label="Date" type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            <Input label="Month" type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Subject</span>
              <select
                value={filterSubject}
                onChange={(event) => setFilterSubject(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Select Subject</option>
                {subjects.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <Button onClick={() => void handleLoad()} disabled={loadingSession || loadingGeoSettings || checkingGeoStatus || teacherAttendanceLocked}>
                {loadingSession ? "Loading..." : "Load Students"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      {geoToast ? (
        <div className="fixed right-6 top-24 z-50 max-w-sm">
          <div
            className={`rounded-3xl border px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)] ${
              geoToast.tone === "success"
                ? "border-emerald-200 bg-emerald-50/95 text-emerald-950"
                : "border-rose-200 bg-rose-50/95 text-rose-950"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  geoToast.tone === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                }`}
              >
                {geoToast.tone === "success" ? "OK" : "!"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {geoToast.tone === "success" ? "Location Verified" : "Location Check Failed"}
                </p>
                <p className="mt-1 text-sm leading-5 opacity-90">{geoToast.message}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Attendance Calendar</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monthly timetable-style view for {formatMonthLabel(filterMonth)}. Exam dates are blocked here the same way they appear in timetable.
          </p>
        </div>
        {loadingMonthGrid ? (
          <div className="flex min-h-[220px] items-center justify-center text-slate-500">Loading attendance calendar...</div>
        ) : monthGrid ? (
          <AttendanceMonthGridView
            grid={monthGrid}
            mode={isStaffUser ? "teacher" : "class"}
            onCellClick={(date, slot) => {
              if (!slot.subjectId) return;
              if (isStaffUser) {
                setFilterClass(slot.className);
                setFilterSection(slot.section);
              }
              void handleOpenGridCell(date, slot.subjectId);
            }}
          />
        ) : (
          <div className="flex min-h-[220px] items-center justify-center text-slate-500">
            {isStaffUser ? "No timetable slots found for this teacher in the selected month." : "Select class and section to load the attendance calendar."}
          </div>
        )}
      </Card>

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        {!session ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-slate-500">
            {isStaffUser ? "Select a class period from your timetable calendar to load students." : "Select class, section, date, and subject from timetable, then load students."}
          </div>
        ) : session.rows.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-slate-500">
            No students found for this class and section.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Student Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {session.rows.map((row) => (
                  <tr key={row.studentId} className={editedIds.has(row.studentId) ? "bg-brand-50/50" : "hover:bg-slate-50"}>
                    <td className="px-6 py-4 font-medium text-slate-900">{row.studentName}</td>
                    <td className="px-6 py-4">
                      <AttendanceStatusToggle
                        value={row.status}
                        onChange={(value) => handleStatusChange(row.studentId, value)}
                        disabled={teacherAttendanceLocked}
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {row.attendanceId ? (
                        <Link to={`/dashboard/attendance/${row.attendanceId}`} className="inline-flex">
                          <ActionIconButton action="view" />
                        </Link>
                      ) : (
                        "Pending save"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {session ? (
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            className="bg-rose-50 text-rose-700 hover:bg-rose-100"
            onClick={() => void handleDelete()}
            disabled={savingSession || teacherAttendanceLocked}
          >
            Delete Attendance
          </Button>
          <Button onClick={() => void handleSave()} disabled={savingSession || checkingGeoStatus || loadingGeoSettings || teacherAttendanceLocked}>
            {savingSession ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      ) : null}

      {session && attendanceSummary ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Session</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {session.className} / {session.section}
              </p>
              <p className="mt-1 text-sm text-slate-600">{session.subjectName}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Present</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{attendanceSummary.present}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Absent</p>
              <p className="mt-2 text-2xl font-semibold text-rose-900">{attendanceSummary.absent}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Saved Attendance Sessions</h2>
            <p className="mt-1 text-sm text-slate-500">
              View, edit, or delete saved attendance by class, section, subject, and date.
            </p>
          </div>
          <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => void loadSavedSessions()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Class</th>
                <th className="px-6 py-4 font-medium">Section</th>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Students</th>
                <th className="px-6 py-4 font-medium">Attendance</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingSavedSessions ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-slate-500">
                    Loading saved attendance sessions...
                  </td>
                </tr>
              ) : savedSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-slate-500">
                    {isStaffUser ? "No saved attendance sessions found for this teacher." : "No saved attendance sessions found for the selected filters."}
                  </td>
                </tr>
              ) : (
                savedSessions.map((item) => (
                  <tr key={`${item.className}-${item.section}-${item.subjectId}-${item.date}`} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{item.className}</td>
                    <td className="px-6 py-4 text-slate-700">{item.section}</td>
                    <td className="px-6 py-4 text-slate-700">{item.subjectName}</td>
                    <td className="px-6 py-4 text-slate-700">{item.date}</td>
                    <td className="px-6 py-4 text-slate-700">{item.studentCount}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {item.presentCount} Present / {item.absentCount} Absent
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
                        <Link to={`/dashboard/attendance/${item.id}`}>
                          <ActionIconButton action="view" />
                        </Link>
                        <ActionIconButton action="edit" onClick={() => void handleEditSession(item)} />
                        <ActionIconButton action="delete" onClick={() => void handleDeleteSavedSession(item)} />
                      </div>
                    </td>
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

export const ExamsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const emptyForm: ExamFormValues = {
    name: "",
    className: "",
    section: "",
    sections: [],
    startDate: "",
    endDate: "",
    examSession: "Full Day",
    status: "Draft",
    subjects: [],
  };
  const [items, setItems] = useState<ExamGroupRecord[]>([]);
  const [classOptions, setClassOptions] = useState<Array<{ label: string; value: string; sections: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("");
  const [form, setForm] = useState<ExamFormValues>(emptyForm);
  const [editing, setEditing] = useState<ExamRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [availableExamSubjects, setAvailableExamSubjects] = useState<ExamSubjectOption[]>([]);
  const [loadingAvailableSubjects, setLoadingAvailableSubjects] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [examRows, classRows] = await Promise.all([listExamGroups(), listTimetableClassOptions()]);
      setItems(examRows);
      setClassOptions(
        classRows.map((item) => ({
          label: item.className,
          value: item.className,
          sections: item.sections,
        })),
      );
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load exams.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const modalSectionOptions =
    classOptions.find((item) => item.value === form.className)?.sections.map((section) => ({
      label: section,
      value: section,
    })) ?? [];

  const filterSectionOptions =
    classOptions.find((item) => item.value === selectedClassFilter)?.sections.map((section) => ({
      label: section,
      value: section,
    })) ?? [];

  const filteredItems = items.filter((item) =>
    `${item.name} ${item.classNames.join(" ")} ${item.sectionNames.join(" ")} ${item.startDate} ${item.endDate} ${item.status}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()) &&
    (!selectedClassFilter || item.classNames.includes(selectedClassFilter)) &&
    (!selectedSectionFilter || item.sectionNames.includes(selectedSectionFilter)),
  );

  const scheduleSummary = useMemo(() => deriveExamSummaryFromSubjects(form.subjects), [form.subjects]);
  const defaultExamDate = scheduleSummary?.startDate ?? getIndiaTodayIso();
  const subjectEditorRows = useMemo(
    () => mergeExamSubjectEditorRows(availableExamSubjects, form.subjects),
    [availableExamSubjects, form.subjects],
  );

  useEffect(() => {
    if (!modalOpen || !form.className || !form.section) {
      setAvailableExamSubjects([]);
      setLoadingAvailableSubjects(false);
      return;
    }

    let active = true;
    setLoadingAvailableSubjects(true);

    void getSelectableExamSubjects(form.className, form.section)
      .then((rows) => {
        if (!active) return;
        setAvailableExamSubjects(rows);
      })
      .catch((loadError) => {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Failed to load timetable subjects.";
        setAvailableExamSubjects([]);
        setError(message);
      })
      .finally(() => {
        if (active) setLoadingAvailableSubjects(false);
      });

    return () => {
      active = false;
    };
  }, [modalOpen, form.className, form.section]);

  const openCreate = () => {
    const defaultClass = classOptions[0];
    const defaultSection = defaultClass?.sections[0] ?? "";
    setForm({
      name: "",
      className: defaultClass?.value ?? "",
      section: defaultSection,
      sections: defaultSection ? [defaultSection] : [],
      startDate: "",
      endDate: "",
      examSession: "Full Day",
      status: "Draft",
      subjects: [],
    });
    setAvailableExamSubjects([]);
    setEditing(null);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = async (item: ExamRecord) => {
    setForm({
      name: item.name,
      className: item.className,
      section: item.section,
      sections: [item.section],
      startDate: item.startDate,
      endDate: item.endDate,
      examSession: item.examSession,
      status: item.status,
      subjects: [],
    });
    setAvailableExamSubjects([]);
    setEditing(item);
    setFormError("");
    setModalOpen(true);

    try {
      const assignedSubjects = await listExamSubjects(item.id);
      setForm((current) => ({
        ...current,
        subjects: assignedSubjects.map((subject) =>
          createExamSubjectFormValue(
            subject,
            subject.examDate ?? item.startDate,
            subject.examSession,
            String(subject.maxMarks ?? 100),
          ),
        ),
      }));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load paper schedule.";
      setFormError(message);
      setError(message);
    }
  };

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;

    let active = true;

    void getExamDetail(editId)
      .then((record) => {
        if (!active) return;
        void openEdit(record);
      })
      .catch((loadError) => {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Failed to load exam for editing.";
        setError(message);
      })
      .finally(() => {
        if (!active) return;
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("edit");
        setSearchParams(nextParams, { replace: true });
      });

    return () => {
      active = false;
    };
  }, [searchParams, setSearchParams]);

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setAvailableExamSubjects([]);
    setFormError("");
  };

  const toggleScheduledSubject = (subject: ExamSubjectEditorRow, checked: boolean, examDate: string) => {
    setForm((current) => {
      if (checked) {
        if (current.subjects.some((item) => item.subjectId === subject.subjectId)) {
          return current;
        }
        return {
          ...current,
          subjects: [
            ...current.subjects,
            createExamSubjectFormValue(
              subject,
              examDate,
              subject.examSession ?? "Morning",
              String(subject.maxMarks ?? 100),
            ),
          ],
        };
      }

      return {
        ...current,
        subjects: current.subjects.filter((item) => item.subjectId !== subject.subjectId),
      };
    });
  };

  const updateScheduledSubject = (
    subjectId: string,
    field: keyof Pick<ExamSubjectFormValue, "examDate" | "examSession" | "maxMarks">,
    value: string,
  ) => {
    if (field === "maxMarks" && !/^\d*$/.test(value)) return;

    setForm((current) => ({
      ...current,
      subjects: current.subjects.map((subject) => {
        if (subject.subjectId !== subjectId) return subject;
        if (field === "examSession") {
          const examSession = value as ExamSubjectFormValue["examSession"];
          const examWindow = getExamTimeWindow(examSession);
          return {
            ...subject,
            examSession,
            startTime: examWindow.startTime,
            endTime: examWindow.endTime,
          };
        }
        return {
          ...subject,
          [field]: value,
        };
      }),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (!form.className) {
        throw new Error("Class is required.");
      }
      if (form.subjects.length === 0) {
        throw new Error("Add at least one subject paper to the exam schedule.");
      }
      if (editing) {
        if (!form.section) {
          throw new Error("Section is required.");
        }
      } else if ((form.sections ?? []).length === 0) {
        throw new Error("Select at least one section.");
      }

      const incompleteSubject = form.subjects.find(
        (subject) => !subject.examDate || !subject.maxMarks || Number(subject.maxMarks) <= 0,
      );
      if (incompleteSubject) {
        throw new Error(`${incompleteSubject.subjectName ?? "Each subject"} must include exam date and valid max marks.`);
      }

      const derivedSummary = deriveExamSummaryFromSubjects(form.subjects);
      if (!derivedSummary) {
        throw new Error("Paper schedule is incomplete. Add a valid exam date for each selected subject.");
      }

      const payload: ExamFormValues = {
        ...form,
        startDate: derivedSummary.startDate,
        endDate: derivedSummary.endDate,
        examSession: derivedSummary.examSession,
      };

      if (editing) {
        await updateExam(editing.id, payload);
      } else {
        await createExam(payload);
      }
      const targetSection = editing ? form.section : (form.sections?.[0] ?? form.section);
      closeModal();
      await loadData();
      if (form.className && targetSection && derivedSummary.startDate) {
        navigate(
          `/dashboard/timetable?class=${encodeURIComponent(form.className)}&section=${encodeURIComponent(targetSection)}&date=${encodeURIComponent(derivedSummary.startDate)}`,
        );
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save exam.";
      setFormError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Exams"
        description="Each exam name appears only once here. Open it to see the class and section records under that exam."
        action={<Button onClick={openCreate}>+ Create Exam</Button>}
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px_240px]">
          <Input
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search exams..."
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Class Choices</span>
            <select
              value={selectedClassFilter}
              onChange={(event) => {
                const nextClass = event.target.value;
                setSelectedClassFilter(nextClass);
                setSelectedSectionFilter("");
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All Classes</option>
              {classOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Section Choices</span>
            <select
              value={selectedSectionFilter}
              onChange={(event) => setSelectedSectionFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All Sections</option>
              {filterSectionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {error ? (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <p className="text-sm text-amber-800">{error}</p>
          <p className="mt-2 text-xs text-amber-700">
            If section still appears blank after refresh, your live Supabase `exams` table is still on the older schema and needs the updated `schema.sql`.
          </p>
        </Card>
      ) : null}

      <DataTable
        data={filteredItems}
        getRowId={(item) => item.id}
        loading={loading}
        loadingMessage="Loading exams..."
        emptyMessage="No exams found."
        mobileTitle={(item) => item.name}
        mobileSubtitle={(item) => `${item.startDate} to ${item.endDate}`}
        columns={[
          { key: "name", label: "Exam Name", render: (item) => item.name, emphasis: true, mobileHidden: true },
          { key: "schedule", label: "Schedule", render: (item) => `${item.startDate} to ${item.endDate}` },
          { key: "examSession", label: "Session", render: (item) => item.examSession },
          { key: "status", label: "Status", render: (item) => item.status },
          {
            key: "classes",
            label: "Classes",
            render: (item) => (item.classCount === 1 ? item.classNames[0] : `${item.classCount} classes`),
          },
          {
            key: "sections",
            label: "Sections",
            render: (item) => (item.sectionCount === 1 ? item.sectionNames[0] : `${item.sectionCount} sections`),
          },
          { key: "recordCount", label: "Records", render: (item) => item.recordCount },
        ]}
        renderActions={(item) => (
          <div className="flex flex-wrap gap-2">
            <Link to={`/dashboard/exams/group/${item.id}`}>
              <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                View Classes & Sections
              </Button>
            </Link>
          </div>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit Exam Schedule" : "Create Exam Schedule"}
        description="Plan the real exam timetable here: choose the subjects, set each paper date and session, and the exam window will be calculated automatically."
        maxWidthClass="max-w-4xl"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Exam Name"
              value={form.name}
              required
              placeholder="Mid Term"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Class</span>
              <select
                value={form.className}
                required
                onChange={(event) => {
                  const nextClass = event.target.value;
                  const nextSections = classOptions.find((item) => item.value === nextClass)?.sections ?? [];
                  setForm((current) => ({
                    ...current,
                    className: nextClass,
                    section: nextSections.includes(current.section) ? current.section : nextSections[0] ?? "",
                    sections: editing
                      ? current.sections
                      : current.sections?.filter((section) => nextSections.includes(section)).length
                        ? current.sections?.filter((section) => nextSections.includes(section))
                        : nextSections[0]
                          ? [nextSections[0]]
                          : [],
                    subjects: [],
                  }));
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Select Class</option>
                {classOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {editing ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Section</span>
                <select
                  value={form.section}
                  required
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      section: event.target.value,
                      sections: [event.target.value],
                      subjects: [],
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">Select Section</option>
                  {modalSectionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="block text-sm font-medium text-slate-700">Sections</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-brand-600"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          sections: modalSectionOptions.map((option) => option.value),
                          section: modalSectionOptions[0]?.value ?? "",
                          subjects: [],
                        }))
                      }
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-500"
                      onClick={() => setForm((current) => ({ ...current, sections: [], section: "", subjects: [] }))}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                  {modalSectionOptions.length === 0 ? (
                    <p className="text-sm text-slate-500">No sections are available for this class yet.</p>
                  ) : (
                    modalSectionOptions.map((option) => {
                      const checked = form.sections?.includes(option.value) ?? false;
                      return (
                        <label key={option.value} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setForm((current) => {
                                const currentSections = current.sections ?? [];
                                const nextSections = event.target.checked
                                  ? Array.from(new Set([...currentSections, option.value]))
                                  : currentSections.filter((section) => section !== option.value);
                                return {
                                  ...current,
                                  sections: nextSections,
                                  section: nextSections[0] ?? "",
                                  subjects: [],
                                };
                              })
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  A separate exam record will be created for each selected section, using the same paper schedule.
                </p>
              </div>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ExamFormValues["status"] }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              >
                <option value="Draft">Draft</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>
            </label>
          </div>

          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-sky-900">Derived Exam Window</p>
                <p className="mt-1 text-xs text-sky-700">
                  The overall exam start date, end date, and session are calculated from the subject-wise paper schedule below.
                </p>
              </div>
              {scheduleSummary ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Start</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatShortDateFromDateString(scheduleSummary.startDate)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">End</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatShortDateFromDateString(scheduleSummary.endDate)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Session</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{scheduleSummary.examSession}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  Add the paper schedule to generate the exam window.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Subject-Wise Paper Schedule</h3>
                <p className="text-sm text-slate-500">
                  Select the subjects being conducted and choose the exam day, session, and marks for each paper.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Morning exam: `08:00-12:30` • Afternoon exam: `13:30-16:30`
              </div>
            </div>

            {!editing && (form.sections?.length ?? 0) > 1 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                The same paper schedule will be copied to all selected sections for this class.
              </div>
            ) : null}

            <ExamPaperScheduleEditor
              rows={subjectEditorRows}
              loading={loadingAvailableSubjects}
              emptyMessage="No timetable subjects are available for the selected class and section yet."
              defaultExamDate={defaultExamDate}
              onToggle={toggleScheduledSubject}
              onUpdate={updateScheduledSubject}
            />
          </div>

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal} className="bg-slate-100 text-slate-700 hover:bg-slate-200">
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Exam Schedule" : "Create Exam Schedule"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const ExamGroupDetailPage = () => {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<ExamGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const loadGroup = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await getExamGroupDetail(groupId);
      setGroup(detail);
      setError("");
    } catch (loadError) {
      setGroup(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load exam group.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void loadGroup();
  }, [loadGroup]);

  const handleDelete = async (record: ExamRecord) => {
    if (!window.confirm(`Delete ${record.name} for ${record.className} / ${record.section}?`)) return;

    setDeletingId(record.id);
    try {
      await deleteExam(record.id);
      if ((group?.records.length ?? 0) <= 1) {
        navigate("/dashboard/exams");
        return;
      }
      await loadGroup();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete exam.");
    } finally {
      setDeletingId("");
    }
  };

  if (loading) {
    return <Card className="border-slate-200 bg-white shadow-sm">Loading exam group...</Card>;
  }

  if (error && !group) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Exam Group"
          description="This page shows all classes and sections under one exam name."
          action={<Link to="/dashboard/exams"><Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">Back To Exams</Button></Link>}
        />
        <ErrorCard error={error} />
      </div>
    );
  }

  if (!group) {
    return <Card className="border-slate-200 bg-white shadow-sm">Exam group not found.</Card>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={group.name}
        description="All class and section exam records for this exam name are listed here."
        action={<Link to="/dashboard/exams"><Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">Back To Exams</Button></Link>}
      />

      {error ? <ErrorCard error={error} /> : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Schedule</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{group.startDate} to {group.endDate}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Session</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{group.examSession}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{group.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Classes</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{group.classNames.join(", ") || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Sections</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{group.sectionNames.join(", ") || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Records</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{group.recordCount}</p>
          </div>
        </div>
      </Card>

      <DataTable
        data={group.records}
        getRowId={(record) => record.id}
        emptyMessage="No exam records found."
        mobileTitle={(record) => `${record.className} / ${record.section}`}
        mobileSubtitle={(record) => `${record.startDate} to ${record.endDate}`}
        columns={[
          { key: "className", label: "Class", render: (record) => record.className, emphasis: true, mobileHidden: true },
          { key: "section", label: "Section", render: (record) => record.section },
          { key: "schedule", label: "Schedule", render: (record) => `${record.startDate} to ${record.endDate}` },
          { key: "examSession", label: "Session", render: (record) => record.examSession },
          { key: "status", label: "Status", render: (record) => record.status },
          { key: "subjectCount", label: "Subjects", render: (record) => record.subjectCount },
        ]}
        renderActions={(record) => {
          const marksEntryOpen = isExamMarksEntryOpen(record);
          const marksEntryMessage = getExamMarksEntryAvailabilityMessage(record);

          return (
            <div className="flex flex-wrap gap-2">
              <Link to={`/dashboard/exams/${record.id}`}>
                <ActionIconButton action="view" />
              </Link>
              <Link to={`/dashboard/exams?edit=${record.id}`}>
                <ActionIconButton action="edit" />
              </Link>
              <Link to={`/dashboard/exams/${record.id}/subjects`}>
                <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">Paper Schedule</Button>
              </Link>
              {marksEntryOpen ? (
                <Link to={`/dashboard/exams/${record.id}/marks`}>
                  <Button type="button">Marks Entry</Button>
                </Link>
              ) : (
                <Button type="button" disabled title={marksEntryMessage}>
                  Marks Entry Locked
                </Button>
              )}
              <ActionIconButton
                action="delete"
                onClick={() => void handleDelete(record)}
                disabled={deletingId === record.id}
              />
            </div>
          );
        }}
      />
    </div>
  );
};

export const ExamSubjectsPage = () => {
  const { id = "" } = useParams();
  const [exam, setExam] = useState<ExamRecord | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<ExamSubjectOption[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<ExamFormValues["subjects"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const subjectEditorRows = useMemo(
    () => mergeExamSubjectEditorRows(availableSubjects, selectedSubjects),
    [availableSubjects, selectedSubjects],
  );
  const defaultExamDate = exam?.startDate ?? getIndiaTodayIso();

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const examRecord = await getExamDetail(id);
        const [timetableSubjects, assignedSubjects] = await Promise.all([
          getSelectableExamSubjects(examRecord.className, examRecord.section),
          listExamSubjects(id),
        ]);
        setExam(examRecord);
        setAvailableSubjects(timetableSubjects);
        setSelectedSubjects(
          assignedSubjects.map((subject) =>
            createExamSubjectFormValue(
              subject,
              subject.examDate ?? examRecord.startDate,
              subject.examSession,
              String(subject.maxMarks ?? 100),
            ),
          ),
        );
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load exam subjects.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id]);

  const toggleSubject = (subject: ExamSubjectEditorRow, checked: boolean, examDate: string) => {
    setSelectedSubjects((current) => {
      if (checked) {
        if (current.some((item) => item.subjectId === subject.subjectId)) {
          return current;
        }
        return [
          ...current,
          createExamSubjectFormValue(
            subject,
            examDate,
            subject.examSession ?? "Morning",
            String(subject.maxMarks ?? 100),
          ),
        ];
      }
      return current.filter((item) => item.subjectId !== subject.subjectId);
    });
  };

  const updateSelectedSubject = (
    subjectId: string,
    field: keyof Pick<ExamSubjectFormValue, "examDate" | "examSession" | "maxMarks">,
    value: string,
  ) => {
    if (field === "maxMarks" && !/^\d*$/.test(value)) return;

    setSelectedSubjects((current) =>
      current.map((subject) => {
        if (subject.subjectId !== subjectId) return subject;
        if (field === "examSession") {
          const examSession = value as ExamSubjectFormValue["examSession"];
          const examWindow = getExamTimeWindow(examSession);
          return {
            ...subject,
            examSession,
            startTime: examWindow.startTime,
            endTime: examWindow.endTime,
          };
        }
        return {
          ...subject,
          [field]: value,
        };
      }),
    );
  };

  const handleSave = async () => {
    if (selectedSubjects.length === 0) {
      setError("Select at least one subject paper before saving.");
      return;
    }

    const incompleteSubject = selectedSubjects.find(
      (subject) => !subject.examDate || !subject.maxMarks || Number(subject.maxMarks) <= 0,
    );
    if (incompleteSubject) {
      setError(`${incompleteSubject.subjectName ?? "Each subject"} must include exam date and valid max marks.`);
      return;
    }

    setSaving(true);
    try {
      await saveExamSubjects(id, selectedSubjects);
      setError("");
      const [refreshedExam, refreshedSubjects] = await Promise.all([getExamDetail(id), listExamSubjects(id)]);
      setExam(refreshedExam);
      setSelectedSubjects(
        refreshedSubjects.map((subject) =>
          createExamSubjectFormValue(
            subject,
            subject.examDate ?? refreshedExam.startDate,
            subject.examSession,
            String(subject.maxMarks ?? 100),
          ),
        ),
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save exam subjects.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Paper Schedule"
        description="Choose the subjects being conducted and set the exam day, session, timing, and marks for every paper."
        action={exam ? <Link to={`/dashboard/exams/${exam.id}`}><Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">Back To Exam</Button></Link> : undefined}
      />

      {loading ? <Card className="border-slate-200 bg-white shadow-sm">Loading exam subjects...</Card> : null}

      {exam ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{exam.name}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {exam.className} / {exam.section} • {exam.startDate} to {exam.endDate} • {exam.status}
            {" • "}{exam.examSession}
          </p>
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Morning exam: `08:00-12:30` • Afternoon exam: `13:30-16:30` • Use full day only when the whole school day is blocked.
          </div>
        </Card>
      ) : null}

      {error ? <Card className="border-rose-200 bg-rose-50 shadow-sm"><p className="text-sm text-rose-700">{error}</p></Card> : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <ExamPaperScheduleEditor
          rows={subjectEditorRows}
          loading={loading}
          emptyMessage="No timetable subjects are available for this class and section."
          defaultExamDate={defaultExamDate}
          onToggle={toggleSubject}
          onUpdate={updateSelectedSubject}
        />
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving}>{saving ? "Saving..." : "Save Paper Schedule"}</Button>
      </div>
    </div>
  );
};

export const ExamMarksPage = () => {
  const { id = "" } = useParams();
  const { user, role } = authStore();
  const [exam, setExam] = useState<ExamRecord | null>(null);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [session, setSession] = useState<ExamMarksSession | null>(null);
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const marksEntryOpen = exam ? isExamMarksEntryOpen(exam) : false;
  const marksEntryMessage = exam ? getExamMarksEntryAvailabilityMessage(exam) : "";

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [examRecord, subjectRows] = await Promise.all([getExamDetail(id), listExamSubjects(id)]);
        setExam(examRecord);
        let filteredSubjectRows = subjectRows;
        if (role === ROLES.STAFF && user) {
          const staff = await getStaffByUserId(user.id);
          filteredSubjectRows = staff
            ? subjectRows.filter((item) => item.teacherId === staff.id)
            : [];
        }
        const options = filteredSubjectRows.map((item) => ({
          label: `${item.subjectName} - ${item.examDate ? formatShortDateFromDateString(item.examDate) : "Date TBD"} (${item.examSession}, ${formatExamTimeRange(item.startTime, item.endTime)}, ${item.maxMarks} marks)`,
          value: item.subjectId,
        }));
        setSubjects(options);
        setSelectedSubject(options[0]?.value ?? "");
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load marks entry.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id, role, user]);

  const handleLoadStudents = async () => {
    if (!selectedSubject) {
      setError("Select a subject first.");
      return;
    }

    setLoadingStudents(true);
    try {
      const loadedSession = await loadExamMarksSession(id, selectedSubject);
      setSession(loadedSession);
      setEditedIds(new Set());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load students.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleMarksChange = (studentId: string, marks: string) => {
    if (!/^\d*$/.test(marks)) return;

    setSession((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) => {
              if (row.studentId !== studentId) return row;
              const numericMarks = Number(marks);
              const grade =
                marks === ""
                  ? "-"
                  : numericMarks >= 90
                    ? "A"
                    : numericMarks >= 75
                      ? "B"
                      : numericMarks >= 50
                        ? "C"
                        : "F";
              return { ...row, marks, grade, changed: true };
            }),
          }
        : current,
    );

    setEditedIds((current) => new Set(current).add(studentId));
  };

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const saved = await saveExamMarksSession(session);
      setSession(saved);
      setEditedIds(new Set());
      setError("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Enter Marks"
        description="Step 3 of the workflow: load the exam subject, enter marks within the allowed maximum, and save subject-wise grades."
        action={exam ? <Link to={`/dashboard/exams/${exam.id}`}><Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">Back To Exam</Button></Link> : undefined}
      />

      {loading ? <Card className="border-slate-200 bg-white shadow-sm">Loading marks entry...</Card> : null}

      {exam ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Exam</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{exam.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
            {exam.className} / {exam.section} • {exam.startDate} to {exam.endDate} • {exam.status}
                {" • "}{exam.examSession}
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Subject</span>
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.value} value={subject.value}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button onClick={() => void handleLoadStudents()} disabled={loadingStudents || !marksEntryOpen} title={!marksEntryOpen ? marksEntryMessage : undefined}>
                {loadingStudents ? "Loading..." : "Load Students"}
              </Button>
            </div>
          </div>
          {session ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              {session.subjectName} • {session.examDate ? formatShortDateFromDateString(session.examDate) : "Date not set"} • {session.examSession} • {formatExamTimeRange(session.startTime, session.endTime)} • Max Marks: {session.maxMarks}
            </div>
          ) : null}
        </Card>
      ) : null}

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      {exam && !marksEntryOpen ? (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <p className="text-sm text-amber-800">{marksEntryMessage}</p>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        {!session ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-slate-500">
            Select a subject and load students to start marks entry.
          </div>
        ) : session.rows.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-slate-500">
            No students found for this exam class and section.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Student Name</th>
                  <th className="px-6 py-4 font-medium">Max Marks</th>
                  <th className="px-6 py-4 font-medium">Marks</th>
                  <th className="px-6 py-4 font-medium">Grade</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {session.rows.map((row) => (
                  <tr key={row.studentId} className={editedIds.has(row.studentId) ? "bg-brand-50/50" : "hover:bg-slate-50"}>
                    <td className="px-6 py-4 font-medium text-slate-900">{row.studentName}</td>
                    <td className="px-6 py-4 text-slate-700">{row.maxMarks}</td>
                    <td className="px-6 py-4">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={row.marks}
                        onChange={(event) => handleMarksChange(row.studentId, event.target.value)}
                        placeholder="Enter marks"
                        className="max-w-[160px]"
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-700">{row.grade}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {row.markId ? (
                        <Link to={`/dashboard/results/${row.studentId}:${session.examId}`} className="inline-flex">
                          <ActionIconButton action="view" />
                        </Link>
                      ) : (
                        "Pending save"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {session ? (
        <div className="flex justify-end">
          <Button onClick={() => void handleSave()} disabled={saving || !marksEntryOpen} title={!marksEntryOpen ? marksEntryMessage : undefined}>
            {saving ? "Saving..." : "Save Marks"}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export const ResultsPage = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [exams, setExams] = useState<Option[]>([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [resultRows, examRows] = await Promise.all([listResults(selectedExam || undefined), listExams()]);
      const queryClass = searchParams.get("class");
      const querySection = searchParams.get("section");
      setResults(
        resultRows.filter((item) =>
          (!queryClass || item.className === queryClass) &&
          (!querySection || item.section === querySection),
        ),
      );
      setExams(examRows.map((exam) => ({ label: `${exam.name} (${exam.className} / ${exam.section})`, value: exam.id })));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [searchParams, selectedExam]);

  const filteredResults = results.filter((item) =>
    `${item.studentName} ${item.examName} ${item.className ?? ""} ${item.section ?? ""} ${item.finalGrade} ${item.passStatus}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const handleDelete = async (item: ResultRecord) => {
    if (!window.confirm("Delete all saved marks for this student's exam record?")) return;
    try {
      await deleteResult(item.id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete result.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Results"
        description="Step 4 of the workflow: review calculated totals, percentages, grades, and open full report cards."
        action={<Link to="/dashboard/exams"><Button>Go To Exams</Button></Link>}
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search results..." />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Exam</span>
            <select
              value={selectedExam}
              onChange={(event) => setSelectedExam(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All Exams</option>
              {exams.map((exam) => (
                <option key={exam.value} value={exam.value}>
                  {exam.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Exam</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Percentage</th>
                <th className="px-6 py-4 font-medium">Final Grade</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-slate-500">Loading results...</td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-slate-500">No results found.</td>
                </tr>
              ) : (
                filteredResults.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{item.studentName}</td>
                    <td className="px-6 py-4 text-slate-700">{item.examName}</td>
                    <td className="px-6 py-4 text-slate-700">{item.totalMarks} / {item.maxMarks}</td>
                    <td className="px-6 py-4 text-slate-700">{item.percentage}%</td>
                    <td className="px-6 py-4 text-slate-700">{item.finalGrade} ({item.passStatus})</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link to={`/dashboard/results/${item.id}`}>
                          <ActionIconButton action="view" />
                        </Link>
                        <ActionIconButton action="delete" onClick={() => void handleDelete(item)} />
                      </div>
                    </td>
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

export const FeesPage = () => {
  const { role } = authStore();
  const workspace = useStaffWorkspace();
  const isAccountsWorkspace = role === ROLES.STAFF && workspace === STAFF_WORKSPACES.ACCOUNTS;
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<Option[]>([]);
  const [exportingExcel, setExportingExcel] = useState(false);
  useEffect(() => {
    void listStudents().then((items) => setStudents(items.map((student) => ({ label: student.name, value: student.id }))));
  }, []);

  const loadFeeItems = async () => {
    const queryClass = searchParams.get("class");
    const querySection = searchParams.get("section");
    const items = await listFees();
    return items.filter(
      (item) =>
        (!queryClass || item.className === queryClass) &&
        (!querySection || item.section === querySection),
    );
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const items = await loadFeeItems();
      const { utils, writeFile } = await import("xlsx");
      const workbook = utils.book_new();
      const worksheet = utils.json_to_sheet(
        items.map((item) => ({
          Student: item.studentName,
          Class: item.className ?? "-",
          Section: item.section ?? "-",
          Total: item.totalAmount,
          Paid: item.paidAmount,
          Remaining: item.remainingAmount,
          Status: item.status ?? "-",
          DueDate: item.dueDate ?? "-",
        })),
      );
      utils.book_append_sheet(workbook, worksheet, "Fees");
      writeFile(workbook, "fees-report.xlsx");
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <CrudPage<FeeRecord>
      title="Fees Management"
      description={isAccountsWorkspace ? "Review fee records and continue payment updates from the detail view." : "Manage student fee schedules, payment progress, due dates, and detailed fee tracking."}
      createLabel="+ Add Fee"
      emptyMessage="No fee records found."
      fields={[
        { key: "studentId", label: "Student", type: "select", required: true, options: students },
        { key: "totalAmount", label: "Total Amount", type: "number", required: true, placeholder: "1500" },
        { key: "dueDate", label: "Due Date", type: "date", required: true },
      ]}
      columns={[
        { label: "Student", render: (item) => item.studentName },
        { label: "Class", render: (item) => item.className ?? "-" },
        { label: "Total Amount", render: (item) => formatCurrency(item.totalAmount) },
        { label: "Paid Amount", render: (item) => formatCurrency(item.paidAmount) },
        { label: "Remaining", render: (item) => formatCurrency(item.remainingAmount) },
        {
          label: "Status",
          render: (item) => (
            <span
              className={getStatusBadgeClassName(item.status, {
                positive: "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700",
                warning: "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700",
                negative: "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700",
              })}
            >
              {item.status ?? "-"}
            </span>
          ),
        },
        { label: "Due Date", render: (item) => item.dueDate ?? "-" },
      ]}
      emptyForm={{ studentId: "", totalAmount: "", dueDate: "" }}
      loadItems={loadFeeItems}
      createItem={createFee}
      updateItem={updateFee}
      deleteItem={deleteFee}
      canCreate={!isAccountsWorkspace}
      canEdit={!isAccountsWorkspace}
      canDelete={!isAccountsWorkspace}
      getSearchText={(item) => `${item.studentName} ${item.className ?? ""} ${item.section ?? ""} ${item.status ?? ""}`}
      filters={[
        {
          key: "status",
          label: "Status",
          options: [
            { label: "Paid", value: "Paid" },
            { label: "Unpaid", value: "Unpaid" },
            { label: "Partial", value: "Partial" },
          ],
          getValue: (item) => item.status ?? "",
        },
      ]}
      mapToForm={(item) => ({
        studentId: item.studentId,
        totalAmount: String(item.totalAmount),
        dueDate: item.dueDate ?? "",
      })}
      detailPath={(item) => `/dashboard/fees/${item.id}`}
    >
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Report Generation</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Export Fee Ledger</h2>
            <p className="mt-2 text-sm text-slate-500">Download the current fee dataset as an Excel workbook for finance reporting and offline review.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void handleExportExcel()} disabled={exportingExcel}>
            {exportingExcel ? "Exporting..." : "Export Excel"}
          </Button>
        </div>
      </Card>
    </CrudPage>
  );
};

export const EmployeesPage = () => (
  <CrudPage<EmployeeRecord>
    title="Employees"
    description="Manage employee records directly from staff accounts, including role and subject assignment. Coordinator access is controlled from Class Management."
    createLabel="+ Add Employee"
    emptyMessage="No employees found."
    fields={[
      { key: "name", label: "Name", required: true, placeholder: "Employee name" },
      { key: "email", label: "Email", required: true, placeholder: "employee@school.com" },
      { key: "mobileNumber", label: "Mobile Number", required: true, placeholder: "9876543210" },
      { key: "password", label: "Password", type: "text", placeholder: "Set password for new employee" },
      { key: "dateOfJoining", label: "Date Of Joining", type: "date", required: true },
      { key: "monthlySalary", label: "Monthly Salary", type: "number", required: true, placeholder: "25000" },
      { key: "role", label: "Role", required: true, placeholder: "Teacher" },
      { key: "subjectId", label: "Subject ID", placeholder: "Paste subject id" },
    ]}
    columns={[
      { label: "Name", render: (item) => item.name },
      { label: "Role", render: (item) => item.role },
      { label: "Subject", render: (item) => item.subjectName ?? "-" },
      { label: "Coordinator", render: (item) => (item.isClassCoordinator ? "Yes" : "No") },
    ]}
    emptyForm={{
      name: "",
      email: "",
      mobileNumber: "",
      password: "",
      dateOfJoining: "",
      monthlySalary: "",
      role: "Teacher",
      subjectId: "",
      photoUrl: "",
    }}
    loadItems={listEmployees}
    createItem={(values) =>
      createEmployee({
        ...values,
        assignedClass: "",
        assignedSection: "",
        isClassCoordinator: false,
      })}
    updateItem={(id, values) =>
      updateEmployee(id, {
        ...values,
        assignedClass: "",
        assignedSection: "",
        isClassCoordinator: false,
      })}
    deleteItem={deleteEmployee}
    getSearchText={(item) => `${item.name} ${item.role} ${item.subjectName ?? ""} ${item.email ?? ""}`}
    filters={[
      {
        key: "coordinator",
        label: "Coordinator",
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ],
        getValue: (item) => (item.isClassCoordinator ? "yes" : "no"),
      },
    ]}
    mapToForm={(item) => ({
      name: item.name,
      email: item.email,
      mobileNumber: item.mobileNumber,
      password: "",
      dateOfJoining: item.dateOfJoining ?? "",
      monthlySalary: item.monthlySalary != null ? String(item.monthlySalary) : "",
      role: item.role,
      subjectId: "",
      photoUrl: item.photoUrl ?? "",
    })}
    detailPath={(item) => `/dashboard/employees/${item.id}`}
  />
);

export const LeavesPage = () => {
  const { role, user } = authStore();
  const workspace = useStaffWorkspace();
  const [employees, setEmployees] = useState<Option[]>([]);
  const [staffMember, setStaffMember] = useState<Awaited<ReturnType<typeof getStaffByUserId>> | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [hrCommentDrafts, setHrCommentDrafts] = useState<Record<string, string>>({});
  const [adminCommentDrafts, setAdminCommentDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    void listEmployees().then((items) => setEmployees(items.map((item) => ({ label: item.name, value: item.id }))));
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (role !== ROLES.STAFF || !user?.id) {
        if (active) {
          setStaffMember(null);
          setLoadingWorkspace(false);
        }
        return;
      }

      try {
        const staff = await getStaffByUserId(user.id);
        if (active) {
          setStaffMember(staff);
        }
      } finally {
        if (active) {
          setLoadingWorkspace(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [role, user?.id]);

  const isTeacherWorkspace = role === ROLES.STAFF && workspace === STAFF_WORKSPACES.TEACHER;
  const isHrWorkspace = role === ROLES.STAFF && workspace === STAFF_WORKSPACES.HR;
  const isAdminWorkspace = role === ROLES.ADMIN;

  if (loadingWorkspace) {
    return <Card className="border-slate-200 bg-white shadow-sm">Loading leave workflow...</Card>;
  }

  return (
    <CrudPage<LeaveRecord>
      title={isTeacherWorkspace ? "My Leaves" : isHrWorkspace ? "HR Leave Review" : "Admin Leave Approval"}
      description={
        isTeacherWorkspace
          ? "Request leave first. HR reviews it, then admin gives the final decision."
          : isHrWorkspace
            ? "Review only HR-stage leave requests, then forward them to admin or reject them."
            : "Review only admin-stage leave requests and make the final approval decision."
      }
      createLabel={isTeacherWorkspace ? "+ Request Leave" : "+ Add Leave"}
      emptyMessage="No leave requests found."
      fields={[
        ...(isTeacherWorkspace ? [] : [{ key: "staffId", label: "Employee", type: "select" as const, required: true, options: employees }]),
        { key: "startDate", label: "Start Date", type: "date", required: true },
        { key: "endDate", label: "End Date", type: "date", required: true },
        { key: "reason", label: "Reason", type: "textarea", placeholder: "Leave reason" },
      ]}
      columns={[
        { label: "Employee", render: (item) => item.employeeName },
        { label: "Dates", render: (item) => `${item.startDate} to ${item.endDate}` },
        { label: "Reason", render: (item) => item.reason ?? "-" },
        {
          label: "Status",
          render: (item) => (
            <div className="space-y-1">
              <span className={leaveStatusMeta[item.status].className}>{leaveStatusMeta[item.status].label}</span>
              <p className="text-xs text-slate-500">{leaveStatusMeta[item.status].stage}</p>
            </div>
          ),
        },
      ]}
      emptyForm={{ staffId: staffMember?.id ?? "", startDate: "", endDate: "", reason: "" }}
      loadItems={async () => {
        const items = await listLeaves();
        if (isTeacherWorkspace) {
          return items.filter((item) => item.staffId === staffMember?.id);
        }
        if (isHrWorkspace) {
          return items.filter((item) => item.status === "Pending_HR");
        }
        if (isAdminWorkspace) {
          return items.filter((item) => item.status === "Pending_Admin");
        }
        return items;
      }}
      createItem={(values) =>
        createLeave({
          ...values,
          staffId: isTeacherWorkspace ? staffMember?.id ?? "" : values.staffId,
        })
      }
      updateItem={updateLeave}
      deleteItem={deleteLeave}
      canCreate={isTeacherWorkspace}
      canEdit={false}
      canDelete={false}
      getSearchText={(item) => `${item.employeeName} ${item.status} ${item.reason ?? ""}`}
      filters={[
        {
          key: "status",
          label: "Status",
          options: [
            { label: "Pending HR", value: "Pending_HR" },
            { label: "Pending Admin", value: "Pending_Admin" },
            { label: "Approved", value: "Approved" },
            { label: "Rejected By HR", value: "Rejected_By_HR" },
            { label: "Rejected By Admin", value: "Rejected_By_Admin" },
          ],
          getValue: (item) => item.status,
        },
      ]}
      mapToForm={(item) => ({
        staffId: isTeacherWorkspace ? staffMember?.id ?? "" : item.staffId ?? "",
        startDate: item.startDate,
        endDate: item.endDate,
        reason: item.reason ?? "",
      })}
      detailPath={(item) => `/dashboard/leaves/${item.id}`}
      extraActions={(item, reload) =>
        isHrWorkspace && item.status === "Pending_HR" ? (
          <>
            <Input
              value={hrCommentDrafts[item.id] ?? ""}
              onChange={(event) => setHrCommentDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
              placeholder="HR comment"
              className="max-w-[220px]"
            />
            <Button
              variant="ghost"
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              onClick={() =>
                void reviewLeaveByHr(item.id, "Pending_Admin", hrCommentDrafts[item.id] ?? "").then(() => reload())
              }
            >
              Forward To Admin
            </Button>
            <Button
              variant="ghost"
              className="bg-rose-50 text-rose-700 hover:bg-rose-100"
              onClick={() =>
                void reviewLeaveByHr(item.id, "Rejected_By_HR", hrCommentDrafts[item.id] ?? "").then(() => reload())
              }
            >
              Reject
            </Button>
          </>
        ) : isAdminWorkspace && item.status === "Pending_Admin" ? (
          <>
            <Input
              value={adminCommentDrafts[item.id] ?? ""}
              onChange={(event) => setAdminCommentDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
              placeholder="Admin comment"
              className="max-w-[220px]"
            />
            <Button
              variant="ghost"
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              onClick={() =>
                void reviewLeaveByAdmin(item.id, "Approved", adminCommentDrafts[item.id] ?? "").then(() => reload())
              }
            >
              Approve
            </Button>
            <Button
              variant="ghost"
              className="bg-rose-50 text-rose-700 hover:bg-rose-100"
              onClick={() =>
                void reviewLeaveByAdmin(item.id, "Rejected_By_Admin", adminCommentDrafts[item.id] ?? "").then(() => reload())
              }
            >
              Reject
            </Button>
          </>
        ) : null
      }
    />
  );
};

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user, role } = authStore();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    if (!user?.id || !role) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await syncUpcomingFeeReminders(user.id, role);
      const items = await listNotificationsForUser(user.id, role);
      setNotifications(items);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [role, user?.id]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const openNotification = async (notification: NotificationRecord) => {
    try {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);
      }
    } catch {
      // Continue navigation even if the read flag update fails.
    }

    navigate(
      notification.relatedFeeId
        ? `/dashboard/fees/${notification.relatedFeeId}`
        : notification.relatedLeaveId
        ? `/dashboard/leave-impact/${notification.relatedLeaveId}?notificationId=${notification.id}`
        : "/dashboard/notifications",
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notifications"
        description="Unread fee reminders, workflow alerts, and operational notices connected to live ERP records."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Alerts</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{notifications.length}</p>
          <p className="mt-2 text-sm text-slate-500">All fee reminders and workflow notifications on your account.</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Unread</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{unreadCount}</p>
          <p className="mt-2 text-sm text-slate-500">Actionable alerts that still need attention.</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Read</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{notifications.length - unreadCount}</p>
          <p className="mt-2 text-sm text-slate-500">Notifications already opened from the workflow.</p>
        </Card>
      </div>

      {error ? <ErrorCard error={error} /> : null}

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">Loading notifications...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Module</th>
                  <th className="px-6 py-4 font-medium">Message</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-slate-500">
                      No notifications found.
                    </td>
                  </tr>
                ) : (
                  notifications.map((notification) => (
                    <tr key={notification.id} className={notification.isRead ? "" : "bg-brand-50/40"}>
                      <td className="px-6 py-4 text-slate-700">{notification.module ?? notification.type}</td>
                      <td className="px-6 py-4 text-slate-700">{notification.message}</td>
                      <td className="px-6 py-4 text-slate-700">
                        {notification.createdAt ? formatShortDateFromDateString(notification.createdAt.slice(0, 10)) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            notification.isRead
                              ? "rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                              : "rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                          }
                        >
                          {notification.isRead ? "Read" : "Unread"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          type="button"
                          variant="ghost"
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                          onClick={() => void openNotification(notification)}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export const LeaveImpactPage = () => {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { user, role } = authStore();
  const [detail, setDetail] = useState<LeaveImpactDetail | null>(null);
  const [teachers, setTeachers] = useState<StaffRecord[]>([]);
  const [viewerStaff, setViewerStaff] = useState<StaffRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { replacementTeacherId: string; startTime: string; endTime: string; note: string }>>({});

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [impactDetail, teacherRows, currentStaff] = await Promise.all([
        getLeaveImpactDetail(id),
        listTimetableTeachers(),
        role === ROLES.STAFF && user?.id ? getStaffByUserId(user.id) : Promise.resolve(null),
      ]);

      setDetail(impactDetail);
      setTeachers(teacherRows);
      setViewerStaff(currentStaff);
      setDrafts((current) => {
        const next = { ...current };
        impactDetail.impacts.forEach((impact) => {
          next[impact.id] = next[impact.id] ?? {
            replacementTeacherId: impact.replacementTeacherId ?? "",
            startTime: impact.replacementStartTime ?? impact.startTime,
            endTime: impact.replacementEndTime ?? impact.endTime,
            note: impact.note ?? "",
          };
        });
        return next;
      });
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load leave impact details.");
    } finally {
      setLoading(false);
    }
  }, [id, role, user?.id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    const notificationId = searchParams.get("notificationId");
    if (!notificationId) return;
    void markNotificationAsRead(notificationId).catch(() => undefined);
  }, [searchParams]);

  if (loading) {
    return <Card className="border-slate-200 bg-white shadow-sm">Loading leave impact...</Card>;
  }

  if (error || !detail) {
    return <ErrorCard error={error || "Leave impact record not found."} />;
  }

  const isAdmin = role === ROLES.ADMIN;
  const visibleImpacts =
    role === ROLES.STAFF && viewerStaff?.isClassCoordinator && viewerStaff.assignedClass && viewerStaff.assignedSection
      ? detail.impacts.filter(
          (impact) =>
            impact.className === viewerStaff.assignedClass &&
            impact.section === viewerStaff.assignedSection,
        )
      : detail.impacts;
  const canManage =
    isAdmin ||
    (role === ROLES.STAFF &&
      viewerStaff?.isClassCoordinator &&
      visibleImpacts.some(
        (impact) =>
          impact.className === viewerStaff.assignedClass &&
          impact.section === viewerStaff.assignedSection,
      ));
  const canManageImpact = (impact: TimetableImpactRecord) =>
    isAdmin ||
    (role === ROLES.STAFF &&
      viewerStaff?.isClassCoordinator &&
      impact.className === viewerStaff.assignedClass &&
      impact.section === viewerStaff.assignedSection);

  const pendingCount = visibleImpacts.filter((impact) => impact.status === "Pending_Action").length;
  const rescheduledCount = visibleImpacts.filter((impact) => impact.status === "Rescheduled").length;
  const cancelledCount = visibleImpacts.filter((impact) => impact.status === "Cancelled").length;

  const updateDraft = (impactId: string, patch: Partial<{ replacementTeacherId: string; startTime: string; endTime: string; note: string }>) => {
    setDrafts((current) => ({
      ...current,
      [impactId]: {
        ...(current[impactId] ?? {
          replacementTeacherId: "",
          startTime: "",
          endTime: "",
          note: "",
        }),
        ...patch,
      },
    }));
  };

  const handleReschedule = async (impact: TimetableImpactRecord) => {
    const draft = drafts[impact.id];
    const replacementTeacher = teachers.find((teacher) => teacher.id === (draft?.replacementTeacherId ?? ""));
    setSavingId(impact.id);
    try {
      await rescheduleTimetableImpact(
        impact.id,
        {
          replacementTeacherId: draft?.replacementTeacherId ?? "",
          replacementSubjectId: replacementTeacher?.subjectId ?? impact.subjectId,
          replacementStartTime: draft?.startTime,
          replacementEndTime: draft?.endTime,
          note: draft?.note,
        },
        { userId: user?.id, role },
      );
      await loadDetail();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to reschedule the affected class.");
    } finally {
      setSavingId(null);
    }
  };

  const handleCancel = async (impact: TimetableImpactRecord) => {
    const draft = drafts[impact.id];
    setSavingId(impact.id);
    try {
      await cancelTimetableImpact(
        impact.id,
        { note: draft?.note },
        { userId: user?.id, role },
      );
      await loadDetail();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to cancel the affected class.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Leave Impact"
        description="Review the timetable periods affected by an approved leave and resolve each one with a visible action."
        action={
          <Link to="/dashboard/notifications">
            <Button variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
              Back to Notifications
            </Button>
          </Link>
        }
      />

      {error ? <ErrorCard error={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DetailSection title="Teacher Info">
          <DetailField label="Name" value={detail.staff?.name ?? detail.leave.employeeName} />
          <DetailField label="Subject" value={detail.staff?.subjectName ?? detail.staff?.role ?? "-"} />
          <DetailField label="Role" value={detail.staff?.role ?? detail.leave.role ?? "-"} />
          <DetailField
            label="Status"
            value={<span className={leaveStatusMeta[detail.leave.status].className}>{leaveStatusMeta[detail.leave.status].label}</span>}
          />
        </DetailSection>

        <DetailSection title="Leave Details">
          <DetailField label="From Date" value={detail.leave.startDate} />
          <DetailField label="To Date" value={detail.leave.endDate} />
          <DetailField label="Reason" value={detail.leave.reason ?? "-"} />
          <DetailField label="HR Comment" value={detail.leave.hrComment ?? "No HR comment added."} />
          <DetailField label="Admin Comment" value={detail.leave.adminComment ?? "No admin comment added."} />
        </DetailSection>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending Action</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{pendingCount}</p>
          <p className="mt-2 text-sm text-slate-500">Periods still waiting for coordinator or admin action.</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rescheduled</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{rescheduledCount}</p>
          <p className="mt-2 text-sm text-slate-500">Affected periods moved with a visible replacement plan.</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cancelled</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{cancelledCount}</p>
          <p className="mt-2 text-sm text-slate-500">Periods formally cancelled so students can see the change.</p>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Affected Classes</h2>
          <p className="mt-2 text-sm text-slate-500">
            {role === ROLES.STAFF && viewerStaff?.isClassCoordinator
              ? "Only the timetable rows for your assigned class and section are shown here."
              : "Every impacted timetable row is tracked here. Nothing is hidden from coordinators, teachers, or students."}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Class</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleImpacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-slate-500">
                    {role === ROLES.STAFF && viewerStaff?.isClassCoordinator
                      ? "No affected periods are assigned to your class and section for this leave."
                      : "No timetable conflicts were found for this approved leave."}
                  </td>
                </tr>
              ) : (
                visibleImpacts.map((impact) => {
                  const draft = drafts[impact.id] ?? {
                    replacementTeacherId: "",
                    startTime: impact.startTime,
                    endTime: impact.endTime,
                    note: "",
                  };
                  const impactCanManage = canManageImpact(impact);
                  const filteredTeachers = teachers.filter(
                    (teacher) => teacher.subjectId === impact.subjectId && teacher.id !== impact.teacherId,
                  );
                  const teacherOptions = filteredTeachers.length > 0 ? filteredTeachers : teachers.filter((teacher) => teacher.id !== impact.teacherId);

                  return (
                    <tr key={impact.id}>
                      <td className="px-6 py-4 text-slate-700">{formatShortDateFromDateString(impact.impactDate)}</td>
                      <td className="px-6 py-4 text-slate-700">{impact.startTime} - {impact.endTime}</td>
                      <td className="px-6 py-4 text-slate-700">
                        <div>
                          <p className="font-semibold text-slate-900">{impact.subjectName}</p>
                          <p className="text-xs text-slate-500">{impact.teacherName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{impact.className} / {impact.section}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <span className={impactStatusBadgeClassName[impact.status]}>{impact.status.replace("_", " ")}</span>
                          {impact.status === "Rescheduled" ? (
                            <p className="text-xs text-slate-500">
                              {impact.replacementTeacherName ?? "Replacement teacher"} at {impact.replacementStartTime ?? impact.startTime}-{impact.replacementEndTime ?? impact.endTime}
                            </p>
                          ) : impact.status === "Cancelled" ? (
                            <p className="text-xs text-slate-500">Visible as cancelled in the timetable.</p>
                          ) : (
                            <p className="text-xs text-slate-500">Awaiting coordinator action.</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-3">
                          <label className="block">
                            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">New Teacher</span>
                            <select
                              value={draft.replacementTeacherId}
                              onChange={(event) => updateDraft(impact.id, { replacementTeacherId: event.target.value })}
                              disabled={!impactCanManage || impact.status !== "Pending_Action" || savingId === impact.id}
                              className="w-full min-w-[220px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                            >
                              <option value="">Select teacher</option>
                              {teacherOptions.map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                  {teacher.name}{teacher.subjectName ? ` • ${teacher.subjectName}` : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">New Start</span>
                              <select
                                value={draft.startTime}
                                onChange={(event) => updateDraft(impact.id, { startTime: event.target.value })}
                                disabled={!impactCanManage || impact.status !== "Pending_Action" || savingId === impact.id}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                              >
                                {IMPACT_TIME_OPTIONS.slice(0, -1).map((time) => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">New End</span>
                              <select
                                value={draft.endTime}
                                onChange={(event) => updateDraft(impact.id, { endTime: event.target.value })}
                                disabled={!impactCanManage || impact.status !== "Pending_Action" || savingId === impact.id}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                              >
                                {IMPACT_TIME_OPTIONS.slice(1).map((time) => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <Input
                            value={draft.note}
                            onChange={(event) => updateDraft(impact.id, { note: event.target.value })}
                            placeholder="Coordinator note"
                            disabled={!impactCanManage || impact.status !== "Pending_Action" || savingId === impact.id}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              className="bg-brand-600 text-white hover:bg-brand-700"
                              disabled={!impactCanManage || impact.status !== "Pending_Action" || savingId === impact.id}
                              onClick={() => void handleReschedule(impact)}
                            >
                              {savingId === impact.id ? "Saving..." : "Reschedule"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="bg-rose-50 text-rose-700 hover:bg-rose-100"
                              disabled={!impactCanManage || impact.status !== "Pending_Action" || savingId === impact.id}
                              onClick={() => void handleCancel(impact)}
                            >
                              Cancel Class
                            </Button>
                          </div>
                          {!impactCanManage ? (
                            <p className="text-xs text-slate-500">
                              Read-only view. Only the coordinator assigned to {impact.className} / {impact.section} or an admin can take action.
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const SalaryPage = () => {
  const { role } = authStore();
  const workspace = useStaffWorkspace();
  const isAccountsWorkspace = role === ROLES.STAFF && workspace === STAFF_WORKSPACES.ACCOUNTS;
  const [employees, setEmployees] = useState<Option[]>([]);
  useEffect(() => {
    void listEmployees().then((items) => setEmployees(items.map((item) => ({ label: item.name, value: item.id }))));
  }, []);

  return (
    <CrudPage<SalaryRecord>
      title="Salary"
      description={isAccountsWorkspace ? "Track salary records and release pending payments." : "Track salary entries by staff member, month, and payment status with complete admin control."}
      createLabel="+ Add Salary"
      emptyMessage="No salary records found."
      fields={[
        { key: "staffId", label: "Employee", type: "select", required: true, options: employees },
        { key: "amount", label: "Amount", type: "number", required: true, placeholder: "25000" },
        { key: "month", label: "Month", required: true, placeholder: "2026-03" },
      ]}
      columns={[
        { label: "Employee", render: (item) => item.employeeName },
        { label: "Amount", render: (item) => formatCurrency(item.amount) },
        { label: "Month", render: (item) => item.month },
        {
          label: "Status",
          render: (item) => (
            <span
              className={getStatusBadgeClassName(item.status, {
                positive: "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700",
                warning: "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700",
                negative: "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700",
              })}
            >
              {item.status}
            </span>
          ),
        },
      ]}
      emptyForm={{ staffId: "", amount: "", month: "" }}
      loadItems={listSalary}
      createItem={createSalary}
      updateItem={updateSalary}
      deleteItem={deleteSalary}
      getSearchText={(item) => `${item.employeeName} ${item.month} ${item.status}`}
      filters={[
        {
          key: "status",
          label: "Status",
          options: [
            { label: "Unpaid", value: "Unpaid" },
            { label: "Paid", value: "Paid" },
          ],
          getValue: (item) => item.status,
        },
      ]}
      mapToForm={(item) => ({
        staffId: item.staffId ?? "",
        amount: String(item.amount),
        month: item.month,
      })}
      detailPath={(item) => `/dashboard/salary/${item.id}`}
      extraActions={(item, reload) =>
        item.status !== "Paid" ? (
          <Button
            variant="ghost"
            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            onClick={() => void paySalary(item.id).then(() => reload())}
          >
            Pay
          </Button>
        ) : null
      }
    />
  );
};

export const VehiclesPage = () => (
  <CrudPage<VehicleRecord>
    title="Vehicles"
    description="Manage the live transport fleet with vehicle status, driver contacts, and assigned route readiness."
    createLabel="+ Add Vehicle"
    emptyMessage="No vehicles found."
    fields={[
      { key: "vehicleName", label: "Vehicle Number", required: true, placeholder: "TN 01 AB 1234" },
      { key: "driverName", label: "Driver Name", required: true, placeholder: "Driver name" },
      { key: "driverPhone", label: "Driver Phone", required: true, placeholder: "9876543210" },
      { key: "capacity", label: "Capacity", type: "number", required: true, placeholder: "40" },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { label: "Active", value: "Active" },
          { label: "Maintenance", value: "Maintenance" },
        ],
      },
    ]}
    columns={[
      { label: "Vehicle Number", render: (item) => item.vehicleName },
      { label: "Driver", render: (item) => item.driverName },
      { label: "Phone", render: (item) => item.driverPhone ?? "-" },
      { label: "Capacity", render: (item) => item.capacity },
      {
        label: "Status",
        render: (item) => (
          <span
            className={getStatusBadgeClassName(item.status, {
              positive: "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700",
              warning: "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700",
              negative: "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700",
            })}
          >
            {item.status ?? "-"}
          </span>
        ),
      },
    ]}
    emptyForm={{ vehicleName: "", driverName: "", driverPhone: "", capacity: "", status: "Active" }}
    loadItems={listVehicles}
    createItem={createVehicle}
    updateItem={updateVehicle}
    deleteItem={deleteVehicle}
    getSearchText={(item) => `${item.vehicleName} ${item.driverName} ${item.driverPhone ?? ""} ${item.capacity} ${item.status ?? ""}`}
    mapToForm={(item) => ({
      vehicleName: item.vehicleName,
      driverName: item.driverName,
      driverPhone: item.driverPhone ?? "",
      capacity: String(item.capacity),
      status: item.status === "Maintenance" ? "Maintenance" : "Active",
    })}
    detailPath={(item) => `/dashboard/vehicles/${item.id}`}
  />
);

export const RoutesPage = () => {
  const [vehicles, setVehicles] = useState<Option[]>([]);
  useEffect(() => {
    void listVehicles().then((items) => setVehicles(items.map((item) => ({ label: item.vehicleName, value: item.id }))));
  }, []);

  return (
    <CrudPage<RouteRecord>
      title="Routes"
      description="Manage transport routes, stop lists, and linked vehicles."
      createLabel="+ Add Route"
      emptyMessage="No transport routes found."
      fields={[
        { key: "routeName", label: "Route", required: true, placeholder: "North Corridor" },
        { key: "stops", label: "Stops", type: "textarea", required: true, placeholder: "Stop 1, Stop 2, Stop 3" },
        { key: "vehicleId", label: "Assigned Vehicle", type: "select", options: vehicles },
      ]}
      columns={[
        { label: "Route", render: (item) => item.routeName },
        { label: "Stops", render: (item) => `${item.stopsList.length} stops` },
        { label: "Assigned Vehicle", render: (item) => item.vehicleName ?? "-" },
        { label: "Driver", render: (item) => item.driverName ?? "-" },
      ]}
      emptyForm={{ routeName: "", stops: "", vehicleId: "" }}
      loadItems={listTransportRoutes}
      createItem={createRoute}
      updateItem={updateRoute}
      deleteItem={deleteRoute}
        getSearchText={(item) => `${item.routeName} ${item.stops} ${item.vehicleName ?? ""} ${item.driverName ?? ""}`}
      mapToForm={(item) => ({
        routeName: item.routeName,
        stops: item.stops,
        vehicleId: item.vehicleId ?? "",
      })}
      detailPath={(item) => `/dashboard/routes/${item.id}`}
    />
  );
};

export const ApplicantsPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [approvalTarget, setApprovalTarget] = useState<ApplicantRecord | null>(null);
  const [approvalForm, setApprovalForm] = useState({ section: "", studentPassword: "", parentPassword: "" });
  const [approvalError, setApprovalError] = useState("");
  const [approving, setApproving] = useState(false);

  const closeApprove = () => {
    setApprovalTarget(null);
    setApprovalForm({ section: "", studentPassword: "", parentPassword: "" });
    setApprovalError("");
  };

  return (
    <>
      <CrudPage<ApplicantRecord>
        key={refreshKey}
        title="Applicants"
        description="Track applicants, maintain records, and approve admissions into live student accounts."
        createLabel="+ Add Applicant"
        emptyMessage="No applicants found."
        fields={[
          { key: "name", label: "Student Name", required: true, placeholder: "Applicant name" },
          { key: "email", label: "Student Email", required: true, placeholder: "student@email.com" },
          { key: "className", label: "Class Applied", required: true, placeholder: "Class 8" },
          {
            key: "status",
            label: "Status",
            type: "select",
            required: true,
            options: [
              { label: "Pending", value: "Pending" },
              { label: "Approved", value: "Approved" },
              { label: "Rejected", value: "Rejected" },
            ],
          },
          { key: "parentName", label: "Parent Name", placeholder: "Parent name" },
          { key: "parentEmail", label: "Parent Email", placeholder: "parent@email.com" },
          { key: "parentPhone", label: "Parent Phone", placeholder: "9876543210" },
        ]}
        columns={[
          { label: "Student Name", render: (item) => item.name },
          { label: "Parent Name", render: (item) => item.parentName ?? "-" },
          { label: "Class Applied", render: (item) => item.className },
          {
            label: "Status",
            render: (item) => (
              <span
                className={
                  item.status === "Approved"
                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                    : item.status === "Rejected"
                      ? "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                      : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                }
              >
                {item.status}
              </span>
            ),
          },
          { label: "Created", render: (item) => item.createdAt ? formatShortDateFromDateString(item.createdAt.slice(0, 10)) : "-" },
        ]}
        emptyForm={{ name: "", email: "", className: "", status: "Pending", parentName: "", parentEmail: "", parentPhone: "" }}
        loadItems={listApplicants}
        createItem={createApplicant}
        updateItem={updateApplicant}
        deleteItem={deleteApplicant}
        getSearchText={(item) => `${item.name} ${item.email} ${item.className} ${item.status} ${item.parentName ?? ""}`}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Pending", value: "Pending" },
              { label: "Approved", value: "Approved" },
              { label: "Rejected", value: "Rejected" },
            ],
            getValue: (item) => item.status,
          },
        ]}
        mapToForm={(item) => ({
          name: item.name,
          email: item.email,
          className: item.className,
          status: item.status,
          parentName: item.parentName ?? "",
          parentEmail: item.parentEmail ?? "",
          parentPhone: item.parentPhone ?? "",
        })}
        detailPath={(item) => `/dashboard/applicants/${item.id}`}
        extraActions={(item, reload) =>
          <>
            {item.status !== "Approved" ? (
              <Button
                variant="ghost"
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                onClick={() => {
                  setApprovalTarget(item);
                  setApprovalForm({
                    section: "A",
                    studentPassword: "student123",
                    parentPassword: "parent123",
                  });
                }}
              >
                Approve
              </Button>
            ) : null}
            {item.status !== "Rejected" ? (
              <Button
                variant="ghost"
                className="bg-rose-50 text-rose-700 hover:bg-rose-100"
                onClick={() => {
                  if (!window.confirm(`Reject admission for ${item.name}?`)) return;
                  void rejectApplicant(item.id).then(() => reload());
                }}
              >
                Reject
              </Button>
            ) : null}
          </>
        }
      />

      <Modal
        open={Boolean(approvalTarget)}
        onClose={closeApprove}
        title="Approve Applicant"
        description="Create the linked parent and student accounts, then mark the applicant as approved."
        maxWidthClass="max-w-2xl"
      >
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!approvalTarget) return;
            setApproving(true);
            setApprovalError("");
            try {
              if (!window.confirm(`Approve ${approvalTarget.name} and create real parent + student accounts?`)) {
                setApproving(false);
                return;
              }
              await approveApplicant({
                applicantId: approvalTarget.id,
                section: approvalForm.section,
                studentPassword: approvalForm.studentPassword,
                parentPassword: approvalForm.parentPassword,
              });
              closeApprove();
              setRefreshKey((current) => current + 1);
            } catch (error) {
              setApprovalError(error instanceof Error ? error.message : "Failed to approve applicant.");
            } finally {
              setApproving(false);
            }
          }}
        >
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Student login ID will be generated automatically for this school after approval.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Section" value={approvalForm.section} onChange={(e) => setApprovalForm((c) => ({ ...c, section: e.target.value }))} required />
            <Input label="Student Password" type="password" value={approvalForm.studentPassword} onChange={(e) => setApprovalForm((c) => ({ ...c, studentPassword: e.target.value }))} required />
            <Input label="Parent Password" type="password" value={approvalForm.parentPassword} onChange={(e) => setApprovalForm((c) => ({ ...c, parentPassword: e.target.value }))} required />
          </div>
          {approvalError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{approvalError}</div> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={closeApprove}>
              Cancel
            </Button>
            <Button type="submit" disabled={approving}>{approving ? "Approving..." : "Approve"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export const AttendanceDetailPage = () => {
  const { record, error } = useDetailRecord(getAttendanceDetail);
  if (error) return <ErrorCard error={error} />;
  if (!record) return <Card className="border-slate-200 bg-white shadow-sm">Loading attendance...</Card>;
  return (
    <div className="space-y-6">
      <CrudDetailPage
        title="Attendance Detail"
        backPath="/dashboard/attendance"
        sections={[
          {
            title: "Class Info",
            fields: [
              { label: "Class", value: record.className },
              { label: "Section", value: record.section },
              { label: "Subject", value: record.subjectName },
              { label: "Teacher", value: record.teacherName ?? "-" },
              { label: "Date", value: record.date },
            ],
          },
        ]}
      />

      <DetailSection title="Students List">
        {record.rows.length === 0 ? (
          <DetailField label="Attendance" value="No attendance rows found for this session." />
        ) : (
          record.rows.map((row) => (
            <DetailField
              key={row.studentId}
              label={row.studentName}
              value={
                <span className={row.status === "Present" ? "text-emerald-700" : "text-rose-700"}>
                  {row.status}
                </span>
              }
            />
          ))
        )}
      </DetailSection>
    </div>
  );
};

export const ExamDetailPage = () => {
  const { record, error } = useDetailRecord(getExamDetail);
  const [subjects, setSubjects] = useState<ExamSubjectOption[]>([]);

  useEffect(() => {
    if (!record) return;
    void listExamSubjects(record.id)
      .then((rows) => setSubjects(rows))
      .catch(() => setSubjects([]));
  }, [record]);

  if (error) return <ErrorCard error={error} />;
  if (!record) return <Card className="border-slate-200 bg-white shadow-sm">Loading exam...</Card>;
  const marksEntryOpen = isExamMarksEntryOpen(record);
  const marksEntryMessage = getExamMarksEntryAvailabilityMessage(record);
  return (
    <div className="space-y-6">
      <CrudDetailPage
        title="Exam Detail"
        backPath="/dashboard/exams"
        sections={[
          {
            title: "Exam",
            fields: [
              { label: "Exam Name", value: record.name },
              { label: "Class", value: record.className },
              { label: "Section", value: record.section },
              { label: "Start Date", value: record.startDate },
              { label: "End Date", value: record.endDate },
              { label: "Exam Session", value: record.examSession },
              { label: "Status", value: record.status },
              { label: "Assigned Subjects", value: String(record.subjectCount) },
            ],
          },
        ]}
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Paper Schedule</h2>
            <p className="mt-2 text-sm text-slate-500">Each paper shows the exam day, session, timing, and marks teachers will assess.</p>
          </div>
          <div className="flex gap-3">
            <Link to={`/dashboard/exams/${record.id}/subjects`}>
              <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">Edit Paper Schedule</Button>
            </Link>
            {marksEntryOpen ? (
              <Link to={`/dashboard/exams/${record.id}/marks`}>
                <Button>Enter Marks</Button>
              </Link>
            ) : (
              <Button disabled title={marksEntryMessage}>Enter Marks Locked</Button>
            )}
          </div>
        </div>
        {!marksEntryOpen ? (
          <p className="mt-4 text-sm text-amber-700">{marksEntryMessage}</p>
        ) : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {subjects.length === 0 ? (
            <p className="text-sm text-slate-500">No timetable subjects found for this class and section.</p>
          ) : (
            subjects.map((subject) => (
              <div key={subject.subjectId} className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
                <p className="text-sm font-semibold text-brand-800">{subject.subjectName}</p>
                <p className="mt-1 text-xs text-brand-700">
                  {subject.examDate ? formatShortDateFromDateString(subject.examDate) : "Date not set"}
                  {" • "}
                  {subject.examSession}
                  {" • "}
                  {formatExamTimeRange(subject.startTime, subject.endTime)}
                </p>
                <p className="mt-1 text-xs text-brand-700">Max Marks: {subject.maxMarks}</p>
                <p className="mt-1 text-xs text-brand-700">
                  {subject.teacherName ? `Teacher: ${subject.teacherName}` : "Teacher not linked"}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export const ResultDetailPage = () => {
  const { record, error } = useDetailRecord(getResultDetail);
  const [exportingPdf, setExportingPdf] = useState(false);
  if (error) return <ErrorCard error={error} />;
  if (!record) return <Card className="border-slate-200 bg-white shadow-sm">Loading result...</Card>;

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      let y = 18;

      doc.setFontSize(18);
      doc.text("INDDIA ERP Report Card", 14, y);
      y += 12;

      doc.setFontSize(11);
      doc.text(`Student: ${record.studentName}`, 14, y);
      doc.text(`Class: ${record.className ?? "-"}`, 110, y);
      y += 7;
      doc.text(`Section: ${record.section ?? "-"}`, 14, y);
      doc.text(`Exam: ${record.examName}`, 110, y);
      y += 12;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y - 5, 182, 8, "F");
      doc.text("Subject", 16, y);
      doc.text("Marks", 110, y);
      doc.text("Grade", 155, y);
      y += 8;

      record.subjects.forEach((subject) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }
        doc.text(subject.subjectName, 16, y);
        doc.text(`${subject.marksObtained} / ${subject.maxMarks}`, 110, y);
        doc.text(subject.grade, 155, y);
        y += 8;
      });

      y += 6;
      doc.setFontSize(12);
      doc.text(`Total: ${record.totalMarks} / ${record.maxMarks}`, 14, y);
      y += 8;
      doc.text(`Percentage: ${record.percentage}%`, 14, y);
      y += 8;
      doc.text(`Final Grade: ${record.finalGrade}`, 14, y);
      y += 8;
      doc.text(`Result: ${record.passStatus}`, 14, y);

      doc.save(`${record.studentName.replace(/\s+/g, "-").toLowerCase()}-report-card.pdf`);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <CrudDetailPage
        title="Result Detail"
        backPath="/dashboard/results"
        action={
          <>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              Print
            </Button>
            <Button type="button" onClick={() => void handleDownloadPdf()} disabled={exportingPdf}>
              {exportingPdf ? "Generating..." : "Download PDF"}
            </Button>
          </>
        }
        sections={[
          {
            title: "Student Info",
            fields: [
              { label: "Student", value: record.studentName },
              { label: "Class", value: record.className ?? "-" },
              { label: "Section", value: record.section ?? "-" },
            ],
          },
          {
            title: "Exam Info",
            fields: [
              { label: "Exam", value: record.examName },
              { label: "Start Date", value: record.startDate },
              { label: "End Date", value: record.endDate },
              { label: "Status", value: record.examStatus },
            ],
          },
        ]}
      />

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Max Marks</th>
                <th className="px-6 py-4 font-medium">Obtained</th>
                <th className="px-6 py-4 font-medium">Grade</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {record.subjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-slate-500">No subject marks found for this student and exam.</td>
                </tr>
              ) : (
                record.subjects.map((subject) => (
                  <tr key={subject.markId ?? subject.subjectId}>
                    <td className="px-6 py-4 text-slate-700">{subject.subjectName}</td>
                    <td className="px-6 py-4 text-slate-700">{subject.maxMarks}</td>
                    <td className="px-6 py-4 text-slate-700">{subject.marksObtained}</td>
                    <td className="px-6 py-4 text-slate-700">{subject.grade}</td>
                    <td className="px-6 py-4 text-slate-700">{subject.passStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <DetailSection title="Summary">
        {record.subjects.length === 0 ? (
          <DetailField label="Report" value="Result summary will appear after marks are entered for at least one subject." />
        ) : (
          <>
            <DetailField label="Total" value={`${record.totalMarks} / ${record.maxMarks}`} />
            <DetailField label="Percentage" value={`${record.percentage}%`} />
            <DetailField label="Final Grade" value={record.finalGrade} />
            <DetailField label="Pass / Fail" value={record.passStatus} />
          </>
        )}
      </DetailSection>
    </div>
  );
};

export const FeeDetailPage = () => {
  const { role } = authStore();
  const workspace = useStaffWorkspace();
  const { id = "" } = useParams();
  const [record, setRecord] = useState<Awaited<ReturnType<typeof getFeeDetail>> | null>(null);
  const [error, setError] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setRecord(await getFeeDetail(id));
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load fee.");
      }
    };
    void run();
  }, [id]);

  if (error) return <ErrorCard error={error} />;
  if (!record) return <Card className="border-slate-200 bg-white shadow-sm">Loading fee...</Card>;
  const statusClassName =
    record.status === "Paid"
      ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
      : record.status === "Partial"
        ? "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
        : "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700";

  return (
    <div className="space-y-6">
      <CrudDetailPage
        title="Fee Detail"
        backPath="/dashboard/fees"
        sections={[
          {
            title: "Student Info",
            fields: [
              { label: "Name", value: record.studentName },
              { label: "Class", value: record.className ?? "-" },
              { label: "Section", value: record.section ?? "-" },
            ],
          },
          {
            title: "Fee Info",
            fields: [
              { label: "Total Amount", value: formatCurrency(record.totalAmount) },
              { label: "Paid Amount", value: formatCurrency(record.paidAmount) },
              {
                label: "Remaining Amount",
                value: <span className="text-rose-700">{formatCurrency(record.remainingAmount)}</span>,
              },
              {
                label: "Status",
                value: <span className={statusClassName}>{record.status ?? "-"}</span>,
              },
              { label: "Due Date", value: record.dueDate ?? "-" },
            ],
          },
        ]}
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Payment Action</h2>
        <p className="mt-2 text-sm text-slate-500">
          {role === ROLES.ADMIN || (role === ROLES.STAFF && workspace === STAFF_WORKSPACES.ACCOUNTS)
            ? "Record payments against this fee and let the status update automatically."
            : "View current payment progress for this fee record."}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            label="Enter Payment Amount"
            type="text"
            inputMode="decimal"
            value={paymentAmount}
            onChange={(event) => /^(\d+)?(\.\d{0,2})?$/.test(event.target.value) && setPaymentAmount(event.target.value)}
            placeholder="5000"
          />
          <div className="flex items-end">
            <Button
              onClick={() =>
                void (async () => {
                  setPaying(true);
                  try {
                    const updated = await addFeePayment(id, { amount: paymentAmount });
                    setRecord(updated);
                    setPaymentAmount("");
                    setError("");
                  } catch (paymentError) {
                    setError(paymentError instanceof Error ? paymentError.message : "Failed to record payment.");
                  } finally {
                    setPaying(false);
                  }
                })()
              }
              disabled={(role !== ROLES.ADMIN && !(role === ROLES.STAFF && workspace === STAFF_WORKSPACES.ACCOUNTS)) || paying || record.status === "Paid"}
            >
              {role !== ROLES.ADMIN && !(role === ROLES.STAFF && workspace === STAFF_WORKSPACES.ACCOUNTS)
                ? "Read Only"
                : paying
                  ? "Processing..."
                  : record.status === "Paid"
                    ? "Fully Paid"
                    : "Pay"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const EmployeeDetailPage = () => {
  const { record, error } = useDetailRecord(getEmployeeDetail);
  if (error) return <ErrorCard error={error} />;
  if (!record) return <Card className="border-slate-200 bg-white shadow-sm">Loading employee...</Card>;
  return <CrudDetailPage title="Employee Detail" backPath="/dashboard/employees" sections={[{ title: "Employee", fields: [
    { label: "Name", value: record.name },
    { label: "Role", value: record.role },
    { label: "Subject", value: record.subjectName ?? "-" },
    { label: "Coordinator", value: record.isClassCoordinator ? "Yes" : "No" },
    { label: "Assigned Class", value: record.assignedClass ?? "-" },
    { label: "Assigned Section", value: record.assignedSection ?? "-" },
    { label: "Email", value: record.email ?? "-" },
    { label: "Photo", value: record.photoUrl ? "Uploaded" : "-" },
  ]}]} />;
};

export const LeaveDetailPage = () => {
  const { record, error } = useDetailRecord(getLeaveDetail);
  if (error) return <ErrorCard error={error} />;
  if (!record) return <Card className="border-slate-200 bg-white shadow-sm">Loading leave...</Card>;
  const timelineState = getLeaveTimelineState(record.status);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Leave Detail"
        description="Complete leave request record with workflow stage, review comments, and final decision."
        action={
          <Link to="/dashboard/leaves">
            <Button variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
              Back to Leaves
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <DetailSection title="Employee">
          <DetailField label="Employee Name" value={record.employeeName} />
          <DetailField label="Role" value={record.role ?? "-"} />
          <DetailField label="Current Stage" value={leaveStatusMeta[record.status].stage} />
          <DetailField
            label="Status"
            value={<span className={leaveStatusMeta[record.status].className}>{leaveStatusMeta[record.status].label}</span>}
          />
        </DetailSection>

        <DetailSection title="Leave Details">
          <DetailField label="From Date" value={record.startDate} />
          <DetailField label="To Date" value={record.endDate} />
          <DetailField label="Reason" value={record.reason ?? "-"} />
          <DetailField label="HR Comment" value={record.hrComment?.trim() || "No HR comment added."} />
          <DetailField label="Admin Comment" value={record.adminComment?.trim() || "No admin comment added."} />
        </DetailSection>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Approval Flow</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Staff to HR to Admin Timeline</h2>
          <p className="mt-2 text-sm text-slate-500">
            Every leave request moves through a staged approval workflow without skipping levels.
          </p>
        </div>
        <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
          {leaveTimelineSteps.map((step) => {
            const state = timelineState[step.key];

            return (
              <div key={step.key} className={`rounded-3xl border p-5 ${getLeaveTimelineCardClassName(state)}`}>
                <div className="flex items-center gap-3">
                  <span className={`h-4 w-4 rounded-full border-2 ${getLeaveTimelineDotClassName(state)}`} />
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                </div>
                <p className="mt-3 text-sm text-slate-600">{step.description}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {state === "complete" ? "Completed" : state === "current" ? "In Progress" : "Waiting"}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export const SalaryDetailPage = () => {
  const { record, error } = useDetailRecord(getSalaryDetail);
  if (error) return <ErrorCard error={error} />;
  if (!record) return <Card className="border-slate-200 bg-white shadow-sm">Loading salary...</Card>;
  return <CrudDetailPage title="Salary Detail" backPath="/dashboard/salary" sections={[{ title: "Salary", fields: [
    { label: "Employee", value: record.employeeName },
    { label: "Role", value: record.role ?? "-" },
    { label: "Amount", value: formatCurrency(record.amount) },
    { label: "Month", value: record.month },
    { label: "Status", value: record.status },
  ]}]} />;
};

export const VehicleDetailPage = () => {
  const { record, error } = useDetailRecord(getVehicleDetail);
  if (error) return <ErrorCard error={error} />;
  if (!record) return <Card className="border-slate-200 bg-white shadow-sm">Loading vehicle...</Card>;

  return (
    <div className="space-y-6">
      <CrudDetailPage
        title="Vehicle Detail"
        backPath="/dashboard/vehicles"
        sections={[
          {
            title: "Vehicle",
            fields: [
              { label: "Vehicle Number", value: record.vehicle.vehicleName },
              { label: "Driver Name", value: record.vehicle.driverName },
              { label: "Driver Phone", value: record.vehicle.driverPhone ?? "-" },
              { label: "Capacity", value: record.vehicle.capacity },
              { label: "Status", value: record.vehicle.status ?? "-" },
            ],
          },
        ]}
      />

      <DetailSection title="Assigned Routes">
        {record.assignedRoutes.length === 0 ? (
          <DetailField label="Routes" value="No routes are currently assigned to this vehicle." />
        ) : (
          record.assignedRoutes.map((route) => (
            <DetailField
              key={route.id}
              label={route.routeName}
              value={
                <span className="text-slate-700">
                  {route.stopsList.length} stops linked to this vehicle
                </span>
              }
            />
          ))
        )}
      </DetailSection>
    </div>
  );
};

export const RouteDetailPage = () => {
  const { record, error } = useDetailRecord(getRouteDetail);
  if (error) return <ErrorCard error={error} />;
  if (!record) return <Card className="border-slate-200 bg-white shadow-sm">Loading route...</Card>;

  return (
    <div className="space-y-6">
      <CrudDetailPage
        title="Route Detail"
        backPath="/dashboard/routes"
        sections={[
          {
            title: "Route",
            fields: [
              { label: "Route", value: record.route.routeName },
              { label: "Assigned Vehicle", value: record.route.vehicleName ?? "-" },
              { label: "Driver", value: record.route.driverName ?? "-" },
              { label: "Driver Phone", value: record.route.driverPhone ?? "-" },
              { label: "Vehicle Status", value: record.route.vehicleStatus ?? "-" },
            ],
          },
        ]}
      />

      <DetailSection title="Stops List">
        {record.route.stopsList.length === 0 ? (
          <DetailField label="Stops" value="No stops added for this route." />
        ) : (
          record.route.stopsList.map((stop, index) => (
            <DetailField key={`${record.route.id}-${stop}-${index}`} label={`Stop ${index + 1}`} value={stop} />
          ))
        )}
      </DetailSection>

      <DetailSection title="Vehicle Info">
        <DetailField label="Vehicle Number" value={record.vehicle?.vehicleName ?? "No vehicle assigned"} />
        <DetailField label="Capacity" value={record.vehicle ? String(record.vehicle.capacity) : "-"} />
        <DetailField label="Availability" value={record.vehicle?.status ?? "-"} />
      </DetailSection>
    </div>
  );
};

export const ApplicantDetailPage = () => {
  const { record, error } = useDetailRecord(getApplicantDetail);
  if (error) return <ErrorCard error={error} />;
  if (!record) return <Card className="border-slate-200 bg-white shadow-sm">Loading applicant...</Card>;
  return <CrudDetailPage title="Applicant Detail" backPath="/dashboard/applicants" sections={[
    { title: "Student Info", fields: [
      { label: "Student Name", value: record.name },
      { label: "Student Email", value: record.email },
      { label: "Class Applied", value: record.className },
      { label: "Status", value: record.status },
      { label: "Applied On", value: record.createdAt ? formatShortDateFromDateString(record.createdAt.slice(0, 10)) : "-" },
    ]},
    { title: "Parent Info", fields: [
      { label: "Parent Name", value: record.parentName ?? "-" },
      { label: "Parent Email", value: record.parentEmail ?? "-" },
      { label: "Parent Phone", value: record.parentPhone ?? "-" },
    ]},
  ]} />;
};
