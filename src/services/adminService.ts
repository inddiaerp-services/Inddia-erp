import { ROLES } from "../config/roles";
import { normalizeStaffWorkspace, STAFF_WORKSPACES } from "../config/staffWorkspaces";
import { authStore } from "../store/authStore";
import { supabase } from "./supabaseClient";
import { addDaysToDateString, formatShortDateFromDateString, getIndiaTodayIso, getMonthDates, getWeekdayFromDateString } from "../utils/date";
import type {
  AnalyticsDashboard,
  AuditLogRecord,
  ApplicantFormValues,
  ApplicantApprovalValues,
  ApplicantRecord,
  AttendanceFormValues,
  AttendanceMonthCell,
  AttendanceMonthGrid,
  AttendanceGeoSettings,
  ClassDetail,
  ClassFormValues,
  ClassRecord,
  AttendanceRecord,
  AttendanceRosterRow,
  AttendanceSession,
  AttendanceSubjectOption,
  EmployeeFormValues,
  EmployeeRecord,
  ExamFormValues,
  ExamGroupDetail,
  ExamGroupRecord,
  ExamMarksRow,
  ExamMarksSession,
  ExamRecord,
  ExamScheduleRecord,
  ExamSubjectOption,
  FeeFormValues,
  FeePaymentValues,
  FeeRecord,
  HolidayFormValues,
  HolidayRecord,
  LeaveFormValues,
  LeaveImpactDetail,
  LeaveRecord,
  NotificationRecord,
  ResultFormValues,
  ResultDetail,
  ResultRecord,
  RouteFormValues,
  RouteRecord,
  SalaryFormValues,
  SalaryRecord,
  StaffFormValues,
  StaffRecord,
  StudentFormValues,
  StudentRecord,
  SubjectFormValues,
  SubjectRecord,
  TimetableAccess,
  TimetableClassOption,
  TimetableDay,
  TimetableFormValues,
  TimetableImpactRecord,
  TimetableSlotRecord,
  VehicleDetail,
  VehicleFormValues,
  RouteDetail,
  VehicleRecord,
} from "../types/admin";

type UsersRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  school_id: string | null;
  photo_url: string | null;
};

type SubjectRow = {
  id: string;
  name: string;
};

type HolidayRow = {
  id: string;
  holiday_date: string;
  title: string;
  description: string | null;
  created_at?: string | null;
};

type ClassRow = {
  id: string;
  class_name: string;
  section: string;
  room_number: string | null;
  floor: string | null;
  capacity: number | null;
  created_at?: string | null;
};

type StaffRow = {
  id: string;
  user_id: string;
  name: string | null;
  role: string | null;
  mobile_number: string | null;
  date_of_joining: string | null;
  monthly_salary: number | string | null;
  subject_id: string | null;
  is_class_coordinator: boolean | null;
  assigned_class: string | null;
  assigned_section: string | null;
};

type ParentRow = {
  id: string;
  user_id: string | null;
  school_id?: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  father_name?: string | null;
  father_aadhar_number?: string | null;
  father_occupation?: string | null;
  father_education?: string | null;
  father_mobile_number?: string | null;
  father_profession?: string | null;
  father_income?: number | string | null;
  mother_name?: string | null;
  mother_aadhar_number?: string | null;
  mother_occupation?: string | null;
  mother_education?: string | null;
  mother_mobile_number?: string | null;
  mother_profession?: string | null;
  mother_income?: number | string | null;
};

type StudentRow = {
  id: string;
  user_id: string;
  school_id?: string | null;
  name: string | null;
  student_code?: string | null;
  class: string | null;
  section: string | null;
  admission_date?: string | null;
  discount_fee?: number | string | null;
  aadhar_number?: string | null;
  date_of_birth?: string | null;
  birth_id?: string | null;
  is_orphan?: boolean | null;
  gender?: string | null;
  caste?: string | null;
  osc?: "A" | "B" | "C" | null;
  identification_mark?: string | null;
  previous_school?: string | null;
  region?: string | null;
  blood_group?: string | null;
  previous_board_roll_no?: string | null;
  address?: string | null;
  parent_id: string | null;
};

type TimetableRow = {
  id: string;
  class: string;
  section: string;
  subject_id: string | null;
  teacher_id: string | null;
  day: string;
  start_time: string;
  end_time: string;
  is_break?: boolean | null;
  break_type?: "Short Break" | "Lunch Break" | null;
  break_label?: string | null;
  is_cancelled?: boolean | null;
  cancellation_reason?: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  subject_id: string | null;
  date: string | null;
  status: string | null;
  teacher_id: string | null;
  created_at?: string | null;
};

type SchoolGeoRow = {
  attendance_map_link: string | null;
  attendance_geo_latitude: number | null;
  attendance_geo_longitude: number | null;
  attendance_geo_radius_meters: number | null;
};

type ResultRow = {
  id: string;
  student_id: string;
  subject_id: string | null;
  exam_id: string | null;
  exam?: string | null;
  marks: number | null;
  grade: string | null;
  created_at?: string | null;
};

type FeeRow = {
  id: string;
  student_id: string;
  total_amount?: number | string | null;
  paid_amount?: number | string | null;
  amount?: number | string | null;
  status: string | null;
  due_date: string | null;
  created_at?: string | null;
};

type ExamRow = {
  id: string;
  name: string;
  class: string;
  section?: string | null;
  date?: string | null;
  exam_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  exam_session?: "Full Day" | "Morning" | "Afternoon" | null;
  status?: "Draft" | "Ongoing" | "Completed" | null;
  created_at?: string | null;
};

type MarkRow = {
  id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  marks_obtained: number | null;
  grade: string | null;
  created_at?: string | null;
};

type ExamSubjectRow = {
  id: string;
  exam_id: string;
  subject_id: string;
  max_marks: number | null;
  exam_date?: string | null;
  exam_session?: "Full Day" | "Morning" | "Afternoon" | null;
  start_time?: string | null;
  end_time?: string | null;
};

type EmployeeRow = {
  id: string;
  name: string;
  role: string;
  department?: string;
  email: string | null;
  phone?: string | null;
};

type LeaveRow = {
  id: string;
  employee_id?: string | null;
  staff_id?: string | null;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  hr_comment?: string | null;
  admin_comment?: string | null;
};

type NotificationRow = {
  id: string;
  type: string | null;
  module?: string | null;
  message: string | null;
  user_id?: string | null;
  receiver_id: string | null;
  related_leave_id: string | null;
  related_fee_id?: string | null;
  dedupe_key?: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  record_id: string | null;
  created_at: string | null;
};

type AnalyticsOverviewRow = {
  total_students: number | string | null;
  total_staff: number | string | null;
  total_fees_collected: number | string | null;
  pending_fees: number | string | null;
};

type AnalyticsMonthlyFeeRow = {
  month_start: string | null;
  collected_amount: number | string | null;
};

type AnalyticsAttendanceRow = {
  status: string | null;
  total_count: number | string | null;
  percentage: number | string | null;
};

type AnalyticsPerformanceRow = {
  subject_id: string | null;
  subject_name: string | null;
  average_marks: number | string | null;
};

type TimetableAdjustmentRow = {
  id: string;
  leave_id: string;
  timetable_id: string;
  impact_date: string;
  status: "Pending_Action" | "Rescheduled" | "Cancelled" | null;
  replacement_teacher_id: string | null;
  replacement_subject_id: string | null;
  replacement_start_time: string | null;
  replacement_end_time: string | null;
  note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
};

type SalaryRow = {
  id: string;
  employee_id?: string | null;
  staff_id?: string | null;
  amount: number | string;
  month: string;
  status: string;
};

type VehicleRow = {
  id: string;
  vehicle_name?: string | null;
  vehicle_number?: string | null;
  driver_name: string;
  driver_phone?: string | null;
  capacity: number;
  status?: "Active" | "Maintenance" | string | null;
};

type RouteRow = {
  id: string;
  route_name: string;
  stops: string;
  vehicle_id: string | null;
  created_at?: string | null;
};

const deriveStudentCode = (email: string | null | undefined) => {
  const localPart = String(email ?? "").trim().split("@")[0] ?? "";
  return localPart ? localPart.toUpperCase() : null;
};

const parseNullableNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

type ApplicantRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  class?: string | null;
  student_name?: string | null;
  class_applied?: string | null;
  status: string;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  created_at?: string | null;
};

type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  path: string;
};

type DashboardActivity = {
  module: string;
  owner: string;
  status: string;
  time: string;
};

export type DashboardOverview = {
  stats: DashboardMetric[];
  recentActivity: DashboardActivity[];
};

const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add your project URL and anon key.");
  }

  return supabase;
};

const getCurrentSchoolId = () => authStore.getState().school?.id ?? authStore.getState().user?.schoolId ?? null;

const isMissingSchoolForeignKeyError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("foreign key constraint") &&
    normalized.includes("school_id") &&
    normalized.includes("subjects")
  );
};

const requireCurrentSchoolId = () => {
  const schoolId = getCurrentSchoolId();
  if (!schoolId) {
    throw new Error("School context is missing. Sign in again.");
  }
  return schoolId;
};

const SCHOOL_CACHE_TTL_MS = 15000;
const schoolScopedCache = new Map<string, { expiresAt: number; value?: unknown; promise?: Promise<unknown> }>();

const getSchoolCacheKey = (namespace: string, schoolId: string) => `${schoolId}::${namespace}`;

const readSchoolScopedCache = async <T>(namespace: string, loader: () => Promise<T>): Promise<T> => {
  const schoolId = requireCurrentSchoolId();
  const cacheKey = getSchoolCacheKey(namespace, schoolId);
  const now = Date.now();
  const cached = schoolScopedCache.get(cacheKey);

  if (cached?.value !== undefined && cached.expiresAt > now) {
    return cached.value as T;
  }

  if (cached?.promise) {
    return cached.promise as Promise<T>;
  }

  const promise = loader()
    .then((value) => {
      schoolScopedCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + SCHOOL_CACHE_TTL_MS,
      });
      return value;
    })
    .catch((error) => {
      schoolScopedCache.delete(cacheKey);
      throw error;
    });

  schoolScopedCache.set(cacheKey, {
    expiresAt: now + SCHOOL_CACHE_TTL_MS,
    promise,
  });

  return promise;
};

const invalidateSchoolScopedCache = (namespaces?: string[]) => {
  const schoolId = getCurrentSchoolId();
  if (!schoolId) return;

  if (!namespaces?.length) {
    Array.from(schoolScopedCache.keys())
      .filter((key) => key.startsWith(`${schoolId}::`))
      .forEach((key) => schoolScopedCache.delete(key));
    return;
  }

  namespaces.forEach((namespace) => {
    schoolScopedCache.delete(getSchoolCacheKey(namespace, schoolId));
  });
};

const buildDateRange = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDaysToDateString(cursor, 1);
  }

  return dates;
};

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

const formatMonthKey = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(date);
};

const isAuditLogUserForeignKeyError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("audit_logs_user_id_fkey") ||
    (normalized.includes("audit_logs") &&
      normalized.includes("foreign key") &&
      normalized.includes("user_id"))
  );
};

const logAuditEvent = async (
  action: "CREATE" | "UPDATE" | "DELETE",
  module: string,
  recordId?: string | null,
  actorUserId?: string | null,
) => {
  const client = requireSupabase();
  const resolvedUserId = actorUserId ?? authStore.getState().user?.id ?? null;
  const resolvedSchoolId = getCurrentSchoolId();

  if (!resolvedUserId || !resolvedSchoolId) {
    return;
  }

  const { error } = await client.from("audit_logs").insert({
    school_id: resolvedSchoolId,
    user_id: resolvedUserId,
    action,
    module,
    record_id: recordId ?? null,
  });

  if (error) {
    if (isAuditLogUserForeignKeyError(error.message)) {
      return;
    }
    throw new Error(error.message);
  }
};

const normalizeApplicantStatus = (status: string | null | undefined) => {
  const value = (status ?? "").trim().toLowerCase();
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending";
};

const getActiveSession = async () => {
  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (session?.access_token) {
    return session;
  }

  return authStore.getState().session;
};

const refreshActiveSession = async () => {
  const client = requireSupabase();
  const currentSession = authStore.getState().session ?? (await client.auth.getSession()).data.session;

  if (!currentSession?.refresh_token) {
    return null;
  }

  const {
    data: { session },
    error,
  } = await client.auth.refreshSession({ refresh_token: currentSession.refresh_token });

  if (error) {
    return null;
  }

  return session;
};

const getAdminApiEndpoints = () => {
  const port = import.meta.env.VITE_ADMIN_API_PORT ?? "8787";
  return Array.from(new Set(["/api/admin", `http://localhost:${port}/api/admin`]));
};

const postToAdminApi = async (body: string, accessToken: string) => {
  let lastError: unknown = null;

  for (const endpoint of getAdminApiEndpoints()) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body,
      });

      if (response.status === 404 && endpoint.startsWith("/")) {
        lastError = new Error(`Admin API route not found at ${endpoint}.`);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof TypeError) {
    throw new Error(
      "Unable to reach the local admin API. Start `npm run dev`, or run `npm run dev:server` so `http://localhost:8787/api/admin` is available, then refresh the page.",
    );
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to reach the admin API.");
};

const parseAdminApiResponse = async <T>(response: Response) => {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  let result: { data?: T; error?: string } = { data: undefined };

  if (raw) {
    if (contentType.includes("application/json")) {
      result = JSON.parse(raw) as { data?: T; error?: string };
    } else {
      result = { error: raw };
    }
  }

  return result;
};

const invokeAdminAction = async <T>(action: string, payload: Record<string, unknown>) => {
  const session = await getActiveSession();

  if (!session?.access_token) {
    throw new Error("Admin session not found. Sign in again.");
  }

  let response: Response;
  try {
    response = await postToAdminApi(JSON.stringify({ action, payload }), session.access_token);
  } catch (error) {
    throw error;
  }
  let result = await parseAdminApiResponse<T>(response);

  const isUnauthorized =
    response.status === 401 ||
    String(result.error ?? "").trim().toLowerCase() === "unauthorized.";

  if (isUnauthorized) {
    const refreshedSession = await refreshActiveSession();
    if (refreshedSession?.access_token && refreshedSession.access_token !== session.access_token) {
      response = await postToAdminApi(JSON.stringify({ action, payload }), refreshedSession.access_token);
      result = await parseAdminApiResponse<T>(response);
    }
  }

  if (!response.ok || result.error) {
    const backendMissingMessage =
      "Admin setup is incomplete. Create `.env.server` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, then run `npm run dev:server`.";

    if (response.status >= 500) {
      throw new Error(
        result.error?.trim()
          ? `${backendMissingMessage} Server response: ${result.error.trim()}`
          : backendMissingMessage,
      );
    }

    throw new Error(result.error ?? `Admin action failed (${response.status} ${response.statusText}).`);
  }

  return result.data as T;
};

const invokeServerAction = async <T>(action: string, payload: Record<string, unknown>) => {
  const session = await getActiveSession();

  if (!session?.access_token) {
    throw new Error("Session not found. Sign in again.");
  }

  let response: Response;
  try {
    response = await postToAdminApi(JSON.stringify({ action, payload }), session.access_token);
  } catch (error) {
    throw error;
  }
  let result = await parseAdminApiResponse<T>(response);

  const isUnauthorized =
    response.status === 401 ||
    String(result.error ?? "").trim().toLowerCase() === "unauthorized.";

  if (isUnauthorized) {
    const refreshedSession = await refreshActiveSession();
    if (refreshedSession?.access_token && refreshedSession.access_token !== session.access_token) {
      response = await postToAdminApi(JSON.stringify({ action, payload }), refreshedSession.access_token);
      result = await parseAdminApiResponse<T>(response);
    }
  }

  if (!response.ok || result.error) {
    throw new Error(result.error ?? `Server action failed (${response.status} ${response.statusText}).`);
  }

  return result.data as T;
};

export const getAttendanceGeoSettings = async (): Promise<AttendanceGeoSettings> => {
  const client = requireSupabase();
  const schoolId = authStore.getState().school?.id ?? authStore.getState().user?.schoolId ?? null;

  if (!schoolId) {
    return {
      mapLink: null,
      latitude: null,
      longitude: null,
      radiusMeters: null,
      isEnabled: false,
    };
  }

  const { data, error } = await client
    .from("schools")
    .select("attendance_map_link, attendance_geo_latitude, attendance_geo_longitude, attendance_geo_radius_meters")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const row = data as SchoolGeoRow | null;
  const latitude = row?.attendance_geo_latitude ?? null;
  const longitude = row?.attendance_geo_longitude ?? null;
  const radiusMeters = row?.attendance_geo_radius_meters ?? null;

  return {
    mapLink: row?.attendance_map_link ?? null,
    latitude,
    longitude,
    radiusMeters,
    isEnabled: latitude !== null && longitude !== null && radiusMeters !== null && radiusMeters > 0,
  };
};

const isAdminApiUnavailable = (error: unknown) =>
  error instanceof Error &&
  (/Admin action failed \(500 Internal Server Error\)/.test(error.message) ||
    /Failed to fetch/i.test(error.message) ||
    /NetworkError/i.test(error.message));

const mapSubject = (subject: SubjectRow): SubjectRecord => ({
  id: subject.id,
  name: subject.name,
});

const getUsersMap = async (userIds: string[]) => {
  if (userIds.length === 0) return new Map<string, UsersRow>();
  const client = requireSupabase();
  const schoolId = getCurrentSchoolId();

  let query = client
    .from("users")
    .select("id, name, email, phone, role, school_id, photo_url")
    .in("id", userIds);

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return new Map((data as UsersRow[]).map((item) => [item.id, item]));
};

const getSubjectsMap = async (subjectIds: string[]) => {
  if (subjectIds.length === 0) return new Map<string, SubjectRow>();
  const client = requireSupabase();
  const schoolId = getCurrentSchoolId();

  let query = client.from("subjects").select("id, name").in("id", subjectIds);
  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return new Map((data as SubjectRow[]).map((item) => [item.id, item]));
};

const getParentsMap = async (parentIds: string[]) => {
  if (parentIds.length === 0) return new Map<string, ParentRow>();
  const client = requireSupabase();
  const schoolId = getCurrentSchoolId();

  let query = client
    .from("parents")
    .select("id, user_id, school_id, name, email, phone, father_name, father_aadhar_number, father_occupation, father_education, father_mobile_number, father_profession, father_income, mother_name, mother_aadhar_number, mother_occupation, mother_education, mother_mobile_number, mother_profession, mother_income")
    .in("id", parentIds);

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return new Map((data as ParentRow[]).map((item) => [item.id, item]));
};

const mapStudentRecord = (
  item: StudentRow,
  studentUser: UsersRow | undefined,
  parent: ParentRow | null,
): StudentRecord => ({
  id: item.id,
  userId: item.user_id,
  name: item.name ?? studentUser?.name ?? "Unnamed student",
  photoUrl: studentUser?.photo_url ?? null,
  schoolId: item.student_code ?? deriveStudentCode(studentUser?.email),
  className: item.class,
  section: item.section,
  admissionDate: item.admission_date ?? null,
  discountFee: parseNullableNumber(item.discount_fee),
  studentAadharNumber: item.aadhar_number ?? null,
  dateOfBirth: item.date_of_birth ?? null,
  birthId: item.birth_id ?? null,
  isOrphan: Boolean(item.is_orphan),
  gender: item.gender ?? null,
  caste: item.caste ?? null,
  osc: item.osc ?? null,
  identificationMark: item.identification_mark ?? null,
  previousSchool: item.previous_school ?? null,
  region: item.region ?? null,
  bloodGroup: item.blood_group ?? null,
  previousBoardRollNo: item.previous_board_roll_no ?? null,
  address: item.address ?? null,
  parentId: item.parent_id,
  parentUserId: parent?.user_id ?? null,
  parentName: parent?.father_name ?? parent?.name ?? null,
  parentEmail: parent?.email ?? null,
  parentPhone: parent?.phone ?? null,
  fatherName: parent?.father_name ?? parent?.name ?? null,
  fatherAadharNumber: parent?.father_aadhar_number ?? null,
  fatherOccupation: parent?.father_occupation ?? null,
  fatherEducation: parent?.father_education ?? null,
  fatherMobileNumber: parent?.father_mobile_number ?? parent?.phone ?? null,
  fatherProfession: parent?.father_profession ?? null,
  fatherIncome: parseNullableNumber(parent?.father_income),
  fatherEmail: parent?.email ?? null,
  motherName: parent?.mother_name ?? null,
  motherAadharNumber: parent?.mother_aadhar_number ?? null,
  motherOccupation: parent?.mother_occupation ?? null,
  motherEducation: parent?.mother_education ?? null,
  motherMobileNumber: parent?.mother_mobile_number ?? null,
  motherProfession: parent?.mother_profession ?? null,
  motherIncome: parseNullableNumber(parent?.mother_income),
});

const mapHoliday = (row: HolidayRow): HolidayRecord => ({
  id: row.id,
  holidayDate: row.holiday_date,
  title: row.title,
  description: row.description,
});

const validateHolidayForm = (values: HolidayFormValues) => {
  const holidayDate = values.holidayDate.trim();
  const title = values.title.trim();
  const description = values.description.trim();

  if (!holidayDate) throw new Error("Holiday date is required.");
  if (!title) throw new Error("Holiday title is required.");

  return {
    holidayDate,
    title,
    description: description || null,
  };
};

const mapClass = (
  row: ClassRow,
  coordinator?: StaffRecord | null,
): ClassRecord => ({
  id: row.id,
  className: row.class_name,
  section: row.section,
  roomNumber: row.room_number,
  floor: row.floor,
  capacity: row.capacity,
  coordinatorId: coordinator?.id ?? null,
  coordinatorName: coordinator?.name ?? null,
});

const validateClassForm = (values: ClassFormValues) => {
  const className = values.className.trim();
  const section = values.section.trim();
  const roomNumber = values.roomNumber.trim();
  const floor = values.floor.trim();
  const capacityValue = values.capacity.trim();
  const coordinatorId = values.coordinatorId.trim();

  if (!className) throw new Error("Class name is required.");
  if (!section) throw new Error("Section is required.");

  if (capacityValue) {
    const capacity = Number(capacityValue);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error("Capacity must be a positive whole number.");
    }
  }

  return {
    className,
    section,
    roomNumber: roomNumber || null,
    floor: floor || null,
    capacity: capacityValue ? Number(capacityValue) : null,
    coordinatorId: coordinatorId || null,
  };
};

const syncClassCoordinator = async (
  className: string,
  section: string,
  coordinatorId: string | null,
  previousAssignment?: { className: string; section: string } | null,
) => {
  const client = requireSupabase();

  if (
    previousAssignment &&
    (previousAssignment.className !== className || previousAssignment.section !== section)
  ) {
    const { error: clearPreviousClassError } = await client
      .from("staff")
      .update({
        is_class_coordinator: false,
        assigned_class: null,
        assigned_section: null,
      })
      .eq("assigned_class", previousAssignment.className)
      .eq("assigned_section", previousAssignment.section);

    if (clearPreviousClassError) throw new Error(clearPreviousClassError.message);
  }

  const { error: clearClassError } = await client
    .from("staff")
    .update({
      is_class_coordinator: false,
      assigned_class: null,
      assigned_section: null,
    })
    .eq("assigned_class", className)
    .eq("assigned_section", section);

  if (clearClassError) throw new Error(clearClassError.message);

  if (!coordinatorId) {
    return;
  }

  const { error: clearPreviousAssignmentError } = await client
    .from("staff")
    .update({
      is_class_coordinator: false,
      assigned_class: null,
      assigned_section: null,
    })
    .eq("id", coordinatorId);

  if (clearPreviousAssignmentError) throw new Error(clearPreviousAssignmentError.message);

  const { error: assignError } = await client
    .from("staff")
    .update({
      is_class_coordinator: true,
      assigned_class: className,
      assigned_section: section,
    })
    .eq("id", coordinatorId)
    .eq("role", "Teacher");

  if (assignError) throw new Error(assignError.message);
};

export const listClasses = async (): Promise<ClassRecord[]> => {
  return readSchoolScopedCache("classes", async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const { data, error } = await client
      .from("classes")
      .select("id, class_name, section, room_number, floor, capacity, created_at")
      .eq("school_id", schoolId)
      .order("class_name")
      .order("section");

    if (error) throw new Error(error.message);

    const classRows = (data ?? []) as ClassRow[];
    const staffRows = await listStaff();
    const coordinatorMap = new Map(
      staffRows
        .filter((item) => item.isClassCoordinator && item.assignedClass && item.assignedSection)
        .map((item) => [`${item.assignedClass}::${item.assignedSection}`, item]),
    );

    return classRows.map((row) =>
      mapClass(row, coordinatorMap.get(`${row.class_name}::${row.section}`) ?? null),
    );
  });
};

export const getClassDetail = async (classId: string): Promise<ClassDetail> => {
  const client = requireSupabase();
  const schoolId = requireCurrentSchoolId();
  const { data, error } = await client
    .from("classes")
    .select("id, class_name, section, room_number, floor, capacity, created_at")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Class not found.");
  }

  const classRow = data as ClassRow;
  const [staffRows, students] = await Promise.all([listStaff(), listStudents()]);
  const coordinator =
    staffRows.find(
      (item) =>
        item.isClassCoordinator &&
        item.assignedClass === classRow.class_name &&
        item.assignedSection === classRow.section,
    ) ?? null;

  return {
    classRecord: mapClass(classRow, coordinator),
    coordinator,
    students: students.filter(
      (student) => student.className === classRow.class_name && student.section === classRow.section,
    ),
  };
};

export const createClass = async (values: ClassFormValues) =>
  (async () => {
    const payload = validateClassForm(values);
    const classRecord = await invokeAdminAction<ClassRecord>("create_class", values);

    await syncClassCoordinator(payload.className, payload.section, payload.coordinatorId);
    invalidateSchoolScopedCache(["classes", "staff"]);
    const refreshedClassRecord = await getClassDetail(classRecord.id).then((detail) => detail.classRecord);
    await logAuditEvent("CREATE", "CLASS", refreshedClassRecord.id);
    return refreshedClassRecord;
  })();

export const updateClass = async (classId: string, values: ClassFormValues) =>
  (async () => {
    const client = requireSupabase();
    const current = await getClassDetail(classId);
    const payload = validateClassForm(values);
    await invokeAdminAction<ClassRecord>("update_class", { id: classId, ...values });

    const classChanged =
      current.classRecord.className !== payload.className ||
      current.classRecord.section !== payload.section;

    if (classChanged) {
      const [studentsUpdate, timetableUpdate] = await Promise.all([
        client
          .from("students")
          .update({
            class: payload.className,
            section: payload.section,
          })
          .eq("class", current.classRecord.className)
          .eq("section", current.classRecord.section),
        client
          .from("timetable")
          .update({
            class: payload.className,
            section: payload.section,
          })
          .eq("class", current.classRecord.className)
          .eq("section", current.classRecord.section),
      ]);

      if (studentsUpdate.error) throw new Error(studentsUpdate.error.message);
      if (timetableUpdate.error) throw new Error(timetableUpdate.error.message);
    }

    await syncClassCoordinator(payload.className, payload.section, payload.coordinatorId, {
      className: current.classRecord.className,
      section: current.classRecord.section,
    });
    invalidateSchoolScopedCache(["classes", "students", "staff"]);
    const classRecord = await getClassDetail(classId).then((detail) => detail.classRecord);
    await logAuditEvent("UPDATE", "CLASS", classRecord.id);
    return classRecord;
  })();

export const deleteClass = async (classId: string) =>
  (async () => {
    const detail = await getClassDetail(classId);
    if (detail.students.length > 0) {
      throw new Error("Cannot delete this class while students are assigned to it.");
    }

    const timetableRows = await listTimetableSlots({
      className: detail.classRecord.className,
      section: detail.classRecord.section,
    });
    if (detail.coordinator || timetableRows.length > 0) {
      throw new Error("Remove the linked coordinator and timetable slots before deleting this class.");
    }

    await invokeAdminAction<void>("delete_class", { id: classId });
    invalidateSchoolScopedCache(["classes", "staff"]);
    await logAuditEvent("DELETE", "CLASS", classId);
  })();

export const listSubjects = async (): Promise<SubjectRecord[]> => {
  return readSchoolScopedCache("subjects", async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const { data, error } = await client.from("subjects").select("id, name").eq("school_id", schoolId).order("name");
    if (error) throw new Error(error.message);
    return (data as SubjectRow[]).map(mapSubject);
  });
};

export const listHolidays = async (): Promise<HolidayRecord[]> => {
  return readSchoolScopedCache("holidays", async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const { data, error } = await client
      .from("holidays")
      .select("id, holiday_date, title, description, created_at")
      .eq("school_id", schoolId)
      .order("holiday_date");

    if (error) throw new Error(error.message);
    return ((data ?? []) as HolidayRow[]).map(mapHoliday);
  });
};

export const getHolidayByDate = async (date: string) => {
  const client = requireSupabase();
  const schoolId = requireCurrentSchoolId();
  const { data, error } = await client
    .from("holidays")
    .select("id, holiday_date, title, description, created_at")
    .eq("school_id", schoolId)
    .eq("holiday_date", date)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapHoliday(data as HolidayRow) : null;
};

export const createHoliday = async (values: HolidayFormValues) =>
  (async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const payload = validateHolidayForm(values);
    const { data, error } = await client
      .from("holidays")
      .insert({
        school_id: schoolId,
        holiday_date: payload.holidayDate,
        title: payload.title,
        description: payload.description,
      })
      .select("id, holiday_date, title, description, created_at")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Unable to create holiday.");
    invalidateSchoolScopedCache(["holidays"]);
    const holiday = mapHoliday(data as HolidayRow);
    await logAuditEvent("CREATE", "HOLIDAY", holiday.id);
    return holiday;
  })();

export const updateHoliday = async (holidayId: string, values: HolidayFormValues) =>
  (async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const payload = validateHolidayForm(values);
    const { data, error } = await client
      .from("holidays")
      .update({
        holiday_date: payload.holidayDate,
        title: payload.title,
        description: payload.description,
      })
      .eq("id", holidayId)
      .eq("school_id", schoolId)
      .select("id, holiday_date, title, description, created_at")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Unable to update holiday.");
    invalidateSchoolScopedCache(["holidays"]);
    const holiday = mapHoliday(data as HolidayRow);
    await logAuditEvent("UPDATE", "HOLIDAY", holiday.id);
    return holiday;
  })();

export const deleteHoliday = async (holidayId: string) =>
  (async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const { error } = await client.from("holidays").delete().eq("id", holidayId).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    invalidateSchoolScopedCache(["holidays"]);
    await logAuditEvent("DELETE", "HOLIDAY", holidayId);
  })();

export const getSubjectDetail = async (subjectId: string) => {
  const client = requireSupabase();
  const schoolId = requireCurrentSchoolId();
  const { data: subject, error: subjectError } = await client
    .from("subjects")
    .select("id, name")
    .eq("id", subjectId)
    .eq("school_id", schoolId)
    .single();

  if (subjectError || !subject) {
    throw new Error(subjectError?.message ?? "Subject not found.");
  }

  const { data: staffRows, error: staffError } = await client
    .from("staff")
    .select("id, user_id, name, role, mobile_number, date_of_joining, monthly_salary, subject_id, is_class_coordinator, assigned_class, assigned_section")
    .eq("school_id", schoolId)
    .eq("subject_id", subjectId)
    .order("name");

  if (staffError) throw new Error(staffError.message);

  const usersMap = await getUsersMap((staffRows as StaffRow[]).map((item) => item.user_id));

  return {
    subject: mapSubject(subject as SubjectRow),
    assignedTeachers: (staffRows as StaffRow[]).map((item) => ({
      id: item.id,
      userId: item.user_id,
      name: item.name ?? usersMap.get(item.user_id)?.name ?? "Unnamed staff",
      email: usersMap.get(item.user_id)?.email ?? "",
      mobileNumber: item.mobile_number ?? usersMap.get(item.user_id)?.phone ?? "",
      role: item.role ?? "Teacher",
      dateOfJoining: item.date_of_joining,
      monthlySalary:
        item.monthly_salary == null || item.monthly_salary === ""
          ? null
          : Number(item.monthly_salary),
      subjectId: item.subject_id,
      subjectName: (subject as SubjectRow).name,
      assignedClass: item.assigned_class,
      assignedSection: item.assigned_section,
      isClassCoordinator: Boolean(item.is_class_coordinator),
      photoUrl: usersMap.get(item.user_id)?.photo_url ?? null,
    })),
  };
};

export const createSubject = async (values: SubjectFormValues) =>
  (async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const name = values.name.trim();
    if (!name) throw new Error("Subject name is required.");

    const { data, error } = await client
      .from("subjects")
      .insert({ school_id: schoolId, name })
      .select("id, name")
      .single();

    if (error || !data) {
      if (error?.message && isMissingSchoolForeignKeyError(error.message)) {
        throw new Error(
          `The current school workspace (${schoolId}) was not found. Ask a super admin to restore the school record or reassign your account.`,
        );
      }
      throw new Error(error?.message ?? "Unable to create subject.");
    }
    invalidateSchoolScopedCache(["subjects"]);
    const subject = mapSubject(data as SubjectRow);
    await logAuditEvent("CREATE", "SUBJECT", subject.id);
    return subject;
  })();

export const updateSubject = async (subjectId: string, values: SubjectFormValues) =>
  (async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const name = values.name.trim();
    if (!name) throw new Error("Subject name is required.");

    const { data, error } = await client
      .from("subjects")
      .update({ name })
      .eq("id", subjectId)
      .eq("school_id", schoolId)
      .select("id, name")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Unable to update subject.");
    invalidateSchoolScopedCache(["subjects", "staff"]);
    const subject = mapSubject(data as SubjectRow);
    await logAuditEvent("UPDATE", "SUBJECT", subject.id);
    return subject;
  })();

export const deleteSubject = async (subjectId: string) =>
  (async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const { error } = await client.from("subjects").delete().eq("id", subjectId).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    invalidateSchoolScopedCache(["subjects", "staff"]);
    await logAuditEvent("DELETE", "SUBJECT", subjectId);
  })();

export const listStaff = async (): Promise<StaffRecord[]> => {
  return readSchoolScopedCache("staff", async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const { data, error } = await client
      .from("staff")
      .select("id, user_id, name, role, mobile_number, date_of_joining, monthly_salary, subject_id, is_class_coordinator, assigned_class, assigned_section")
      .eq("school_id", schoolId)
      .order("name");

    if (error) throw new Error(error.message);

    const staffRows = data as StaffRow[];
    const usersMap = await getUsersMap(staffRows.map((item) => item.user_id));
    const subjectsMap = await getSubjectsMap(
      staffRows.map((item) => item.subject_id).filter((value): value is string => Boolean(value)),
    );

    return staffRows.map((item) => ({
      id: item.id,
      userId: item.user_id,
      name: item.name ?? usersMap.get(item.user_id)?.name ?? "Unnamed staff",
      email: usersMap.get(item.user_id)?.email ?? "",
      mobileNumber: item.mobile_number ?? usersMap.get(item.user_id)?.phone ?? "",
      photoUrl: usersMap.get(item.user_id)?.photo_url ?? null,
      role: item.role ?? "Teacher",
      dateOfJoining: item.date_of_joining,
      monthlySalary:
        item.monthly_salary == null || item.monthly_salary === ""
          ? null
          : Number(item.monthly_salary),
      subjectId: item.subject_id,
      subjectName: item.subject_id ? subjectsMap.get(item.subject_id)?.name ?? null : null,
      assignedClass: item.assigned_class,
      assignedSection: item.assigned_section,
      isClassCoordinator: Boolean(item.is_class_coordinator),
    }));
  });
};

export const getStaffDetail = async (staffId: string) => {
  const client = requireSupabase();
  const schoolId = requireCurrentSchoolId();
  const { data, error } = await client
    .from("staff")
    .select("id, user_id, name, role, mobile_number, date_of_joining, monthly_salary, subject_id, is_class_coordinator, assigned_class, assigned_section")
    .eq("id", staffId)
    .eq("school_id", schoolId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Staff member not found.");
  }

  const staffRow = data as StaffRow;
  const usersMap = await getUsersMap([staffRow.user_id]);
  const subjectsMap = await getSubjectsMap(
    staffRow.subject_id ? [staffRow.subject_id] : [],
  );

  return {
    id: staffRow.id,
    userId: staffRow.user_id,
    name: staffRow.name ?? usersMap.get(staffRow.user_id)?.name ?? "Unnamed staff",
    email: usersMap.get(staffRow.user_id)?.email ?? "",
    mobileNumber: staffRow.mobile_number ?? usersMap.get(staffRow.user_id)?.phone ?? "",
    photoUrl: usersMap.get(staffRow.user_id)?.photo_url ?? null,
    role: staffRow.role ?? "Teacher",
    dateOfJoining: staffRow.date_of_joining,
    monthlySalary:
      staffRow.monthly_salary == null || staffRow.monthly_salary === ""
        ? null
        : Number(staffRow.monthly_salary),
    subjectId: staffRow.subject_id,
    subjectName: staffRow.subject_id ? subjectsMap.get(staffRow.subject_id)?.name ?? null : null,
    assignedClass: staffRow.assigned_class,
    assignedSection: staffRow.assigned_section,
    isClassCoordinator: Boolean(staffRow.is_class_coordinator),
  } satisfies StaffRecord;
};

export const createStaff = async (values: StaffFormValues) => {
  const staff = await invokeAdminAction<StaffRecord>("create_staff", values);
  invalidateSchoolScopedCache(["staff", "classes"]);
  await logAuditEvent("CREATE", "STAFF", staff.id);
  return staff;
};

export const updateStaff = async (staffId: string, userId: string, values: StaffFormValues) => {
  const staff = await invokeAdminAction<StaffRecord>("update_staff", { id: staffId, userId, ...values });
  invalidateSchoolScopedCache(["staff", "classes"]);
  await logAuditEvent("UPDATE", "STAFF", staff.id);
  return staff;
};

export const deleteStaff = async (staffId: string) =>
  (async () => {
    try {
      await invokeAdminAction<void>("delete_staff", { id: staffId });
      invalidateSchoolScopedCache(["staff", "classes"]);
      await logAuditEvent("DELETE", "STAFF", staffId);
      return;
    } catch (error) {
      if (!isAdminApiUnavailable(error)) {
        throw error;
      }
    }

    const client = requireSupabase();

    const { data: staffRow, error: staffLoadError } = await client
      .from("staff")
      .select("id, user_id")
      .eq("id", staffId)
      .single();

    if (staffLoadError || !staffRow) {
      throw new Error(staffLoadError?.message ?? "Staff member not found.");
    }

    const { error: attendanceDeleteError } = await client.from("attendance").delete().eq("teacher_id", staffId);
    if (attendanceDeleteError) {
      throw new Error(attendanceDeleteError.message);
    }

    const { error: timetableDeleteError } = await client.from("timetable").delete().eq("teacher_id", staffId);
    if (timetableDeleteError) {
      throw new Error(timetableDeleteError.message);
    }

    const { error: staffDeleteError } = await client.from("staff").delete().eq("id", staffId);
    if (staffDeleteError) {
      throw new Error(staffDeleteError.message);
    }

    const { error: userDeleteError } = await client.from("users").delete().eq("id", staffRow.user_id);
    if (userDeleteError) {
      throw new Error(userDeleteError.message);
    }

    invalidateSchoolScopedCache(["staff", "classes"]);
    await logAuditEvent("DELETE", "STAFF", staffId);
  })();

export const listStudents = async (): Promise<StudentRecord[]> => {
  return readSchoolScopedCache("students", async () => {
    const client = requireSupabase();
    const schoolId = requireCurrentSchoolId();
    const { data, error } = await client
      .from("students")
      .select("id, user_id, school_id, name, student_code, class, section, admission_date, discount_fee, aadhar_number, date_of_birth, birth_id, is_orphan, gender, caste, osc, identification_mark, previous_school, region, blood_group, previous_board_roll_no, address, parent_id")
      .eq("school_id", schoolId)
      .order("name");

    if (error) throw new Error(error.message);

    const studentRows = data as StudentRow[];
    const usersMap = await getUsersMap(studentRows.map((item) => item.user_id));
    const parentsMap = await getParentsMap(
      studentRows.map((item) => item.parent_id).filter((value): value is string => Boolean(value)),
    );

    return studentRows.map((item) =>
      mapStudentRecord(
        item,
        usersMap.get(item.user_id),
        item.parent_id ? parentsMap.get(item.parent_id) ?? null : null,
      ),
    );
  });
};

export const getStudentByUserId = async (userId: string) => {
  const students = await listStudents();
  return students.find((student) => student.userId === userId) ?? null;
};

export const getChildrenByParentUserId = async (parentUserId: string) => {
  const students = await listStudents();
  return students.filter((student) => student.parentUserId === parentUserId);
};

export const getStudentDetail = async (studentId: string) => {
  const client = requireSupabase();
  const schoolId = requireCurrentSchoolId();
  const { data, error } = await client
    .from("students")
    .select("id, user_id, school_id, name, student_code, class, section, admission_date, discount_fee, aadhar_number, date_of_birth, birth_id, is_orphan, gender, caste, osc, identification_mark, previous_school, region, blood_group, previous_board_roll_no, address, parent_id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Student not found.");
  }

  const studentRow = data as StudentRow;
  const usersMap = await getUsersMap([studentRow.user_id]);
  const studentUser = usersMap.get(studentRow.user_id);
  const parentsMap = await getParentsMap(
    studentRow.parent_id ? [studentRow.parent_id] : [],
  );
  const parent = studentRow.parent_id ? parentsMap.get(studentRow.parent_id) ?? null : null;

  return mapStudentRecord(studentRow, studentUser, parent);
};

export const getStaffByUserId = async (userId: string) => {
  const staff = await listStaff();
  return staff.find((member) => member.userId === userId) ?? null;
};

export const createStudent = async (values: StudentFormValues) => {
  const { role, user } = authStore.getState();
  const staffWorkspace =
    role === ROLES.STAFF && user?.id
      ? normalizeStaffWorkspace((await getStaffByUserId(user.id))?.role)
      : null;

  if (role !== ROLES.ADMIN && !(role === ROLES.STAFF && staffWorkspace === STAFF_WORKSPACES.ADMISSION)) {
    throw new Error("Only admin and admission workspace staff can add students.");
  }

  const student = await invokeAdminAction<StudentRecord>("create_student_bundle", values);
  invalidateSchoolScopedCache(["students", "classes"]);
  await logAuditEvent("CREATE", "STUDENT", student.id);
  return student;
};

export const updateStudent = async (
  studentId: string,
  studentUserId: string,
  parentId: string,
  parentUserId: string,
  values: StudentFormValues,
): Promise<StudentRecord> =>
  (async () => {
    const student = await invokeAdminAction<StudentRecord>("update_student_bundle", {
      id: studentId,
      userId: studentUserId,
      parentId,
      parentUserId,
      ...values,
    });
    invalidateSchoolScopedCache(["students", "classes"]);
    await logAuditEvent("UPDATE", "STUDENT", student.id);
    return student;
  })();

export const deleteStudent = async (studentId: string) => {
  await invokeAdminAction<void>("delete_student_bundle", { id: studentId });
  invalidateSchoolScopedCache(["students", "classes"]);
  await logAuditEvent("DELETE", "STUDENT", studentId);
};

const getStudentsMap = async (studentIds: string[]) => {
  if (studentIds.length === 0) return new Map<string, StudentRecord>();
  const students = await listStudents();
  return new Map(students.filter((item) => studentIds.includes(item.id)).map((item) => [item.id, item]));
};

const getStaffMapByStaffId = async (staffIds: string[]) => {
  if (staffIds.length === 0) return new Map<string, StaffRecord>();
  const staff = await listStaff();
  return new Map(staff.filter((item) => staffIds.includes(item.id)).map((item) => [item.id, item]));
};

const mapExam = (row: ExamRow): ExamRecord => ({
  id: row.id,
  name: row.name,
  className: row.class,
  section: row.section ?? "",
  startDate: row.start_date ?? row.date ?? row.exam_date ?? "",
  endDate: row.end_date ?? row.start_date ?? row.date ?? row.exam_date ?? "",
  examSession: row.exam_session ?? "Full Day",
  status: row.status ?? "Draft",
  subjectCount: 0,
});

const EXAM_MORNING_START = "08:00";
const EXAM_MORNING_END = "12:30";
const EXAM_AFTERNOON_START = "13:30";
const EXAM_AFTERNOON_END = "16:30";

const getExamTimeWindow = (
  examSession: ExamRecord["examSession"],
  startTime?: string | null,
  endTime?: string | null,
) => {
  if (startTime && endTime) {
    return { start: startTime.slice(0, 5), end: endTime.slice(0, 5) };
  }

  if (examSession === "Morning") {
    return { start: EXAM_MORNING_START, end: EXAM_MORNING_END };
  }

  if (examSession === "Afternoon") {
    return { start: EXAM_AFTERNOON_START, end: EXAM_AFTERNOON_END };
  }

  return { start: EXAM_MORNING_START, end: EXAM_AFTERNOON_END };
};

const getExamDisplayName = (exam: Pick<ExamRecord, "name" | "examSession">) =>
  exam.examSession === "Full Day" ? exam.name : `${exam.name} (${exam.examSession})`;

const getExamScheduleDisplayName = (
  exam: Pick<ExamScheduleRecord, "name" | "examSession" | "subjectName">,
) => {
  const examName = getExamDisplayName(exam);
  return exam.subjectName ? `${exam.subjectName} - ${examName}` : examName;
};

const summarizeExamScheduleLabels = (labels: string[]) => {
  const uniqueLabels = Array.from(new Set(labels.filter(Boolean)));
  if (uniqueLabels.length === 0) return null;
  if (uniqueLabels.length <= 2) return uniqueLabels.join(" / ");
  return `${uniqueLabels.length} papers scheduled`;
};

const doesExamSessionMatchSlot = (
  examSession: ExamRecord["examSession"],
  slotStartTime?: string | null,
  slotEndTime?: string | null,
  examStartTime?: string | null,
  examEndTime?: string | null,
) => {
  if (!slotStartTime || !slotEndTime) return true;
  const examWindow = getExamTimeWindow(examSession, examStartTime, examEndTime);
  return slotStartTime < examWindow.end && slotEndTime > examWindow.start;
};

export const isExamMarksEntryOpen = (
  exam: Pick<ExamRecord, "endDate">,
  referenceDate = getIndiaTodayIso(),
) => Boolean(exam.endDate) && exam.endDate < referenceDate;

export const getExamMarksEntryAvailabilityMessage = (
  exam: Pick<ExamRecord, "endDate">,
  referenceDate = getIndiaTodayIso(),
) => {
  if (!exam.endDate) {
    return "Marks entry is locked until the exam end date is set.";
  }

  if (isExamMarksEntryOpen(exam, referenceDate)) {
    return "";
  }

  return `Marks entry opens after the exam ends. It will be available after ${exam.endDate}.`;
};

const isMissingColumnError = (message: string, columnName: string) => {
  const lowerMessage = message.toLowerCase();
  const normalizedColumn = columnName.toLowerCase();
  const bareColumn = normalizedColumn.split(".").pop() ?? normalizedColumn;

  return (
    lowerMessage.includes(`column ${normalizedColumn} does not exist`) ||
    lowerMessage.includes(`column "${normalizedColumn}" does not exist`) ||
    lowerMessage.includes(`column ${bareColumn} does not exist`) ||
    lowerMessage.includes(`column "${bareColumn}" does not exist`) ||
    (lowerMessage.includes("schema cache") && lowerMessage.includes(bareColumn))
  );
};

const isNotNullConstraintError = (message: string, columnName: string) => {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes(`null value in column "${columnName.toLowerCase()}"`) && lowerMessage.includes("violates not-null constraint");
};

const listAttendanceRows = async (filters?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  subjectId?: string;
  teacherId?: string;
  studentIds?: string[];
}): Promise<AttendanceRow[]> => {
  const client = requireSupabase();
  let modernQuery = client
    .from("attendance")
    .select("id, student_id, subject_id, date, status, teacher_id, created_at")
    .order("date", { ascending: false });

  if (filters?.date) {
    modernQuery = modernQuery.eq("date", filters.date);
  }
  if (filters?.dateFrom) {
    modernQuery = modernQuery.gte("date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    modernQuery = modernQuery.lte("date", filters.dateTo);
  }
  if (filters?.subjectId) {
    modernQuery = modernQuery.eq("subject_id", filters.subjectId);
  }
  if (filters?.teacherId) {
    modernQuery = modernQuery.eq("teacher_id", filters.teacherId);
  }
  if (filters?.studentIds?.length) {
    modernQuery = modernQuery.in("student_id", filters.studentIds);
  }

  const modernResult = await modernQuery;
  if (!modernResult.error) {
    return (modernResult.data ?? []) as AttendanceRow[];
  }

  if (isMissingColumnError(modernResult.error.message, "attendance.created_at")) {
    let legacyQuery = client
      .from("attendance")
      .select("id, student_id, subject_id, date, status, teacher_id")
      .order("date", { ascending: false });

    if (filters?.date) {
      legacyQuery = legacyQuery.eq("date", filters.date);
    }
    if (filters?.dateFrom) {
      legacyQuery = legacyQuery.gte("date", filters.dateFrom);
    }
    if (filters?.dateTo) {
      legacyQuery = legacyQuery.lte("date", filters.dateTo);
    }
    if (filters?.subjectId) {
      legacyQuery = legacyQuery.eq("subject_id", filters.subjectId);
    }
    if (filters?.teacherId) {
      legacyQuery = legacyQuery.eq("teacher_id", filters.teacherId);
    }
    if (filters?.studentIds?.length) {
      legacyQuery = legacyQuery.in("student_id", filters.studentIds);
    }

    const legacyResult = await legacyQuery;
    if (legacyResult.error) throw new Error(legacyResult.error.message);
    return (legacyResult.data ?? []) as AttendanceRow[];
  }

  throw new Error(modernResult.error.message);
};

const getAttendanceRowById = async (attendanceId: string): Promise<AttendanceRow> => {
  const client = requireSupabase();
  const modernResult = await client
    .from("attendance")
    .select("id, student_id, subject_id, date, status, teacher_id, created_at")
    .eq("id", attendanceId)
    .single();

  if (!modernResult.error && modernResult.data) {
    return modernResult.data as AttendanceRow;
  }

  if (modernResult.error && isMissingColumnError(modernResult.error.message, "attendance.created_at")) {
    const legacyResult = await client
      .from("attendance")
      .select("id, student_id, subject_id, date, status, teacher_id")
      .eq("id", attendanceId)
      .single();
    if (legacyResult.error || !legacyResult.data) {
      throw new Error(legacyResult.error?.message ?? "Attendance record not found.");
    }
    return legacyResult.data as AttendanceRow;
  }

  throw new Error(modernResult.error?.message ?? "Attendance record not found.");
};

const listExistingAttendanceRows = async (
  date: string,
  subjectId: string,
  studentIds: string[],
): Promise<AttendanceRow[]> => {
  const client = requireSupabase();
  const modernResult = await client
    .from("attendance")
    .select("id, student_id, subject_id, date, status, teacher_id, created_at")
    .eq("date", date)
    .eq("subject_id", subjectId)
    .in("student_id", studentIds);

  if (!modernResult.error) {
    return (modernResult.data ?? []) as AttendanceRow[];
  }

  if (isMissingColumnError(modernResult.error.message, "attendance.created_at")) {
    const legacyResult = await client
      .from("attendance")
      .select("id, student_id, subject_id, date, status, teacher_id")
      .eq("date", date)
      .eq("subject_id", subjectId)
      .in("student_id", studentIds);
    if (legacyResult.error) throw new Error(legacyResult.error.message);
    return (legacyResult.data ?? []) as AttendanceRow[];
  }

  throw new Error(modernResult.error.message);
};

const listExamRows = async (): Promise<ExamRow[]> => {
  const client = requireSupabase();
  const nextShape = await client
    .from("exams")
    .select("id, name, class, section, start_date, end_date, exam_session, status, date, created_at")
    .order("start_date");

  if (!nextShape.error) {
    return (nextShape.data ?? []) as ExamRow[];
  }

  if (
    isMissingColumnError(nextShape.error.message, "exams.section") ||
    isMissingColumnError(nextShape.error.message, "exams.date") ||
    isMissingColumnError(nextShape.error.message, "exams.start_date") ||
    isMissingColumnError(nextShape.error.message, "exams.end_date") ||
    isMissingColumnError(nextShape.error.message, "exams.exam_session") ||
    isMissingColumnError(nextShape.error.message, "exams.status")
  ) {
    const legacyShape = await client
      .from("exams")
      .select("id, name, class, exam_date, created_at")
      .order("exam_date");
    if (legacyShape.error) throw new Error(legacyShape.error.message);
    return ((legacyShape.data ?? []) as ExamRow[]).map((row) => ({
      ...row,
      section: "",
      date: row.exam_date ?? null,
      exam_session: "Full Day",
    }));
  }

  throw new Error(nextShape.error.message);
};

const getExamRowById = async (examId: string): Promise<ExamRow> => {
  const client = requireSupabase();
  const nextShape = await client
    .from("exams")
    .select("id, name, class, section, start_date, end_date, exam_session, status, date, created_at")
    .eq("id", examId)
    .single();

  if (!nextShape.error && nextShape.data) {
    return nextShape.data as ExamRow;
  }

  if (
    nextShape.error &&
    (isMissingColumnError(nextShape.error.message, "exams.section") ||
      isMissingColumnError(nextShape.error.message, "exams.date") ||
      isMissingColumnError(nextShape.error.message, "exams.start_date") ||
      isMissingColumnError(nextShape.error.message, "exams.end_date") ||
      isMissingColumnError(nextShape.error.message, "exams.exam_session") ||
      isMissingColumnError(nextShape.error.message, "exams.status"))
  ) {
    const legacyShape = await client
      .from("exams")
      .select("id, name, class, exam_date, created_at")
      .eq("id", examId)
      .single();
    if (legacyShape.error || !legacyShape.data) {
      throw new Error(legacyShape.error?.message ?? "Exam not found.");
    }
    return {
      ...(legacyShape.data as ExamRow),
      section: "",
      date: (legacyShape.data as ExamRow).exam_date ?? null,
      exam_session: "Full Day",
    };
  }

  throw new Error(nextShape.error?.message ?? "Exam not found.");
};

const listExamActivityRows = async (): Promise<ExamRow[]> => {
  const client = requireSupabase();
  const nextShape = await client
    .from("exams")
    .select("name, class, section, start_date, end_date, exam_session, status, date, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!nextShape.error) {
    return (nextShape.data ?? []) as ExamRow[];
  }

  if (
    isMissingColumnError(nextShape.error.message, "exams.section") ||
    isMissingColumnError(nextShape.error.message, "exams.date") ||
    isMissingColumnError(nextShape.error.message, "exams.start_date") ||
    isMissingColumnError(nextShape.error.message, "exams.end_date") ||
    isMissingColumnError(nextShape.error.message, "exams.exam_session") ||
    isMissingColumnError(nextShape.error.message, "exams.status")
  ) {
    const legacyShape = await client
      .from("exams")
      .select("name, class, exam_date, created_at")
      .order("created_at", { ascending: false })
      .limit(3);
    if (legacyShape.error) throw new Error(legacyShape.error.message);
    return ((legacyShape.data ?? []) as ExamRow[]).map((row) => ({
      ...row,
      section: "",
      date: row.exam_date ?? null,
      exam_session: "Full Day",
    }));
  }

  throw new Error(nextShape.error.message);
};

const listExamSubjectRows = async (filters?: { examId?: string }): Promise<ExamSubjectRow[]> => {
  const client = requireSupabase();
  let nextShape = client
    .from("exam_subjects")
    .select("id, exam_id, subject_id, max_marks, exam_date, exam_session, start_time, end_time");

  if (filters?.examId) {
    nextShape = nextShape.eq("exam_id", filters.examId);
  }

  const nextResult = await nextShape;
  if (!nextResult.error) {
    return (nextResult.data ?? []) as ExamSubjectRow[];
  }

  if (
    isMissingColumnError(nextResult.error.message, "exam_subjects.exam_date") ||
    isMissingColumnError(nextResult.error.message, "exam_subjects.exam_session") ||
    isMissingColumnError(nextResult.error.message, "exam_subjects.start_time") ||
    isMissingColumnError(nextResult.error.message, "exam_subjects.end_time")
  ) {
    let legacyShape = client.from("exam_subjects").select("id, exam_id, subject_id, max_marks");
    if (filters?.examId) {
      legacyShape = legacyShape.eq("exam_id", filters.examId);
    }

    const legacyResult = await legacyShape;
    if (legacyResult.error) throw new Error(legacyResult.error.message);
    return (legacyResult.data ?? []) as ExamSubjectRow[];
  }

  throw new Error(nextResult.error.message);
};

const deriveExamSummaryFromSchedules = (
  schedules: Array<{ examDate: string; examSession: ExamRecord["examSession"] }>,
) => {
  const datedSchedules = schedules.filter((item) => item.examDate);
  if (datedSchedules.length === 0) {
    return null;
  }

  const sortedDates = datedSchedules.map((item) => item.examDate).sort((left, right) => left.localeCompare(right));
  const sessionSet = new Set(datedSchedules.map((item) => item.examSession));

  return {
    startDate: sortedDates[0],
    endDate: sortedDates[sortedDates.length - 1],
    examSession:
      sessionSet.size === 1
        ? (datedSchedules[0]?.examSession ?? "Full Day")
        : ("Full Day" as ExamRecord["examSession"]),
  };
};

const getExamSubjectSchedule = (row: ExamSubjectRow, exam: ExamRecord) => {
  const examDate = row.exam_date ?? exam.startDate;
  const examSession = row.exam_session ?? exam.examSession;
  const examWindow = getExamTimeWindow(examSession, row.start_time ?? null, row.end_time ?? null);

  return {
    examDate,
    examSession,
    startTime: examWindow.start,
    endTime: examWindow.end,
  };
};

const syncExamSummaryFromSubjects = async (examId: string, rows?: ExamSubjectRow[]) => {
  const client = requireSupabase();
  const subjectRows = rows ?? (await listExamSubjectRows({ examId }));
  if (subjectRows.length === 0) return;

  const exam = mapExam(await getExamRowById(examId));
  const summary = deriveExamSummaryFromSchedules(
    subjectRows.map((row) => {
      const schedule = getExamSubjectSchedule(row, exam);
      return {
        examDate: schedule.examDate,
        examSession: schedule.examSession,
      };
    }),
  );

  if (!summary) return;

  const updateResult = await client
    .from("exams")
    .update({
      start_date: summary.startDate,
      end_date: summary.endDate,
      date: summary.startDate,
      exam_session: summary.examSession,
    })
    .eq("id", examId);

  if (
    updateResult.error &&
    !isMissingColumnError(updateResult.error.message, "exams.exam_session") &&
    !isNotNullConstraintError(updateResult.error.message, "exam_date")
  ) {
    throw new Error(updateResult.error.message);
  }

  if (updateResult.error && isMissingColumnError(updateResult.error.message, "exams.exam_session")) {
    const retryWithoutSession = await client
      .from("exams")
      .update({
        start_date: summary.startDate,
        end_date: summary.endDate,
        date: summary.startDate,
      })
      .eq("id", examId);
    if (retryWithoutSession.error) throw new Error(retryWithoutSession.error.message);
    return;
  }

  if (updateResult.error && isNotNullConstraintError(updateResult.error.message, "exam_date")) {
    const retryWithLegacyDate = await client
      .from("exams")
      .update({
        start_date: summary.startDate,
        end_date: summary.endDate,
        date: summary.startDate,
        exam_date: summary.startDate,
        exam_session: summary.examSession,
      })
      .eq("id", examId);
    if (retryWithLegacyDate.error) throw new Error(retryWithLegacyDate.error.message);
  }
};

export const listExamSchedules = async (filters?: {
  examId?: string;
  className?: string;
  section?: string;
  dates?: string[];
}): Promise<ExamScheduleRecord[]> => {
  const exams = filters?.examId ? [mapExam(await getExamRowById(filters.examId))] : (await listExamRows()).map(mapExam);
  const scopedExams = exams.filter(
    (exam) =>
      (!filters?.className || exam.className === filters.className) &&
      (!filters?.section || matchesExamSection(exam.section, filters.section)),
  );

  if (scopedExams.length === 0) return [];

  const examMap = new Map(scopedExams.map((exam) => [exam.id, exam]));
  const subjectRows = await listExamSubjectRows(filters?.examId ? { examId: filters.examId } : undefined);
  const scopedRows = subjectRows.filter((row) => examMap.has(row.exam_id));
  const subjectsMap = await getSubjectsMap(scopedRows.map((row) => row.subject_id));
  const rowsByExamId = new Map<string, ExamSubjectRow[]>();

  scopedRows.forEach((row) => {
    rowsByExamId.set(row.exam_id, [...(rowsByExamId.get(row.exam_id) ?? []), row]);
  });

  const entries: ExamScheduleRecord[] = [];

  scopedExams.forEach((exam) => {
    const examRows = rowsByExamId.get(exam.id) ?? [];

    if (examRows.length > 0) {
      examRows.forEach((row) => {
        const schedule = getExamSubjectSchedule(row, exam);
        entries.push({
          ...exam,
          subjectId: row.subject_id,
          subjectName: subjectsMap.get(row.subject_id)?.name ?? "Unknown subject",
          examDate: schedule.examDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          examSession: schedule.examSession,
        });
      });
      return;
    }

    const examWindow = getExamTimeWindow(exam.examSession);
    buildDateRange(exam.startDate, exam.endDate).forEach((examDate) => {
      entries.push({
        ...exam,
        subjectId: null,
        subjectName: null,
        examDate,
        startTime: examWindow.start,
        endTime: examWindow.end,
      });
    });
  });

  return entries
    .filter((entry) => !filters?.dates || filters.dates.includes(entry.examDate))
    .sort((left, right) => {
      const dateOrder = left.examDate.localeCompare(right.examDate);
      if (dateOrder !== 0) return dateOrder;
      const timeOrder = (left.startTime ?? "").localeCompare(right.startTime ?? "");
      if (timeOrder !== 0) return timeOrder;
      return left.name.localeCompare(right.name);
    });
};

const matchesExamSection = (examSection: string | null | undefined, section: string) => {
  const normalizedExamSection = (examSection ?? "").trim();
  return !normalizedExamSection || normalizedExamSection === section;
};

const getExamForClassSectionDate = async (
  className: string,
  section: string,
  date: string,
  slotStartTime?: string | null,
  slotEndTime?: string | null,
) => {
  const exams = await listExamSchedules({ className, section, dates: [date] });
  return (
    exams.find(
      (exam) =>
        exam.examDate === date &&
        doesExamSessionMatchSlot(exam.examSession, slotStartTime, slotEndTime, exam.startTime, exam.endTime),
    ) ?? null
  );
};

const gradeFromMarks = (marks: number) => {
  if (marks >= 90) return "A";
  if (marks >= 75) return "B";
  if (marks >= 50) return "C";
  return "F";
};

const gradeFromPercentage = (percentage: number) => {
  if (percentage >= 90) return "A";
  if (percentage >= 75) return "B";
  if (percentage >= 50) return "C";
  return "F";
};

const passStatusFromGrade = (grade: string): "Pass" | "Fail" => (grade === "F" ? "Fail" : "Pass");

export const listAttendance = async (filters?: {
  className?: string;
  section?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  subjectId?: string;
  teacherId?: string;
  studentId?: string;
}): Promise<AttendanceRecord[]> => {
  let rows = await listAttendanceRows({
    date: filters?.date,
    dateFrom: filters?.dateFrom,
    dateTo: filters?.dateTo,
    subjectId: filters?.subjectId,
    teacherId: filters?.teacherId,
    studentIds: filters?.studentId ? [filters.studentId] : undefined,
  });

  if (filters?.className || filters?.section || filters?.studentId) {
    const students = await listStudents();
    const allowedIds = new Set(
      students
        .filter(
          (student) =>
            (!filters.className || student.className === filters.className) &&
            (!filters.section || student.section === filters.section) &&
            (!filters.studentId || student.id === filters.studentId),
        )
        .map((student) => student.id),
    );
    rows = rows.filter((row) => allowedIds.has(row.student_id));
  }

  const [studentsMap, subjectsMap, staffMap] = await Promise.all([
    getStudentsMap(rows.map((row) => row.student_id)),
    getSubjectsMap(rows.map((row) => row.subject_id).filter((value): value is string => Boolean(value))),
    getStaffMapByStaffId(rows.map((row) => row.teacher_id).filter((value): value is string => Boolean(value))),
  ]);

  return rows.map((row) => ({
    id: row.id,
    className: studentsMap.get(row.student_id)?.className ?? null,
    section: studentsMap.get(row.student_id)?.section ?? null,
    studentId: row.student_id,
    studentName: studentsMap.get(row.student_id)?.name ?? "Unknown student",
    subjectId: row.subject_id,
    subjectName: row.subject_id ? subjectsMap.get(row.subject_id)?.name ?? null : null,
    date: row.date,
    status: row.status,
    teacherId: row.teacher_id,
    teacherName: row.teacher_id ? staffMap.get(row.teacher_id)?.name ?? null : null,
  }));
};

export const getAttendanceMonthGrid = async (filters: {
  month: string;
  className?: string;
  section?: string;
  teacherId?: string;
  studentId?: string;
}): Promise<AttendanceMonthGrid> => {
  const monthDates = getMonthDates(filters.month);
  if (monthDates.length === 0) {
    return { month: filters.month, columns: [], timeRows: [], cells: [] };
  }

  const holidays = await listHolidays();
  const holidayMap = new Map(
    holidays
      .filter((holiday) => holiday.holidayDate.startsWith(`${filters.month}-`))
      .map((holiday) => [holiday.holidayDate, holiday]),
  );

  const baseSlots = await buildEffectiveAttendanceSlots({
    dates: monthDates,
    className: filters.className,
    section: filters.section,
    teacherId: filters.teacherId,
  });

  const relevantClassSections = new Set<string>();

  if (filters.className && filters.section) {
    relevantClassSections.add(`${filters.className}::${filters.section}`);
  }

  baseSlots.forEach((slot) => {
    relevantClassSections.add(`${slot.className}::${slot.section}`);
  });

  const relevantExamSchedules = (await listExamSchedules({ dates: monthDates })).filter((item) =>
    relevantClassSections.has(`${item.className}::${item.section}`),
  );

  const scopedExamLabels = new Map<string, string[]>();
  const classWideExamLabels = new Map<string, string[]>();

  relevantExamSchedules.forEach((schedule) => {
    const label = getExamScheduleDisplayName(schedule);
    const scopedKey = `${schedule.examDate}::${schedule.className}::${schedule.section}`;
    scopedExamLabels.set(scopedKey, [...(scopedExamLabels.get(scopedKey) ?? []), label]);

    if (filters.className && filters.section && schedule.className === filters.className && schedule.section === filters.section) {
      classWideExamLabels.set(schedule.examDate, [...(classWideExamLabels.get(schedule.examDate) ?? []), label]);
    }
  });

  const scopedExamMap = new Map(
    Array.from(scopedExamLabels.entries()).map(([key, labels]) => [key, summarizeExamScheduleLabels(labels)] as const),
  );
  const classWideExamMap = new Map(
    Array.from(classWideExamLabels.entries()).map(([key, labels]) => [key, summarizeExamScheduleLabels(labels)] as const),
  );

  const attendanceRows = await listAttendance({
    className: filters.className,
    section: filters.section,
    teacherId: filters.teacherId,
    studentId: filters.studentId,
    dateFrom: monthDates[0],
    dateTo: monthDates[monthDates.length - 1],
  });

  const sessionMap = new Map<string, { sessionId: string | null; presentCount: number; absentCount: number; studentCount: number }>();
  const studentStatusMap = new Map<string, { sessionId: string | null; status: "Present" | "Absent" | null }>();

  attendanceRows.forEach((row) => {
    if (!row.date || !row.subjectId) return;
    const key = `${row.date}::${row.subjectId}::${row.className ?? ""}::${row.section ?? ""}::${row.teacherId ?? ""}`;

    if (filters.studentId) {
      studentStatusMap.set(key, {
        sessionId: row.id,
        status: row.status === "Present" || row.status === "Absent" ? row.status : null,
      });
      return;
    }

    const existing = sessionMap.get(key) ?? {
      sessionId: row.id,
      presentCount: 0,
      absentCount: 0,
      studentCount: 0,
    };
    existing.studentCount += 1;
    if (row.status === "Present") existing.presentCount += 1;
    if (row.status === "Absent") existing.absentCount += 1;
    sessionMap.set(key, existing);
  });

  const timeRows = Array.from(
    new Map(baseSlots.map((slot) => [`${slot.startTime}-${slot.endTime}`, { start: slot.startTime, end: slot.endTime }])).values(),
  ).sort((a, b) => a.start.localeCompare(b.start));

  const columns = monthDates.map((date) => {
    const day = getWeekdayFromDateString(date) as AttendanceMonthGrid["columns"][number]["day"];
    const holiday = holidayMap.get(date) ?? null;
    const examName = classWideExamMap.get(date) ?? null;
    return {
      date,
      day,
      label: formatShortDateFromDateString(date),
      isHoliday: day === "Sun" || Boolean(holiday),
      holidayTitle: day === "Sun" ? "Sunday Holiday" : holiday?.title ?? null,
      isExamDay: Boolean(examName),
      examName,
    };
  });

  const cells: AttendanceMonthCell[] = [];
  timeRows.forEach((row) => {
    columns.forEach((column) => {
      const slot =
        baseSlots.find(
          (item) =>
            item.effectiveDate === column.date &&
            item.day === column.day &&
            item.startTime === row.start &&
            item.endTime === row.end,
        ) ?? null;

      if (!slot) {
        cells.push({
          date: column.date,
          day: column.day,
          startTime: row.start,
          endTime: row.end,
          slot: null,
          isHoliday: column.isHoliday,
          holidayTitle: column.holidayTitle,
          isExamDay: column.isExamDay,
          examName: column.examName,
          sessionId: null,
          studentStatus: null,
          presentCount: null,
          absentCount: null,
          studentCount: null,
        });
        return;
      }

      const key = `${column.date}::${slot.subjectId}::${slot.className}::${slot.section}::${slot.teacherId}`;
      const studentStatus = studentStatusMap.get(key) ?? null;
      const sessionSummary = sessionMap.get(key) ?? null;
      const exam = relevantExamSchedules.find(
        (item) =>
          item.className === slot.className &&
          item.section === slot.section &&
          item.examDate === column.date &&
          doesExamSessionMatchSlot(item.examSession, slot.startTime, slot.endTime, item.startTime, item.endTime),
      );
      const examName = exam ? getExamScheduleDisplayName(exam) : null;

      cells.push({
        date: column.date,
        day: column.day,
        startTime: row.start,
        endTime: row.end,
        slot,
        isHoliday: column.isHoliday,
        holidayTitle: column.holidayTitle,
        isExamDay: Boolean(examName),
        examName: examName ?? null,
        sessionId: studentStatus?.sessionId ?? sessionSummary?.sessionId ?? null,
        studentStatus: studentStatus?.status ?? null,
        presentCount: sessionSummary?.presentCount ?? null,
        absentCount: sessionSummary?.absentCount ?? null,
        studentCount: sessionSummary?.studentCount ?? null,
      });
    });
  });

  return {
    month: filters.month,
    columns,
    timeRows,
    cells,
  };
};

const createEffectiveAttendanceSlot = (
  slot: TimetableSlotRecord,
  date: string,
  impact?: TimetableImpactRecord | null,
): TimetableSlotRecord => ({
  ...slot,
  subjectId: impact?.replacementSubjectId ?? slot.subjectId,
  subjectName: impact?.replacementSubjectName ?? slot.subjectName,
  teacherId: impact?.replacementTeacherId ?? slot.teacherId,
  teacherName: impact?.replacementTeacherName ?? slot.teacherName,
  startTime: impact?.replacementStartTime ?? slot.startTime,
  endTime: impact?.replacementEndTime ?? slot.endTime,
  effectiveDate: date,
  sourceSlotId: slot.id,
  impactLeaveId: impact?.leaveId ?? null,
  impactStatus: impact?.status ?? null,
  replacementTeacherId: impact?.replacementTeacherId ?? null,
  replacementTeacherName: impact?.replacementTeacherName ?? null,
  replacementSubjectId: impact?.replacementSubjectId ?? null,
  replacementSubjectName: impact?.replacementSubjectName ?? null,
});

const buildEffectiveAttendanceSlots = async (filters: {
  dates: string[];
  className?: string;
  section?: string;
  teacherId?: string;
}): Promise<TimetableSlotRecord[]> => {
  if (filters.dates.length === 0) return [];

  let baseSlots: TimetableSlotRecord[] = [];
  if (filters.teacherId) {
    baseSlots = await listTimetableSlots({ teacherId: filters.teacherId });
  } else if (filters.className && filters.section) {
    baseSlots = await listTimetableSlots({ className: filters.className, section: filters.section });
  }
  baseSlots = baseSlots.filter((slot) => !slot.isBreak && Boolean(slot.subjectId));

  let impacts: TimetableImpactRecord[] = [];
  if (filters.teacherId) {
    const [outgoingImpacts, incomingImpacts] = await Promise.all([
      listTimetableImpacts({ teacherId: filters.teacherId, dates: filters.dates }),
      listTimetableImpacts({ replacementTeacherId: filters.teacherId, dates: filters.dates }),
    ]);
    impacts = Array.from(new Map([...outgoingImpacts, ...incomingImpacts].map((impact) => [impact.id, impact])).values());
  } else if (filters.className && filters.section) {
    impacts = await listTimetableImpacts({
      className: filters.className,
      section: filters.section,
      dates: filters.dates,
    });
  }

  const impactBySlotDate = new Map(
    impacts.map((impact) => [`${impact.timetableId}::${impact.impactDate}`, impact] as const),
  );
  const effectiveSlots: TimetableSlotRecord[] = [];

  filters.dates.forEach((date) => {
    const weekday = getWeekdayFromDateString(date).slice(0, 3) as TimetableDay;
    if (weekday === "Sun") return;

    baseSlots
      .filter((slot) => slot.day === weekday)
      .forEach((slot) => {
        const impact = impactBySlotDate.get(`${slot.id}::${date}`) ?? null;

        if (impact?.status === "Cancelled") {
          return;
        }

        if (
          filters.teacherId &&
          impact?.status === "Rescheduled" &&
          impact.replacementTeacherId &&
          impact.replacementTeacherId !== filters.teacherId
        ) {
          return;
        }

        effectiveSlots.push(createEffectiveAttendanceSlot(slot, date, impact));
      });

    if (filters.teacherId) {
      impacts
        .filter(
          (impact) =>
            impact.impactDate === date &&
            impact.status === "Rescheduled" &&
            impact.replacementTeacherId === filters.teacherId &&
            impact.teacherId !== filters.teacherId,
        )
        .forEach((impact) => {
          effectiveSlots.push({
            id: impact.timetableId,
            className: impact.className,
            section: impact.section,
            subjectId: impact.replacementSubjectId ?? impact.subjectId,
            subjectName: impact.replacementSubjectName ?? impact.subjectName,
            teacherId: impact.replacementTeacherId,
            teacherName: impact.replacementTeacherName ?? impact.teacherName,
            day: impact.day,
            startTime: impact.replacementStartTime ?? impact.startTime,
            endTime: impact.replacementEndTime ?? impact.endTime,
            isBreak: false,
            breakType: null,
            breakLabel: null,
            isCancelled: false,
            cancellationReason: null,
            effectiveDate: date,
            sourceSlotId: impact.timetableId,
            impactLeaveId: impact.leaveId,
            impactStatus: impact.status,
            replacementTeacherId: impact.replacementTeacherId,
            replacementTeacherName: impact.replacementTeacherName,
            replacementSubjectId: impact.replacementSubjectId,
            replacementSubjectName: impact.replacementSubjectName,
          });
        });
    }
  });

  return effectiveSlots.sort((left, right) => {
    const dateOrder = (left.effectiveDate ?? "").localeCompare(right.effectiveDate ?? "");
    if (dateOrder !== 0) return dateOrder;
    const timeOrder = left.startTime.localeCompare(right.startTime);
    if (timeOrder !== 0) return timeOrder;
    return left.className.localeCompare(right.className);
  });
};

export const getAttendanceDetail = async (attendanceId: string) => {
  const data = await getAttendanceRowById(attendanceId);
  const matchingRecords = await listAttendance({
    date: data.date ?? "",
    subjectId: data.subject_id ?? undefined,
  });
  const target = matchingRecords.find((item) => item.id === attendanceId);
  if (!target?.className || !target.section || !target.subjectId || !target.date) {
    throw new Error("Attendance session not found.");
  }
  return getAttendanceSessionDetail(target.className, target.section, target.subjectId, target.date);
};

export const listAttendanceSubjectsFromTimetable = async (
  className: string,
  section: string,
  date?: string,
): Promise<AttendanceSubjectOption[]> => {
  if (date) {
    const effectiveSlots = await buildEffectiveAttendanceSlots({ className, section, dates: [date] });
    const uniqueSlots = Array.from(
      new Map(
        effectiveSlots
          .filter((slot) => slot.subjectId)
          .map((slot) => [
            `${slot.subjectId}-${slot.teacherId ?? "none"}`,
            {
              subjectId: slot.subjectId!,
              subjectName: slot.subjectName,
              teacherId: slot.teacherId,
              teacherName: slot.teacherName,
            },
          ]),
      ).values(),
    );
    return uniqueSlots;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("timetable")
    .select("subject_id, teacher_id")
    .eq("class", className)
    .eq("section", section)
    .eq("is_break", false)
    .not("subject_id", "is", null);

  if (error) throw new Error(error.message);

  const timetableSubjectRows = (data ?? []) as Array<{ subject_id: string | null; teacher_id: string | null }>;
  const uniqueRows = Array.from(
    new Map(
      timetableSubjectRows
        .filter((row) => row.subject_id)
        .map((row) => [`${row.subject_id}-${row.teacher_id ?? "none"}`, row]),
    ).values(),
  );

  const [subjectsMap, staffMap] = await Promise.all([
    getSubjectsMap(uniqueRows.map((row) => row.subject_id!).filter(Boolean)),
    getStaffMapByStaffId(uniqueRows.map((row) => row.teacher_id).filter((value): value is string => Boolean(value))),
  ]);

  return uniqueRows.map((row) => ({
    subjectId: row.subject_id!,
    subjectName: subjectsMap.get(row.subject_id!)?.name ?? "Unknown subject",
    teacherId: row.teacher_id ?? null,
    teacherName: row.teacher_id ? staffMap.get(row.teacher_id)?.name ?? null : null,
  }));
};

export const loadAttendanceRoster = async (values: AttendanceFormValues): Promise<AttendanceSession> => {
  const client = requireSupabase();

  if (!values.className || !values.section || !values.subjectId || !values.date) {
    throw new Error("Class, section, subject, and date are required.");
  }

  const effectiveSlots = await buildEffectiveAttendanceSlots({
    className: values.className,
    section: values.section,
    dates: [values.date],
  });
  const matchedSlot = effectiveSlots.find((slot) => slot.subjectId === values.subjectId) ?? null;
  if (!matchedSlot) {
    throw new Error("Selected subject is not assigned in the timetable for this class and section.");
  }

  const activeExam = await getExamForClassSectionDate(
    values.className,
    values.section,
    values.date,
    matchedSlot.startTime,
    matchedSlot.endTime,
  );
  if (activeExam) {
    throw new Error(`Attendance is disabled for this exam slot. ${getExamScheduleDisplayName(activeExam)} is scheduled for this class and section on ${values.date}.`);
  }

  const { data: studentRows, error: studentError } = await client
    .from("students")
    .select("id, name")
    .eq("class", values.className)
    .eq("section", values.section)
    .order("name");

  if (studentError) throw new Error(studentError.message);

  const studentIds = (studentRows ?? []).map((row) => row.id);
  let attendanceRows: AttendanceRow[] = [];

  if (studentIds.length > 0) {
    attendanceRows = await listExistingAttendanceRows(values.date, values.subjectId, studentIds);
  }

  const attendanceMap = new Map(attendanceRows.map((row) => [row.student_id, row]));

  const rows: AttendanceRosterRow[] = (studentRows ?? []).map((student) => ({
    studentId: student.id,
    studentName: student.name ?? "Unknown student",
    status: ((attendanceMap.get(student.id)?.status as "Present" | "Absent" | undefined) ?? "Present"),
    attendanceId: attendanceMap.get(student.id)?.id ?? null,
    changed: false,
  }));

  return {
    className: values.className,
    section: values.section,
    subjectId: values.subjectId,
    subjectName: matchedSlot.subjectName,
    teacherId: matchedSlot.teacherId,
    teacherName: matchedSlot.teacherName,
    date: values.date,
    startTime: matchedSlot.startTime,
    endTime: matchedSlot.endTime,
    sourceSlotId: matchedSlot.sourceSlotId ?? matchedSlot.id,
    rows,
  };
};

export const saveAttendanceSession = async (session: AttendanceSession): Promise<AttendanceSession> => {
  const client = requireSupabase();
  const schoolId = requireCurrentSchoolId();
  const mapAttendanceWriteError = (message: string) =>
    /row-level security policy/i.test(message)
      ? "You don't have permission to save attendance for this class, subject, or date."
      : message;
  const isTeacherWorkspaceRole = (role: string | null | undefined) => {
    const normalized = String(role ?? "").trim().toLowerCase();
    return ["staff", "teacher", "hr", "accounts", "transport", "admission"].includes(normalized);
  };

  const {
    data: { user },
  } = await client.auth.getUser();

  const activeExam = await getExamForClassSectionDate(
    session.className,
    session.section,
    session.date,
    session.startTime,
    session.endTime,
  );
  if (activeExam) {
    throw new Error(`Attendance cannot be saved for this exam slot. ${getExamScheduleDisplayName(activeExam)} is scheduled for this class and section on ${session.date}.`);
  }

  if (user?.id) {
    const { data: profile } = await client
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (isTeacherWorkspaceRole(profile?.role)) {
      await invokeServerAction("save_teacher_attendance", session as unknown as Record<string, unknown>);
      const roster = await loadAttendanceRoster({
        className: session.className,
        section: session.section,
        subjectId: session.subjectId,
        date: session.date,
      });
      await logAuditEvent("UPDATE", "ATTENDANCE", `${session.subjectId}:${session.date}`, user.id);
      return roster;
    }
  }

  const { data: duplicateRows, error: duplicateError } = await client
    .from("attendance")
    .select("id, student_id")
    .eq("school_id", schoolId)
    .eq("date", session.date)
    .eq("subject_id", session.subjectId)
    .in("student_id", session.rows.map((row) => row.studentId));

  if (duplicateError) throw new Error(mapAttendanceWriteError(duplicateError.message));

  const existingMap = new Map(((duplicateRows ?? []) as Array<{ id: string; student_id: string }>).map((row) => [row.student_id, row.id]));

  const updates = session.rows.filter((row) => existingMap.has(row.studentId));
  const inserts = session.rows.filter((row) => !existingMap.has(row.studentId));

  for (const row of updates) {
    const { error } = await client
      .from("attendance")
      .update({
        status: row.status,
        teacher_id: session.teacherId,
      })
      .eq("id", existingMap.get(row.studentId)!);
    if (error) throw new Error(mapAttendanceWriteError(error.message));
  }

  if (inserts.length > 0) {
    const { error } = await client.from("attendance").insert(
      inserts.map((row) => ({
        school_id: schoolId,
        student_id: row.studentId,
        subject_id: session.subjectId,
        teacher_id: session.teacherId,
        date: session.date,
        status: row.status,
      })),
    );
    if (error) throw new Error(mapAttendanceWriteError(error.message));
  }

  const roster = await loadAttendanceRoster({
    className: session.className,
    section: session.section,
    subjectId: session.subjectId,
    date: session.date,
  });
  await logAuditEvent("UPDATE", "ATTENDANCE", `${session.subjectId}:${session.date}`);
  return roster;
};

export const deleteAttendanceSession = async (
  className: string,
  section: string,
  subjectId: string,
  date: string,
) => {
  const client = requireSupabase();
  const { data: students, error: studentError } = await client
    .from("students")
    .select("id")
    .eq("class", className)
    .eq("section", section);
  if (studentError) throw new Error(studentError.message);
  const studentIds = (students ?? []).map((row) => row.id);
  if (studentIds.length === 0) return;
  const { error } = await client
    .from("attendance")
    .delete()
    .eq("date", date)
    .eq("subject_id", subjectId)
    .in("student_id", studentIds);
  if (error) throw new Error(error.message);
  await logAuditEvent("DELETE", "ATTENDANCE", `${subjectId}:${date}`);
};

export const getAttendanceSessionDetail = async (
  className: string,
  section: string,
  subjectId: string,
  date: string,
): Promise<AttendanceSession> => {
  return loadAttendanceRoster({ className, section, subjectId, date });
};

export const listExams = async (): Promise<ExamRecord[]> => {
  const exams = (await listExamRows()).map(mapExam);
  const client = requireSupabase();
  const { data, error } = await client.from("exam_subjects").select("exam_id");

  if (error) {
    return exams;
  }

  const countMap = new Map<string, number>();
  ((data ?? []) as Array<{ exam_id: string | null }>).forEach((row) => {
    if (!row.exam_id) return;
    countMap.set(row.exam_id, (countMap.get(row.exam_id) ?? 0) + 1);
  });

  return exams.map((exam) => ({ ...exam, subjectCount: countMap.get(exam.id) ?? 0 }));
};

const normalizeExamGroupKey = (name: string) => name.trim().toLowerCase();

const summarizeExamGroup = (records: ExamRecord[]): ExamGroupRecord => {
  const sortedRecords = [...records].sort(
    (left, right) =>
      left.startDate.localeCompare(right.startDate) ||
      left.className.localeCompare(right.className) ||
      left.section.localeCompare(right.section),
  );
  const dateValues = sortedRecords.flatMap((record) => [record.startDate, record.endDate]).filter(Boolean);
  const sessionValues = Array.from(new Set(sortedRecords.map((record) => record.examSession)));
  const statusValues = Array.from(new Set(sortedRecords.map((record) => record.status)));
  const classNames = Array.from(new Set(sortedRecords.map((record) => record.className).filter(Boolean))).sort();
  const sectionNames = Array.from(new Set(sortedRecords.map((record) => record.section).filter(Boolean))).sort();
  const displayName = sortedRecords[0]?.name.trim() || sortedRecords[0]?.name || "Exam";

  return {
    id: encodeURIComponent(displayName),
    name: displayName,
    startDate: dateValues.length > 0 ? [...dateValues].sort()[0] : "",
    endDate: dateValues.length > 0 ? [...dateValues].sort().slice(-1)[0] : "",
    examSession: sessionValues.length === 1 ? sessionValues[0] : "Mixed",
    status: statusValues.length === 1 ? statusValues[0] : "Mixed",
    recordCount: sortedRecords.length,
    classCount: classNames.length,
    sectionCount: sectionNames.length,
    subjectCount: sortedRecords.reduce((sum, record) => sum + record.subjectCount, 0),
    classNames,
    sectionNames,
  };
};

export const listExamGroups = async (): Promise<ExamGroupRecord[]> => {
  const exams = await listExams();
  const grouped = new Map<string, ExamRecord[]>();

  exams.forEach((exam) => {
    const key = normalizeExamGroupKey(exam.name);
    grouped.set(key, [...(grouped.get(key) ?? []), exam]);
  });

  return Array.from(grouped.values())
    .map((records) => summarizeExamGroup(records))
    .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.name.localeCompare(right.name));
};

export const getExamGroupDetail = async (groupId: string): Promise<ExamGroupDetail> => {
  const exams = await listExams();
  const targetKey = normalizeExamGroupKey(decodeURIComponent(groupId));
  const records = exams
    .filter((exam) => normalizeExamGroupKey(exam.name) === targetKey)
    .sort(
      (left, right) =>
        left.className.localeCompare(right.className) ||
        left.section.localeCompare(right.section) ||
        left.startDate.localeCompare(right.startDate),
    );

  if (records.length === 0) {
    throw new Error("Exam group not found.");
  }

  return {
    ...summarizeExamGroup(records),
    records,
  };
};

export const getExamDetail = async (examId: string) => {
  const exam = mapExam(await getExamRowById(examId));
  const subjects = await listExamSubjects(examId);
  return { ...exam, subjectCount: subjects.length };
};

export const getSelectableExamSubjects = async (className: string, section: string): Promise<ExamSubjectOption[]> => {
  if (!className || !section) return [];
  const timetableSubjects = await listAttendanceSubjectsFromTimetable(className, section);
  return Array.from(new Map(timetableSubjects.map((item) => [item.subjectId, item])).values()).map((item) => ({
    subjectId: item.subjectId,
    subjectName: item.subjectName,
    maxMarks: 100,
    teacherId: item.teacherId,
    teacherName: item.teacherName,
    examDate: null,
    examSession: "Morning",
    startTime: EXAM_MORNING_START,
    endTime: EXAM_MORNING_END,
  }));
};

const getSelectedExamSections = (values: ExamFormValues) => {
  const normalizedSections = Array.from(
    new Set(
      (values.sections?.length ? values.sections : [values.section])
        .map((section) => section.trim())
        .filter(Boolean),
    ),
  );

  if (normalizedSections.length === 0) {
    throw new Error("Select at least one section.");
  }

  return normalizedSections;
};

const normalizeExamSubjectPayload = (
  subjects: Array<{
    subjectId: string;
    maxMarks: number | string;
    examDate?: string | null;
    examSession?: ExamRecord["examSession"] | null;
    startTime?: string | null;
    endTime?: string | null;
  }>,
) =>
  Array.from(
    new Map(
      subjects
        .filter((item) => item.subjectId)
        .map((item) => {
          const examSession = item.examSession ?? "Morning";
          const examWindow = getExamTimeWindow(examSession, item.startTime ?? null, item.endTime ?? null);
          const maxMarks = Number(item.maxMarks ?? 0);

          if (!item.examDate) {
            throw new Error("Each exam subject must have an exam date.");
          }

          if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
            throw new Error("Each exam subject must have valid max marks.");
          }

          return [
            item.subjectId,
            {
              subjectId: item.subjectId,
              maxMarks,
              examDate: item.examDate,
              examSession,
              startTime: examWindow.start,
              endTime: examWindow.end,
            },
          ] as const;
        }),
    ).values(),
  );

export const saveExamSubjects = async (
  examId: string,
  subjects: Array<{
    subjectId: string;
    maxMarks: number | string;
    examDate?: string | null;
    examSession?: ExamRecord["examSession"] | null;
    startTime?: string | null;
    endTime?: string | null;
  }>,
) => {
  const client = requireSupabase();
  const normalizedSubjects = normalizeExamSubjectPayload(subjects);

  const deleteExisting = await client.from("exam_subjects").delete().eq("exam_id", examId);
  if (deleteExisting.error) throw new Error(deleteExisting.error.message);

  if (normalizedSubjects.length === 0) return;

  const insertSelected = await client.from("exam_subjects").insert(
    normalizedSubjects.map((subject) => ({
      exam_id: examId,
      subject_id: subject.subjectId,
      max_marks: subject.maxMarks,
      exam_date: subject.examDate,
      exam_session: subject.examSession,
      start_time: subject.startTime,
      end_time: subject.endTime,
    })),
  );

  if (
    insertSelected.error &&
    (isMissingColumnError(insertSelected.error.message, "exam_subjects.exam_date") ||
      isMissingColumnError(insertSelected.error.message, "exam_subjects.exam_session") ||
      isMissingColumnError(insertSelected.error.message, "exam_subjects.start_time") ||
      isMissingColumnError(insertSelected.error.message, "exam_subjects.end_time"))
  ) {
    throw new Error("Your live database is missing the latest exam subject schedule columns. Apply the updated schema.sql and try again.");
  }

  if (insertSelected.error) throw new Error(insertSelected.error.message);

  await syncExamSummaryFromSubjects(
    examId,
    normalizedSubjects.map((subject) => ({
      id: `${examId}-${subject.subjectId}`,
      exam_id: examId,
      subject_id: subject.subjectId,
      max_marks: subject.maxMarks,
      exam_date: subject.examDate,
      exam_session: subject.examSession,
      start_time: subject.startTime,
      end_time: subject.endTime,
    })),
  );
  await logAuditEvent("UPDATE", "EXAM_SUBJECTS", examId);
};

export const createExam = async (values: ExamFormValues) => {
  const client = requireSupabase();
  const sections = getSelectedExamSections(values);
  const normalizedSubjects = values.subjects?.length ? normalizeExamSubjectPayload(values.subjects) : [];
  const derivedSummary =
    normalizedSubjects.length > 0
      ? deriveExamSummaryFromSchedules(
          normalizedSubjects.map((subject) => ({
            examDate: subject.examDate,
            examSession: subject.examSession,
          })),
        )
      : null;
  const startDate = derivedSummary?.startDate ?? values.startDate;
  const endDate = derivedSummary?.endDate ?? values.endDate;
  const examSession = derivedSummary?.examSession ?? values.examSession;
  const payload = sections.map((section) => ({
    name: values.name,
    class: values.className,
    section,
    start_date: startDate,
    end_date: endDate,
    date: startDate,
    exam_session: examSession,
    status: values.status,
  }));

  const { data, error } = await client
    .from("exams")
    .insert(payload)
    .select("id, name, class, section, start_date, end_date, exam_session, status, date");

  if (!error && data?.length) {
    if (normalizedSubjects.length > 0) {
      for (const row of data as ExamRow[]) {
        await saveExamSubjects(row.id, normalizedSubjects);
      }
    }
    const exam = mapExam((data as ExamRow[])[0]);
    await logAuditEvent("CREATE", "EXAM", exam.id);
    return exam;
  }

  if (error && isMissingColumnError(error.message, "exams.exam_session")) {
    const retryWithoutSession = await client
      .from("exams")
      .insert(payload.map(({ exam_session: _examSession, ...item }) => item))
      .select("id, name, class, section, start_date, end_date, status, date");
    if (retryWithoutSession.error || !retryWithoutSession.data?.length) {
      throw new Error(retryWithoutSession.error?.message ?? "Unable to create exam.");
    }
    if (normalizedSubjects.length > 0) {
      for (const row of retryWithoutSession.data as ExamRow[]) {
        await saveExamSubjects(row.id, normalizedSubjects);
      }
    }
    const exam = mapExam((retryWithoutSession.data as ExamRow[])[0]);
    await logAuditEvent("CREATE", "EXAM", exam.id);
    return exam;
  }

  if (error && isNotNullConstraintError(error.message, "exam_date")) {
    const legacyRetry = await client
      .from("exams")
      .insert(payload.map((item) => ({ ...item, exam_date: startDate })))
      .select("id, name, class, section, start_date, end_date, exam_session, status, date, exam_date");
    if (legacyRetry.error || !legacyRetry.data?.length) {
      throw new Error(legacyRetry.error?.message ?? "Unable to create exam.");
    }
    if (normalizedSubjects.length > 0) {
      for (const row of legacyRetry.data as ExamRow[]) {
        await saveExamSubjects(row.id, normalizedSubjects);
      }
    }
    const exam = mapExam((legacyRetry.data as ExamRow[])[0]);
    await logAuditEvent("CREATE", "EXAM", exam.id);
    return exam;
  }

  if (error) throw new Error(error.message);
  const exam = mapExam((data as ExamRow[])[0]);
  await logAuditEvent("CREATE", "EXAM", exam.id);
  return exam;
};

export const updateExam = async (examId: string, values: ExamFormValues) => {
  const client = requireSupabase();
  const normalizedSubjects = values.subjects?.length ? normalizeExamSubjectPayload(values.subjects) : [];
  const derivedSummary =
    normalizedSubjects.length > 0
      ? deriveExamSummaryFromSchedules(
          normalizedSubjects.map((subject) => ({
            examDate: subject.examDate,
            examSession: subject.examSession,
          })),
        )
      : null;
  const startDate = derivedSummary?.startDate ?? values.startDate;
  const endDate = derivedSummary?.endDate ?? values.endDate;
  const examSession = derivedSummary?.examSession ?? values.examSession;
  const basePayload = {
    name: values.name,
    class: values.className,
    section: values.section,
    start_date: startDate,
    end_date: endDate,
    date: startDate,
    exam_session: examSession,
    status: values.status,
  };

  const { data, error } = await client
    .from("exams")
    .update(basePayload)
    .eq("id", examId)
    .select("id, name, class, section, start_date, end_date, exam_session, status, date")
    .single();

  if (!error && data) {
    if (normalizedSubjects.length > 0) {
      await saveExamSubjects(examId, normalizedSubjects);
    }
    const exam = mapExam(data as ExamRow);
    await logAuditEvent("UPDATE", "EXAM", exam.id);
    return exam;
  }

  if (error && isMissingColumnError(error.message, "exams.exam_session")) {
    const retryWithoutSession = await client
      .from("exams")
      .update({
        name: values.name,
        class: values.className,
        section: values.section,
        start_date: startDate,
        end_date: endDate,
        date: startDate,
        status: values.status,
      })
      .eq("id", examId)
      .select("id, name, class, section, start_date, end_date, status, date")
      .single();
    if (retryWithoutSession.error || !retryWithoutSession.data) {
      throw new Error(retryWithoutSession.error?.message ?? "Unable to update exam.");
    }
    if (normalizedSubjects.length > 0) {
      await saveExamSubjects(examId, normalizedSubjects);
    }
    const exam = mapExam(retryWithoutSession.data as ExamRow);
    await logAuditEvent("UPDATE", "EXAM", exam.id);
    return exam;
  }

  if (error && isNotNullConstraintError(error.message, "exam_date")) {
    const legacyRetry = await client
      .from("exams")
      .update({
        ...basePayload,
        exam_date: startDate,
      })
      .eq("id", examId)
      .select("id, name, class, section, start_date, end_date, exam_session, status, date, exam_date")
      .single();
    if (legacyRetry.error || !legacyRetry.data) {
      throw new Error(legacyRetry.error?.message ?? "Unable to update exam.");
    }
    if (normalizedSubjects.length > 0) {
      await saveExamSubjects(examId, normalizedSubjects);
    }
    const exam = mapExam(legacyRetry.data as ExamRow);
    await logAuditEvent("UPDATE", "EXAM", exam.id);
    return exam;
  }

  if (error) throw new Error(error.message);
  const exam = mapExam(data as ExamRow);
  await logAuditEvent("UPDATE", "EXAM", exam.id);
  return exam;
};

export const deleteExam = async (examId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("exams").delete().eq("id", examId);
  if (error) throw new Error(error.message);
  await logAuditEvent("DELETE", "EXAM", examId);
};

const getExamsMap = async (examIds: string[]) => {
  if (examIds.length === 0) return new Map<string, ExamRecord>();
  const exams = await listExams();
  return new Map(exams.filter((item) => examIds.includes(item.id)).map((item) => [item.id, item]));
};

export const listResults = async (examId?: string): Promise<ResultRecord[]> => {
  const client = requireSupabase();
  const marksQuery = examId
    ? client.from("marks").select("id, exam_id, student_id, subject_id, marks_obtained, grade, created_at").eq("exam_id", examId)
    : client.from("marks").select("id, exam_id, student_id, subject_id, marks_obtained, grade, created_at");
  const { data, error } = await marksQuery;
  if (error) throw new Error(error.message);

  const marks = (data ?? []) as MarkRow[];
  const exams = examId ? [await getExamDetail(examId)] : await listExams();
  const examMap = new Map(exams.map((exam) => [exam.id, exam]));
  const studentsMap = await getStudentsMap(marks.map((row) => row.student_id));
  const examSubjectsRows = await client.from("exam_subjects").select("exam_id, subject_id, max_marks");
  if (examSubjectsRows.error) throw new Error(examSubjectsRows.error.message);

  const examSubjectMap = new Map<string, number>();
  ((examSubjectsRows.data ?? []) as ExamSubjectRow[]).forEach((row) => {
    examSubjectMap.set(`${row.exam_id}:${row.subject_id}`, Number(row.max_marks ?? 100));
  });

  const grouped = new Map<string, ResultRecord>();
  marks.forEach((row) => {
    const exam = examMap.get(row.exam_id);
    const student = studentsMap.get(row.student_id);
    if (!exam || !student) return;

    const key = `${row.student_id}:${row.exam_id}`;
    const current = grouped.get(key) ?? {
      id: key,
      studentId: row.student_id,
      studentName: student.name,
      className: student.className,
      section: student.section,
      examId: row.exam_id,
      examName: exam.name,
      startDate: exam.startDate,
      endDate: exam.endDate,
      examStatus: exam.status,
      totalMarks: 0,
      maxMarks: 0,
      percentage: 0,
      finalGrade: "F",
      passStatus: "Fail" as const,
      publishedSubjects: 0,
    };

    current.totalMarks += Number(row.marks_obtained ?? 0);
    current.maxMarks += examSubjectMap.get(`${row.exam_id}:${row.subject_id}`) ?? 100;
    current.publishedSubjects += 1;
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((item) => {
      const percentage = item.maxMarks > 0 ? Number(((item.totalMarks / item.maxMarks) * 100).toFixed(2)) : 0;
      const finalGrade = gradeFromPercentage(percentage);
      return {
        ...item,
        percentage,
        finalGrade,
        passStatus: passStatusFromGrade(finalGrade),
      };
    })
    .sort((a, b) => a.examName.localeCompare(b.examName) || a.studentName.localeCompare(b.studentName));
};

export const getResultDetail = async (resultId: string): Promise<ResultDetail> => {
  const client = requireSupabase();
  let studentId = "";
  let examId = "";

  if (resultId.includes(":")) {
    [studentId, examId] = resultId.split(":");
  } else {
    const { data, error } = await client
      .from("marks")
      .select("student_id, exam_id")
      .eq("id", resultId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Result not found.");
    studentId = data.student_id;
    examId = data.exam_id;
  }

  const exam = await getExamDetail(examId);
  const student = await getStudentDetail(studentId);
  const subjects = await listExamSubjects(examId);
  const subjectMap = new Map(subjects.map((subject) => [subject.subjectId, subject]));
  const { data: markRows, error } = await client
    .from("marks")
    .select("id, exam_id, student_id, subject_id, marks_obtained, grade, created_at")
    .eq("exam_id", examId)
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);

  const marks = (markRows ?? []) as MarkRow[];
  const detailSubjects = marks
    .map((mark) => {
      const examSubject = subjectMap.get(mark.subject_id);
      if (!examSubject) return null;
      const grade = mark.grade ?? gradeFromMarks(Number(mark.marks_obtained ?? 0));
      return {
        markId: mark.id,
        subjectId: mark.subject_id,
        subjectName: examSubject.subjectName,
        maxMarks: examSubject.maxMarks,
        marksObtained: Number(mark.marks_obtained ?? 0),
        grade,
        passStatus: passStatusFromGrade(grade),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  const totalMarks = detailSubjects.reduce((sum, subject) => sum + subject.marksObtained, 0);
  const maxMarks = detailSubjects.reduce((sum, subject) => sum + subject.maxMarks, 0);
  const percentage = maxMarks > 0 ? Number(((totalMarks / maxMarks) * 100).toFixed(2)) : 0;
  const finalGrade = gradeFromPercentage(percentage);

  return {
    studentId: student.id,
    studentName: student.name,
    className: student.className,
    section: student.section,
    examId: exam.id,
    examName: exam.name,
    startDate: exam.startDate,
    endDate: exam.endDate,
    examStatus: exam.status,
    subjects: detailSubjects,
    totalMarks,
    maxMarks,
    percentage,
    finalGrade,
    passStatus: passStatusFromGrade(finalGrade),
  };
};

export const listExamSubjects = async (examId: string): Promise<ExamSubjectOption[]> => {
  const exam = mapExam(await getExamRowById(examId));
  const rows = await listExamSubjectRows({ examId });
  const timetableSubjects = await listAttendanceSubjectsFromTimetable(exam.className, exam.section);
  const timetableMap = new Map(timetableSubjects.map((item) => [item.subjectId, item]));
  const subjectsMap = await getSubjectsMap(rows.map((row) => row.subject_id));

  if (rows.length > 0) {
    return rows.map((row) => ({
      subjectId: row.subject_id,
      subjectName: subjectsMap.get(row.subject_id)?.name ?? timetableMap.get(row.subject_id)?.subjectName ?? "Unknown subject",
      maxMarks: Number(row.max_marks ?? 100),
      teacherId: timetableMap.get(row.subject_id)?.teacherId ?? null,
      teacherName: timetableMap.get(row.subject_id)?.teacherName ?? null,
      examDate: getExamSubjectSchedule(row, exam).examDate,
      examSession: getExamSubjectSchedule(row, exam).examSession,
      startTime: getExamSubjectSchedule(row, exam).startTime,
      endTime: getExamSubjectSchedule(row, exam).endTime,
    }));
  }

  return getSelectableExamSubjects(exam.className, exam.section);
};

export const loadExamMarksSession = async (
  examId: string,
  subjectId: string,
): Promise<ExamMarksSession> => {
  const client = requireSupabase();
  const exam = await getExamDetail(examId);

  if (!isExamMarksEntryOpen(exam)) {
    throw new Error(getExamMarksEntryAvailabilityMessage(exam));
  }

  const subjects = await listExamSubjects(examId);
  const selectedSubject = subjects.find((item) => item.subjectId === subjectId);

  if (!selectedSubject) {
    throw new Error("Selected subject is not assigned in the timetable for this exam class and section.");
  }

  const { data: studentRows, error: studentError } = await client
    .from("students")
    .select("id, name")
    .eq("class", exam.className)
    .eq("section", exam.section)
    .order("name");

  if (studentError) throw new Error(studentError.message);

  const studentIds = (studentRows ?? []).map((row) => row.id);
  let resultRows: MarkRow[] = [];

  if (studentIds.length > 0) {
    const modernResults = await client
      .from("marks")
      .select("id, student_id, subject_id, exam_id, marks_obtained, grade, created_at")
      .eq("exam_id", examId)
      .eq("subject_id", subjectId)
      .in("student_id", studentIds);

    if (modernResults.error) throw new Error(modernResults.error.message);
    resultRows = (modernResults.data ?? []) as MarkRow[];
  }

  const resultMap = new Map(resultRows.map((row) => [row.student_id, row]));
  const rows: ExamMarksRow[] = (studentRows ?? []).map((student) => {
    const existing = resultMap.get(student.id);
    const marks = existing?.marks_obtained != null ? String(existing.marks_obtained) : "";
    return {
      studentId: student.id,
      studentName: student.name ?? "Unknown student",
      maxMarks: selectedSubject.maxMarks,
      marks,
      grade: marks === "" ? "-" : gradeFromMarks(Number(marks)),
      markId: existing?.id ?? null,
      changed: false,
    };
  });

  return {
    examId: exam.id,
    examName: exam.name,
    className: exam.className,
    section: exam.section,
    startDate: exam.startDate,
    endDate: exam.endDate,
    examStatus: exam.status,
    subjectId,
    subjectName: selectedSubject.subjectName,
    examDate: selectedSubject.examDate,
    examSession: selectedSubject.examSession,
    startTime: selectedSubject.startTime,
    endTime: selectedSubject.endTime,
    maxMarks: selectedSubject.maxMarks,
    teacherId: selectedSubject.teacherId,
    teacherName: selectedSubject.teacherName,
    rows,
  };
};

export const saveExamMarksSession = async (session: ExamMarksSession): Promise<ExamMarksSession> => {
  const client = requireSupabase();
  const exam = await getExamDetail(session.examId);

  if (!isExamMarksEntryOpen(exam)) {
    throw new Error(getExamMarksEntryAvailabilityMessage(exam));
  }

  const rowsToSave = session.rows.filter((row) => row.marks.trim() !== "");
  const modernExistingRows = await client
    .from("marks")
    .select("id, student_id")
    .eq("exam_id", session.examId)
    .eq("subject_id", session.subjectId)
    .in("student_id", session.rows.map((row) => row.studentId));

  if (modernExistingRows.error) throw new Error(modernExistingRows.error.message);
  const existingMap = new Map(
    ((modernExistingRows.data ?? []) as Array<{ id: string; student_id: string }>).map((row) => [row.student_id, row.id]),
  );

  for (const row of rowsToSave) {
    const marks = Number(row.marks);
    if (!Number.isFinite(marks) || marks < 0 || marks > row.maxMarks) {
      throw new Error(`Marks for ${row.studentName} must be between 0 and ${row.maxMarks}.`);
    }

    const payload = {
      exam_id: session.examId,
      student_id: row.studentId,
      subject_id: session.subjectId,
      marks_obtained: marks,
      grade: gradeFromMarks(marks),
    };

    if (existingMap.has(row.studentId)) {
      const modernUpdate = await client.from("marks").update(payload).eq("id", existingMap.get(row.studentId)!);
      if (modernUpdate.error) throw new Error(modernUpdate.error.message);
    } else {
      const modernInsert = await client.from("marks").insert(payload);
      if (modernInsert.error) throw new Error(modernInsert.error.message);
    }
  }

  const savedSession = await loadExamMarksSession(session.examId, session.subjectId);
  await logAuditEvent("UPDATE", "RESULT", session.examId);
  return savedSession;
};

export const deleteResult = async (resultId: string) => {
  const client = requireSupabase();
  if (resultId.includes(":")) {
    const [studentId, examId] = resultId.split(":");
    const { error } = await client.from("marks").delete().eq("student_id", studentId).eq("exam_id", examId);
    if (error) throw new Error(error.message);
    await logAuditEvent("DELETE", "RESULT", examId);
    return;
  }

  const { error } = await client.from("marks").delete().eq("id", resultId);
  if (error) throw new Error(error.message);
  await logAuditEvent("DELETE", "RESULT", resultId);
};

export const listFees = async (): Promise<FeeRecord[]> => {
  const client = requireSupabase();
  const modernQuery = await client
    .from("fees")
    .select("id, student_id, total_amount, paid_amount, status, due_date, created_at")
    .order("due_date");

  let rows: FeeRow[] = [];

  if (!modernQuery.error) {
    rows = (modernQuery.data ?? []) as FeeRow[];
  } else if (
    isMissingColumnError(modernQuery.error.message, "fees.total_amount") ||
    isMissingColumnError(modernQuery.error.message, "fees.paid_amount")
  ) {
    const legacyQuery = await client
      .from("fees")
      .select("id, student_id, amount, status, due_date")
      .order("due_date");
    if (legacyQuery.error) throw new Error(legacyQuery.error.message);
    rows = ((legacyQuery.data ?? []) as FeeRow[]).map((row) => ({
      ...row,
      total_amount: row.amount ?? 0,
      paid_amount: row.status?.toLowerCase() === "paid" ? row.amount ?? 0 : 0,
    }));
  } else {
    throw new Error(modernQuery.error.message);
  }

  const studentsMap = await getStudentsMap(rows.map((row) => row.student_id));
  return rows.map((row) => {
    const student = studentsMap.get(row.student_id);
    const totalAmount = Number(row.total_amount ?? row.amount ?? 0);
    const paidAmount = Number(row.paid_amount ?? 0);
    return {
      id: row.id,
      studentId: row.student_id,
      studentName: student?.name ?? "Unknown student",
      className: student?.className ?? null,
      section: student?.section ?? null,
      totalAmount,
      paidAmount,
      remainingAmount: Math.max(totalAmount - paidAmount, 0),
      status: row.status ?? deriveFeeStatus(totalAmount, paidAmount),
      dueDate: row.due_date,
    };
  });
};

export const getFeeDetail = async (feeId: string) => {
  const fees = await listFees();
  const fee = fees.find((item) => item.id === feeId);
  if (!fee) throw new Error("Fee record not found.");
  return fee;
};

export const createFee = async (values: FeeFormValues) => {
  const client = requireSupabase();
  const totalAmount = Number(values.totalAmount);
  const modernInsert = await client
    .from("fees")
    .insert({
      student_id: values.studentId,
      total_amount: totalAmount,
      paid_amount: 0,
      status: "Unpaid",
      due_date: values.dueDate,
    })
    .select("id")
    .single();

  if (!modernInsert.error && modernInsert.data) {
    const fee = await getFeeDetail(modernInsert.data.id);
    await logAuditEvent("CREATE", "FEES", fee.id);
    return fee;
  }

  if (
    modernInsert.error &&
    (isMissingColumnError(modernInsert.error.message, "fees.total_amount") ||
      isMissingColumnError(modernInsert.error.message, "fees.paid_amount"))
  ) {
    const legacyInsert = await client
      .from("fees")
      .insert({
        student_id: values.studentId,
        amount: totalAmount,
        status: "unpaid",
        due_date: values.dueDate,
      })
      .select("id")
      .single();
    if (legacyInsert.error || !legacyInsert.data) {
      throw new Error(legacyInsert.error?.message ?? "Unable to create fee record.");
    }
    const fee = await getFeeDetail(legacyInsert.data.id);
    await logAuditEvent("CREATE", "FEES", fee.id);
    return fee;
  }

  const createdFeeId = (modernInsert.data as { id: string } | null)?.id;
  if (modernInsert.error || !createdFeeId) {
    throw new Error(modernInsert.error?.message ?? "Unable to create fee record.");
  }
  const fee = await getFeeDetail(createdFeeId);
  await logAuditEvent("CREATE", "FEES", fee.id);
  return fee;
};

export const updateFee = async (feeId: string, values: FeeFormValues) => {
  const client = requireSupabase();
  const current = await getFeeDetail(feeId);
  const totalAmount = Number(values.totalAmount);
  const paidAmount = Math.min(current.paidAmount, totalAmount);
  const status = deriveFeeStatus(totalAmount, paidAmount);

  const modernUpdate = await client
    .from("fees")
    .update({
      student_id: values.studentId,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      status,
      due_date: values.dueDate,
    })
    .eq("id", feeId);

  if (
    modernUpdate.error &&
    (isMissingColumnError(modernUpdate.error.message, "fees.total_amount") ||
      isMissingColumnError(modernUpdate.error.message, "fees.paid_amount"))
  ) {
    const legacyUpdate = await client
      .from("fees")
      .update({
        student_id: values.studentId,
        amount: totalAmount,
        status: status.toLowerCase(),
        due_date: values.dueDate,
      })
      .eq("id", feeId);
    if (legacyUpdate.error) throw new Error(legacyUpdate.error.message);
    const fee = await getFeeDetail(feeId);
    await logAuditEvent("UPDATE", "FEES", fee.id);
    return fee;
  }

  if (modernUpdate.error) throw new Error(modernUpdate.error.message);
  const fee = await getFeeDetail(feeId);
  await logAuditEvent("UPDATE", "FEES", fee.id);
  return fee;
};

export const deleteFee = async (feeId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("fees").delete().eq("id", feeId);
  if (error) throw new Error(error.message);
  await logAuditEvent("DELETE", "FEES", feeId);
};

export const addFeePayment = async (feeId: string, values: FeePaymentValues) => {
  const client = requireSupabase();
  const paymentAmount = Number(values.amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const current = await getFeeDetail(feeId);
  const newPaidAmount = current.paidAmount + paymentAmount;
  if (newPaidAmount > current.totalAmount) {
    throw new Error("Payment cannot exceed the total amount.");
  }

  const status = deriveFeeStatus(current.totalAmount, newPaidAmount);
  const modernUpdate = await client
    .from("fees")
    .update({
      paid_amount: newPaidAmount,
      status,
    })
    .eq("id", feeId);

  if (
    modernUpdate.error &&
    (isMissingColumnError(modernUpdate.error.message, "fees.paid_amount") ||
      isMissingColumnError(modernUpdate.error.message, "fees.total_amount"))
  ) {
    throw new Error("Payment tracking requires the updated fees table. Run the latest schema.sql in Supabase.");
  }

  if (modernUpdate.error) throw new Error(modernUpdate.error.message);
  const fee = await getFeeDetail(feeId);
  await logAuditEvent("UPDATE", "FEES", fee.id);
  return fee;
};

export const listEmployees = async (): Promise<EmployeeRecord[]> => {
  const staffRows = await listStaff();
  return staffRows.map((staff) => ({
    id: staff.id,
    name: staff.name,
    role: staff.role,
    subjectName: staff.subjectName,
    isClassCoordinator: staff.isClassCoordinator,
    assignedClass: staff.assignedClass,
    assignedSection: staff.assignedSection,
    email: staff.email,
    mobileNumber: staff.mobileNumber,
    dateOfJoining: staff.dateOfJoining,
    monthlySalary: staff.monthlySalary,
    userId: staff.userId,
    photoUrl: staff.photoUrl,
  }));
};

export const getEmployeeDetail = async (employeeId: string) => {
  const staff = await getStaffDetail(employeeId);
  return {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    subjectName: staff.subjectName,
    isClassCoordinator: staff.isClassCoordinator,
    assignedClass: staff.assignedClass,
    assignedSection: staff.assignedSection,
    email: staff.email,
    mobileNumber: staff.mobileNumber,
    dateOfJoining: staff.dateOfJoining,
    monthlySalary: staff.monthlySalary,
    userId: staff.userId,
    photoUrl: staff.photoUrl,
  } satisfies EmployeeRecord;
};

export const createEmployee = async (values: EmployeeFormValues) => {
  const staff = await createStaff(values);
  return {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    subjectName: staff.subjectName,
    isClassCoordinator: staff.isClassCoordinator,
    assignedClass: staff.assignedClass,
    assignedSection: staff.assignedSection,
    email: staff.email,
    mobileNumber: staff.mobileNumber,
    dateOfJoining: staff.dateOfJoining,
    monthlySalary: staff.monthlySalary,
    userId: staff.userId,
    photoUrl: staff.photoUrl,
  } satisfies EmployeeRecord;
};

export const updateEmployee = async (employeeId: string, values: EmployeeFormValues) => {
  const current = await getStaffDetail(employeeId);
  const staff = await updateStaff(employeeId, current.userId, values);
  return {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    subjectName: staff.subjectName,
    isClassCoordinator: staff.isClassCoordinator,
    assignedClass: staff.assignedClass,
    assignedSection: staff.assignedSection,
    email: staff.email,
    mobileNumber: staff.mobileNumber,
    dateOfJoining: staff.dateOfJoining,
    monthlySalary: staff.monthlySalary,
    userId: staff.userId,
    photoUrl: staff.photoUrl,
  } satisfies EmployeeRecord;
};

export const deleteEmployee = async (employeeId: string) => {
  await deleteStaff(employeeId);
};

export const listLeaves = async (): Promise<LeaveRecord[]> => {
  const client = requireSupabase();
  const modernQuery = await client
    .from("leaves")
    .select("id, staff_id, start_date, end_date, status, reason, hr_comment, admin_comment")
    .order("start_date", { ascending: false });
  let rows: LeaveRow[] = [];
  if (!modernQuery.error) {
    rows = (modernQuery.data ?? []) as LeaveRow[];
  } else if (isMissingColumnError(modernQuery.error.message, "leaves.staff_id")) {
    const legacyQuery = await client
      .from("leaves")
      .select("id, employee_id, start_date, end_date, status, reason, hr_comment, admin_comment")
      .order("start_date", { ascending: false });
    if (legacyQuery.error) throw new Error(legacyQuery.error.message);
    rows = (legacyQuery.data ?? []) as LeaveRow[];
  } else {
    throw new Error(modernQuery.error.message);
  }
  const employeesMap = new Map((await listEmployees()).map((employee) => [employee.id, employee]));
  return rows.map((row) => ({
    id: row.id,
    staffId: row.staff_id ?? row.employee_id ?? null,
    employeeName:
      row.staff_id || row.employee_id
        ? employeesMap.get(row.staff_id ?? row.employee_id ?? "")?.name ?? "Unknown employee"
        : "Unknown employee",
    role: row.staff_id || row.employee_id ? employeesMap.get(row.staff_id ?? row.employee_id ?? "")?.role ?? null : null,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as LeaveRecord["status"],
    reason: row.reason,
    hrComment: row.hr_comment ?? null,
    adminComment: row.admin_comment ?? null,
  }));
};

export const getLeaveDetail = async (leaveId: string) => {
  const leaves = await listLeaves();
  const leave = leaves.find((item) => item.id === leaveId);
  if (!leave) throw new Error("Leave request not found.");
  return leave;
};

export const createLeave = async (values: LeaveFormValues) => {
  const client = requireSupabase();
  const modernInsert = await client
    .from("leaves")
    .insert({
      staff_id: values.staffId,
      start_date: values.startDate,
      end_date: values.endDate,
      status: "Pending_HR",
      reason: values.reason || null,
      hr_comment: null,
      admin_comment: null,
    })
    .select("id")
    .single();
  if (!modernInsert.error && modernInsert.data) {
    const leave = await getLeaveDetail(modernInsert.data.id);
    await logAuditEvent("CREATE", "LEAVES", leave.id);
    return leave;
  }
  if (modernInsert.error && isMissingColumnError(modernInsert.error.message, "leaves.staff_id")) {
    const legacyInsert = await client
      .from("leaves")
      .insert({
        employee_id: values.staffId,
        start_date: values.startDate,
        end_date: values.endDate,
        status: "Pending_HR",
        reason: values.reason || null,
        hr_comment: null,
        admin_comment: null,
      })
      .select("id")
      .single();
    if (legacyInsert.error || !legacyInsert.data) throw new Error(legacyInsert.error?.message ?? "Unable to create leave request.");
    const leave = await getLeaveDetail(legacyInsert.data.id);
    await logAuditEvent("CREATE", "LEAVES", leave.id);
    return leave;
  }
  throw new Error(modernInsert.error?.message ?? "Unable to create leave request.");
};

export const updateLeave = async (leaveId: string, values: LeaveFormValues) => {
  const client = requireSupabase();
  const existing = await getLeaveDetail(leaveId);
  const modernUpdate = await client
    .from("leaves")
    .update({
      staff_id: values.staffId,
      start_date: values.startDate,
      end_date: values.endDate,
      status: existing.status,
      reason: values.reason || null,
      hr_comment: existing.hrComment,
      admin_comment: existing.adminComment,
    })
    .eq("id", leaveId);
  if (modernUpdate.error && isMissingColumnError(modernUpdate.error.message, "leaves.staff_id")) {
    const legacyUpdate = await client
      .from("leaves")
      .update({
        employee_id: values.staffId,
        start_date: values.startDate,
        end_date: values.endDate,
        status: existing.status,
        reason: values.reason || null,
        hr_comment: existing.hrComment,
        admin_comment: existing.adminComment,
      })
      .eq("id", leaveId);
    if (legacyUpdate.error) throw new Error(legacyUpdate.error.message);
    const leave = await getLeaveDetail(leaveId);
    await logAuditEvent("UPDATE", "LEAVES", leave.id);
    return leave;
  }
  if (modernUpdate.error) throw new Error(modernUpdate.error.message);
  const leave = await getLeaveDetail(leaveId);
  await logAuditEvent("UPDATE", "LEAVES", leave.id);
  return leave;
};

export const deleteLeave = async (leaveId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("leaves").delete().eq("id", leaveId);
  if (error) throw new Error(error.message);
  await logAuditEvent("DELETE", "LEAVES", leaveId);
};

const mapTimetableImpacts = async (rows: TimetableAdjustmentRow[]): Promise<TimetableImpactRecord[]> => {
  if (rows.length === 0) return [];

  const timetableIds = Array.from(new Set(rows.map((row) => row.timetable_id)));
  const teacherIds = Array.from(
    new Set(rows.flatMap((row) => (row.replacement_teacher_id ? [row.replacement_teacher_id] : []))),
  );
  const subjectIds = Array.from(
    new Set(rows.flatMap((row) => (row.replacement_subject_id ? [row.replacement_subject_id] : []))),
  );

  const client = requireSupabase();
  const timetableResult = await client
    .from("timetable")
    .select("id, class, section, subject_id, teacher_id, day, start_time, end_time, is_cancelled, cancellation_reason")
    .in("id", timetableIds);
  if (timetableResult.error) throw new Error(timetableResult.error.message);

  const baseSlots = await mapTimetableSlots((timetableResult.data ?? []) as TimetableRow[]);
  const baseSlotMap = new Map(baseSlots.map((slot) => [slot.id, slot]));
  const staffRows = await listStaff();
  const staffMap = new Map(staffRows.map((staff) => [staff.id, staff]));
  const subjectsMap = await getSubjectsMap(subjectIds);

  return rows
    .map((row) => {
      const baseSlot = baseSlotMap.get(row.timetable_id);
      if (!baseSlot) return null;

      return {
        id: row.id,
        leaveId: row.leave_id,
        timetableId: row.timetable_id,
        impactDate: row.impact_date,
        status: row.status ?? "Pending_Action",
        className: baseSlot.className,
        section: baseSlot.section,
        subjectId: baseSlot.subjectId ?? "",
        subjectName: baseSlot.subjectName,
        teacherId: baseSlot.teacherId ?? "",
        teacherName: baseSlot.teacherName,
        startTime: baseSlot.startTime,
        endTime: baseSlot.endTime,
        day: baseSlot.day,
        replacementTeacherId: row.replacement_teacher_id,
        replacementTeacherName: row.replacement_teacher_id ? staffMap.get(row.replacement_teacher_id)?.name ?? "Unknown teacher" : null,
        replacementSubjectId: row.replacement_subject_id,
        replacementSubjectName: row.replacement_subject_id ? subjectsMap.get(row.replacement_subject_id)?.name ?? "Unknown subject" : null,
        replacementStartTime: row.replacement_start_time ? normalizeTime(row.replacement_start_time) : null,
        replacementEndTime: row.replacement_end_time ? normalizeTime(row.replacement_end_time) : null,
        note: row.note,
        resolvedBy: row.resolved_by,
        resolvedAt: row.resolved_at,
      } satisfies TimetableImpactRecord;
    })
    .filter((item): item is TimetableImpactRecord => Boolean(item))
    .sort((left, right) => {
      const dateOrder = left.impactDate.localeCompare(right.impactDate);
      if (dateOrder !== 0) return dateOrder;
      const timeOrder = left.startTime.localeCompare(right.startTime);
      if (timeOrder !== 0) return timeOrder;
      return left.className.localeCompare(right.className);
    });
};

const syncApprovedLeaveImpacts = async (leaveId: string) => {
  const leave = await getLeaveDetail(leaveId);
  if (leave.status !== "Approved" || !leave.staffId) {
    return [];
  }

  const client = requireSupabase();
  const staffRows = await listStaff();
  const teacher = staffRows.find((item) => item.id === leave.staffId) ?? null;
  const allTeacherSlots = await listTimetableSlots({ teacherId: leave.staffId });
  const leaveDates = buildDateRange(leave.startDate, leave.endDate);

  const impactedSlots = leaveDates.flatMap((date) => {
    const weekday = getWeekdayFromDateString(date).slice(0, 3) as TimetableDay;
    if (weekday === "Sun") return [];

    return allTeacherSlots
      .filter((slot) => slot.day === weekday)
      .map((slot) => ({
        leave_id: leave.id,
        timetable_id: slot.id,
        impact_date: date,
        status: "Pending_Action" as const,
      }));
  });

  if (impactedSlots.length > 0) {
    const upsertResult = await client
      .from("timetable_adjustments")
      .upsert(impactedSlots, { onConflict: "leave_id,timetable_id,impact_date" });
    if (upsertResult.error) throw new Error(upsertResult.error.message);
  }

  const impacts = await listTimetableImpactsByLeaveId(leave.id);
  const coordinatorNotifications = new Map<string, { receiver_id: string; message: string }>();
  const coordinatorByClassSection = new Map(
    staffRows
      .filter(
        (item): item is StaffRecord & { assignedClass: string; assignedSection: string } =>
          item.isClassCoordinator && Boolean(item.assignedClass) && Boolean(item.assignedSection),
      )
      .map((item) => [
        `${item.assignedClass.trim().toLowerCase()}::${item.assignedSection.trim().toLowerCase()}`,
        item,
      ] as const),
  );

  const examDayCache = new Map<string, Promise<boolean>>();
  const hasExamOnImpactDate = (className: string, section: string, impactDate: string) => {
    const key = `${className}::${section}::${impactDate}`;
    if (!examDayCache.has(key)) {
      examDayCache.set(
        key,
        getExamForClassSectionDate(className, section, impactDate).then((exam) => Boolean(exam)),
      );
    }
    return examDayCache.get(key)!;
  };

  for (const impact of impacts) {
    if (await hasExamOnImpactDate(impact.className, impact.section, impact.impactDate)) {
      continue;
    }

    const coordinator =
      coordinatorByClassSection.get(
        `${impact.className.trim().toLowerCase()}::${impact.section.trim().toLowerCase()}`,
      ) ?? null;
    if (!coordinator) continue;

    const key = `${coordinator.id}::${impact.className}::${impact.section}`;
    if (coordinatorNotifications.has(key)) continue;

    coordinatorNotifications.set(key, {
      receiver_id: coordinator.id,
      message: `Teacher ${teacher?.name ?? leave.employeeName} is on approved leave. Please reschedule or cancel classes for ${impact.className}-${impact.section}.`,
    });
  }

  const deleteResult = await client.from("notifications").delete().eq("related_leave_id", leave.id).eq("type", "LEAVE_IMPACT");
  if (deleteResult.error) throw new Error(deleteResult.error.message);

  if (coordinatorNotifications.size > 0) {
    const insertResult = await client.from("notifications").insert(
      Array.from(coordinatorNotifications.values()).map((notification) => ({
        type: "LEAVE_IMPACT",
        message: notification.message,
        receiver_id: notification.receiver_id,
        related_leave_id: leave.id,
        is_read: false,
      })),
    );
    if (insertResult.error) throw new Error(insertResult.error.message);
  }

  return impacts;
};

export const reviewLeaveByHr = async (
  leaveId: string,
  decision: "Pending_Admin" | "Rejected_By_HR",
  hrComment: string,
) => {
  const client = requireSupabase();
  const { error } = await client
    .from("leaves")
    .update({
      status: decision,
      hr_comment: hrComment || null,
    })
    .eq("id", leaveId)
    .eq("status", "Pending_HR");
  if (error) throw new Error(error.message);
  const leave = await getLeaveDetail(leaveId);
  await logAuditEvent("UPDATE", "LEAVES", leave.id);
  return leave;
};

export const reviewLeaveByAdmin = async (
  leaveId: string,
  decision: "Approved" | "Rejected_By_Admin",
  adminComment: string,
) => {
  const client = requireSupabase();
  const { error } = await client
    .from("leaves")
    .update({
      status: decision,
      admin_comment: adminComment || null,
    })
    .eq("id", leaveId)
    .eq("status", "Pending_Admin");
  if (error) throw new Error(error.message);
  if (decision === "Approved") {
    await syncApprovedLeaveImpacts(leaveId);
  }
  const leave = await getLeaveDetail(leaveId);
  await logAuditEvent("UPDATE", "LEAVES", leave.id);
  return leave;
};

export const getAnalyticsDashboard = async (): Promise<AnalyticsDashboard> => {
  const client = requireSupabase();
  const [overviewResult, monthlyResult, attendanceResult, performanceResult] = await Promise.all([
    client.rpc("analytics_overview"),
    client.rpc("analytics_monthly_fee_collection"),
    client.rpc("analytics_attendance_distribution"),
    client.rpc("analytics_subject_performance"),
  ]);

  if (overviewResult.error) throw new Error(overviewResult.error.message);
  if (monthlyResult.error) throw new Error(monthlyResult.error.message);
  if (attendanceResult.error) throw new Error(attendanceResult.error.message);
  if (performanceResult.error) throw new Error(performanceResult.error.message);

  const overview = ((overviewResult.data ?? []) as AnalyticsOverviewRow[])[0] ?? {
    total_students: 0,
    total_staff: 0,
    total_fees_collected: 0,
    pending_fees: 0,
  };

  return {
    metrics: [
      {
        label: "Total Students",
        value: String(toNumber(overview.total_students)),
        helper: "Live student count from the students table.",
      },
      {
        label: "Total Staff",
        value: String(toNumber(overview.total_staff)),
        helper: "Live staff count from the staff table.",
      },
      {
        label: "Total Fees Collected",
        value: formatCurrency(toNumber(overview.total_fees_collected)),
        helper: "SUM of paid amounts across all fee records.",
      },
      {
        label: "Pending Fees",
        value: formatCurrency(toNumber(overview.pending_fees)),
        helper: "Outstanding fee balance still pending collection.",
      },
    ],
    monthlyFees: ((monthlyResult.data ?? []) as AnalyticsMonthlyFeeRow[]).map((row) => ({
      label: formatMonthKey(row.month_start),
      value: toNumber(row.collected_amount),
    })),
    attendance: ((attendanceResult.data ?? []) as AnalyticsAttendanceRow[]).map((row) => ({
      label: row.status ?? "Unknown",
      value: toNumber(row.total_count),
      percentage: toNumber(row.percentage),
    })),
    performance: ((performanceResult.data ?? []) as AnalyticsPerformanceRow[]).map((row) => ({
      label: row.subject_name ?? "Unknown Subject",
      value: toNumber(row.average_marks),
    })),
  };
};

export const listAuditLogs = async (filters?: {
  userId?: string;
  module?: string;
  date?: string;
}): Promise<AuditLogRecord[]> => {
  const client = requireSupabase();
  const schoolId = requireCurrentSchoolId();
  let query = client
    .from("audit_logs")
    .select("id, school_id, user_id, action, module, record_id, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (filters?.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters?.module) {
    query = query.eq("module", filters.module);
  }
  if (filters?.date) {
    query = query.gte("created_at", `${filters.date}T00:00:00`).lte("created_at", `${filters.date}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as AuditLogRow[];
  const usersMap = await getUsersMap(
    rows.map((row) => row.user_id).filter((value): value is string => Boolean(value)),
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_id ? usersMap.get(row.user_id)?.name ?? "Unknown user" : "System",
    userEmail: row.user_id ? usersMap.get(row.user_id)?.email ?? null : null,
    userRole: row.user_id ? usersMap.get(row.user_id)?.role ?? null : null,
    action: row.action,
    module: row.module,
    recordId: row.record_id,
    createdAt: row.created_at,
  }));
};

export const syncUpcomingFeeReminders = async (
  userId: string | undefined,
  role: string | null,
) => {
  if (!userId || !role) return;

  const cutoffDate = addDaysToDateString(getIndiaTodayIso(), 3);
  const staffWorkspace =
    role === ROLES.STAFF ? normalizeStaffWorkspace((await getStaffByUserId(userId))?.role) : null;
  const canSyncAll = role === ROLES.ADMIN || (role === ROLES.STAFF && staffWorkspace === STAFF_WORKSPACES.ACCOUNTS);

  let dueFees = (await listFees()).filter(
    (fee) => fee.status !== "Paid" && Boolean(fee.dueDate) && (fee.dueDate ?? "") <= cutoffDate,
  );

  if (!canSyncAll) {
    if (role === ROLES.STUDENT) {
      const student = await getStudentByUserId(userId);
      dueFees = student ? dueFees.filter((fee) => fee.studentId === student.id) : [];
    } else if (role === ROLES.PARENT) {
      const children = await getChildrenByParentUserId(userId);
      const childIds = new Set(children.map((child) => child.id));
      dueFees = dueFees.filter((fee) => childIds.has(fee.studentId));
    } else {
      return;
    }
  }

  if (dueFees.length === 0) {
    return;
  }

  const students = await listStudents();
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const notificationRows = dueFees.flatMap((fee) => {
    const student = studentMap.get(fee.studentId);
    if (!student) return [];

    const targets = canSyncAll
      ? [student.userId, student.parentUserId].filter((value): value is string => Boolean(value))
      : [userId];

    return targets
      .filter((targetUserId) => canSyncAll || targetUserId === userId)
      .map((targetUserId) => ({
        type: "FEE_REMINDER",
        module: "FEES",
        message: `${student.name}'s fee is due on ${fee.dueDate}. Remaining balance: ${formatCurrency(fee.remainingAmount)}.`,
        user_id: targetUserId,
        related_fee_id: fee.id,
        is_read: false,
        dedupe_key: `FEE_REMINDER:${fee.id}:${targetUserId}`,
      }));
  });

  if (notificationRows.length === 0) {
    return;
  }

  const client = requireSupabase();
  const { error } = await client
    .from("notifications")
    .upsert(notificationRows, { onConflict: "dedupe_key", ignoreDuplicates: true });

  if (error) throw new Error(error.message);
};

export const listNotificationsForUser = async (
  userId: string | undefined,
  role: string | null,
): Promise<NotificationRecord[]> => {
  if (!userId || !role) return [];

  const client = requireSupabase();
  const filters = [`user_id.eq.${userId}`];

  if (role === ROLES.STAFF) {
    const staff = await getStaffByUserId(userId);
    if (staff) {
      filters.push(`receiver_id.eq.${staff.id}`);
    }
  }

  const query = client
    .from("notifications")
    .select("id, type, module, message, user_id, receiver_id, related_leave_id, related_fee_id, is_read, created_at")
    .or(filters.join(","))
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    type: row.type ?? "NOTICE",
    module: row.module ?? null,
    message: row.message ?? "",
    userId: row.user_id ?? null,
    receiverId: row.receiver_id,
    relatedLeaveId: row.related_leave_id,
    relatedFeeId: row.related_fee_id ?? null,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  }));
};

export const getUnreadNotificationCount = async (
  userId: string | undefined,
  role: string | null,
) => {
  const items = await listNotificationsForUser(userId, role);
  return items.filter((item) => !item.isRead).length;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("notifications").update({ is_read: true }).eq("id", notificationId);
  if (error) throw new Error(error.message);
};

export const listTimetableImpacts = async (filters?: {
  leaveId?: string;
  className?: string;
  section?: string;
  teacherId?: string;
  replacementTeacherId?: string;
  dates?: string[];
  statuses?: Array<TimetableImpactRecord["status"]>;
}): Promise<TimetableImpactRecord[]> => {
  const client = requireSupabase();
  let query = client
    .from("timetable_adjustments")
    .select(
      "id, leave_id, timetable_id, impact_date, status, replacement_teacher_id, replacement_subject_id, replacement_start_time, replacement_end_time, note, resolved_by, resolved_at",
    )
    .order("impact_date")
    .order("created_at");

  if (filters?.leaveId) {
    query = query.eq("leave_id", filters.leaveId);
  }
  if (filters?.dates && filters.dates.length > 0) {
    query = query.in("impact_date", filters.dates);
  }
  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let impacts = await mapTimetableImpacts((data ?? []) as TimetableAdjustmentRow[]);

  if (filters?.className) {
    impacts = impacts.filter((item) => item.className === filters.className);
  }
  if (filters?.section) {
    impacts = impacts.filter((item) => item.section === filters.section);
  }
  if (filters?.teacherId) {
    impacts = impacts.filter((item) => item.teacherId === filters.teacherId);
  }
  if (filters?.replacementTeacherId) {
    impacts = impacts.filter((item) => item.replacementTeacherId === filters.replacementTeacherId);
  }

  return impacts;
};

export const listTimetableImpactsByLeaveId = async (leaveId: string) => listTimetableImpacts({ leaveId });

export const getLeaveImpactDetail = async (leaveId: string): Promise<LeaveImpactDetail> => {
  const leave = await getLeaveDetail(leaveId);
  const staff = leave.staffId ? await getStaffDetail(leave.staffId).catch(() => null) : null;
  const impacts = await listTimetableImpactsByLeaveId(leaveId);

  return {
    leave,
    staff,
    impacts,
  };
};

export const listSalary = async (): Promise<SalaryRecord[]> => {
  const client = requireSupabase();
  const modernQuery = await client
    .from("salary")
    .select("id, staff_id, amount, month, status")
    .order("month", { ascending: false });
  let rows: SalaryRow[] = [];
  if (!modernQuery.error) {
    rows = (modernQuery.data ?? []) as SalaryRow[];
  } else if (isMissingColumnError(modernQuery.error.message, "salary.staff_id")) {
    const legacyQuery = await client
      .from("salary")
      .select("id, employee_id, amount, month, status")
      .order("month", { ascending: false });
    if (legacyQuery.error) throw new Error(legacyQuery.error.message);
    rows = (legacyQuery.data ?? []) as SalaryRow[];
  } else {
    throw new Error(modernQuery.error.message);
  }
  const employeesMap = new Map((await listEmployees()).map((employee) => [employee.id, employee]));
  return rows.map((row) => ({
    id: row.id,
    staffId: row.staff_id ?? row.employee_id ?? null,
    employeeName:
      row.staff_id || row.employee_id
        ? employeesMap.get(row.staff_id ?? row.employee_id ?? "")?.name ?? "Unknown employee"
        : "Unknown employee",
    role: row.staff_id || row.employee_id ? employeesMap.get(row.staff_id ?? row.employee_id ?? "")?.role ?? null : null,
    amount: Number(row.amount),
    month: row.month,
    status: row.status,
  }));
};

export const getSalaryDetail = async (salaryId: string) => {
  const salary = await listSalary();
  const record = salary.find((item) => item.id === salaryId);
  if (!record) throw new Error("Salary record not found.");
  return record;
};

export const createSalary = async (values: SalaryFormValues) => {
  const client = requireSupabase();
  const modernInsert = await client
    .from("salary")
    .insert({
      staff_id: values.staffId,
      amount: Number(values.amount),
      month: values.month,
      status: "Unpaid",
    })
    .select("id")
    .single();
  if (!modernInsert.error && modernInsert.data) {
    const salary = await getSalaryDetail(modernInsert.data.id);
    await logAuditEvent("CREATE", "SALARY", salary.id);
    return salary;
  }
  if (modernInsert.error && isMissingColumnError(modernInsert.error.message, "salary.staff_id")) {
    const legacyInsert = await client
      .from("salary")
      .insert({
        employee_id: values.staffId,
        amount: Number(values.amount),
        month: values.month,
        status: "Unpaid",
      })
      .select("id")
      .single();
    if (legacyInsert.error || !legacyInsert.data) throw new Error(legacyInsert.error?.message ?? "Unable to create salary record.");
    const salary = await getSalaryDetail(legacyInsert.data.id);
    await logAuditEvent("CREATE", "SALARY", salary.id);
    return salary;
  }
  throw new Error(modernInsert.error?.message ?? "Unable to create salary record.");
};

export const updateSalary = async (salaryId: string, values: SalaryFormValues) => {
  const client = requireSupabase();
  const existing = await getSalaryDetail(salaryId);
  const modernUpdate = await client
    .from("salary")
    .update({
      staff_id: values.staffId,
      amount: Number(values.amount),
      month: values.month,
      status: existing.status,
    })
    .eq("id", salaryId);
  if (modernUpdate.error && isMissingColumnError(modernUpdate.error.message, "salary.staff_id")) {
    const legacyUpdate = await client
      .from("salary")
      .update({
        employee_id: values.staffId,
        amount: Number(values.amount),
        month: values.month,
        status: existing.status,
      })
      .eq("id", salaryId);
    if (legacyUpdate.error) throw new Error(legacyUpdate.error.message);
    const salary = await getSalaryDetail(salaryId);
    await logAuditEvent("UPDATE", "SALARY", salary.id);
    return salary;
  }
  if (modernUpdate.error) throw new Error(modernUpdate.error.message);
  const salary = await getSalaryDetail(salaryId);
  await logAuditEvent("UPDATE", "SALARY", salary.id);
  return salary;
};


export const paySalary = async (salaryId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("salary").update({ status: "Paid" }).eq("id", salaryId);
  if (error) throw new Error(error.message);
  const salary = await getSalaryDetail(salaryId);
  await logAuditEvent("UPDATE", "SALARY", salary.id);
  return salary;
};

export const deleteSalary = async (salaryId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("salary").delete().eq("id", salaryId);
  if (error) throw new Error(error.message);
  await logAuditEvent("DELETE", "SALARY", salaryId);
};

const mapVehicle = (row: VehicleRow): VehicleRecord => ({
  id: row.id,
  vehicleName: row.vehicle_number ?? row.vehicle_name ?? "",
  driverName: row.driver_name,
  driverPhone: row.driver_phone ?? null,
  capacity: row.capacity,
  status: row.status ?? "Active",
});

const fetchVehicleRows = async () => {
  const client = requireSupabase();
  const modern = await client
    .from("vehicles")
    .select("id, vehicle_number, vehicle_name, driver_name, driver_phone, capacity, status")
    .order("vehicle_number");

  if (!modern.error) {
    return (modern.data ?? []) as VehicleRow[];
  }

  const fallback = await client
    .from("vehicles")
    .select("id, vehicle_number, vehicle_name, driver_name, capacity")
    .order("vehicle_number");
  if (fallback.error) throw new Error(fallback.error.message);
  return ((fallback.data ?? []) as VehicleRow[]).map((row) => ({
    ...row,
    driver_phone: null,
    status: "Active",
  }));
};

export const listVehicles = async (): Promise<VehicleRecord[]> => {
  return (await fetchVehicleRows()).map(mapVehicle);
};

export const getVehicleDetail = async (vehicleId: string): Promise<VehicleDetail> => {
  const vehicle = (await listVehicles()).find((item) => item.id === vehicleId);
  if (!vehicle) throw new Error("Vehicle not found.");

  const assignedRoutes = (await listTransportRoutes()).filter((route) => route.vehicleId === vehicleId);
  return { vehicle, assignedRoutes };
};

export const createVehicle = async (values: VehicleFormValues) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("vehicles")
    .insert({
      vehicle_number: values.vehicleName,
      vehicle_name: values.vehicleName,
      driver_name: values.driverName,
      driver_phone: values.driverPhone || null,
      capacity: Number(values.capacity),
      status: values.status || "Active",
    })
    .select("id, vehicle_number, vehicle_name, driver_name, driver_phone, capacity, status")
    .single();
  if (!error && data) {
    const vehicle = mapVehicle(data as VehicleRow);
    await logAuditEvent("CREATE", "VEHICLE", vehicle.id);
    return vehicle;
  }
  const fallback = await client
    .from("vehicles")
    .insert({
      vehicle_name: values.vehicleName,
      driver_name: values.driverName,
      capacity: Number(values.capacity),
    })
    .select("id, vehicle_name, driver_name, capacity")
    .single();
  if (fallback.error || !fallback.data) throw new Error(fallback.error?.message ?? error?.message ?? "Unable to create vehicle.");
  const vehicle = mapVehicle({ ...(fallback.data as VehicleRow), driver_phone: values.driverPhone || null, status: values.status || "Active" });
  await logAuditEvent("CREATE", "VEHICLE", vehicle.id);
  return vehicle;
};

export const updateVehicle = async (vehicleId: string, values: VehicleFormValues) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("vehicles")
    .update({
      vehicle_number: values.vehicleName,
      vehicle_name: values.vehicleName,
      driver_name: values.driverName,
      driver_phone: values.driverPhone || null,
      capacity: Number(values.capacity),
      status: values.status || "Active",
    })
    .eq("id", vehicleId)
    .select("id, vehicle_number, vehicle_name, driver_name, driver_phone, capacity, status")
    .single();
  if (!error && data) {
    const vehicle = mapVehicle(data as VehicleRow);
    await logAuditEvent("UPDATE", "VEHICLE", vehicle.id);
    return vehicle;
  }
  const fallback = await client
    .from("vehicles")
    .update({
      vehicle_name: values.vehicleName,
      driver_name: values.driverName,
      capacity: Number(values.capacity),
    })
    .eq("id", vehicleId)
    .select("id, vehicle_name, driver_name, capacity")
    .single();
  if (fallback.error || !fallback.data) throw new Error(fallback.error?.message ?? error?.message ?? "Unable to update vehicle.");
  const vehicle = mapVehicle({ ...(fallback.data as VehicleRow), driver_phone: values.driverPhone || null, status: values.status || "Active" });
  await logAuditEvent("UPDATE", "VEHICLE", vehicle.id);
  return vehicle;
};

export const deleteVehicle = async (vehicleId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("vehicles").delete().eq("id", vehicleId);
  if (error) throw new Error(error.message);
  await logAuditEvent("DELETE", "VEHICLE", vehicleId);
};

export const listTransportRoutes = async (): Promise<RouteRecord[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("routes")
    .select("id, route_name, stops, vehicle_id")
    .order("route_name");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as RouteRow[];
  const vehiclesMap = new Map((await listVehicles()).map((vehicle) => [vehicle.id, vehicle]));
  return rows.map((row) => ({
    id: row.id,
    routeName: row.route_name,
    stops: row.stops,
    stopsList: row.stops
      .split(",")
      .map((stop) => stop.trim())
      .filter(Boolean),
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_id ? vehiclesMap.get(row.vehicle_id)?.vehicleName ?? null : null,
    vehicleStatus: row.vehicle_id ? vehiclesMap.get(row.vehicle_id)?.status ?? null : null,
    driverName: row.vehicle_id ? vehiclesMap.get(row.vehicle_id)?.driverName ?? null : null,
    driverPhone: row.vehicle_id ? vehiclesMap.get(row.vehicle_id)?.driverPhone ?? null : null,
  }));
};

export const getRouteDetail = async (routeId: string): Promise<RouteDetail> => {
  const routes = await listTransportRoutes();
  const route = routes.find((item) => item.id === routeId);
  if (!route) throw new Error("Route not found.");
  const vehicle = route.vehicleId ? (await listVehicles()).find((item) => item.id === route.vehicleId) ?? null : null;
  return { route, vehicle };
};

export const createRoute = async (values: RouteFormValues) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("routes")
    .insert({
      route_name: values.routeName,
      stops: values.stops,
      vehicle_id: values.vehicleId || null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Unable to create route.");
  const route = await getRouteDetail(data.id);
  await logAuditEvent("CREATE", "ROUTE", route.route.id);
  return route;
};

export const updateRoute = async (routeId: string, values: RouteFormValues) => {
  const client = requireSupabase();
  const { error } = await client
    .from("routes")
    .update({
      route_name: values.routeName,
      stops: values.stops,
      vehicle_id: values.vehicleId || null,
    })
    .eq("id", routeId);
  if (error) throw new Error(error.message);
  const route = await getRouteDetail(routeId);
  await logAuditEvent("UPDATE", "ROUTE", route.route.id);
  return route;
};

export const deleteRoute = async (routeId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("routes").delete().eq("id", routeId);
  if (error) throw new Error(error.message);
  await logAuditEvent("DELETE", "ROUTE", routeId);
};

const mapApplicant = (row: ApplicantRow): ApplicantRecord => ({
  id: row.id,
  name: row.student_name ?? row.name ?? "",
  email: row.email ?? "",
  className: row.class_applied ?? row.class ?? "",
  status: normalizeApplicantStatus(row.status),
  parentName: row.parent_name,
  parentEmail: row.parent_email,
  parentPhone: row.parent_phone,
  createdAt: row.created_at ?? null,
});

export const listApplicants = async (): Promise<ApplicantRecord[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("applicants")
    .select("id, name, student_name, email, class, class_applied, status, parent_name, parent_email, parent_phone, created_at")
    .order("created_at", { ascending: false });
  if (!error) return ((data ?? []) as ApplicantRow[]).map(mapApplicant);
  const fallback = await client
    .from("applicants")
    .select("id, name, email, class, status, parent_name, parent_email, parent_phone, created_at")
    .order("created_at", { ascending: false });
  if (fallback.error) throw new Error(fallback.error.message);
  return ((fallback.data ?? []) as ApplicantRow[]).map(mapApplicant);
};

export const getApplicantDetail = async (applicantId: string) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("applicants")
    .select("id, name, student_name, email, class, class_applied, status, parent_name, parent_email, parent_phone, created_at")
    .eq("id", applicantId)
    .single();
  if (!error && data) {
    const applicant = mapApplicant(data as ApplicantRow);
    await logAuditEvent("CREATE", "APPLICANT", applicant.id);
    return applicant;
  }
  const fallback = await client
    .from("applicants")
    .select("id, name, email, class, status, parent_name, parent_email, parent_phone, created_at")
    .eq("id", applicantId)
    .single();
  if (fallback.error || !fallback.data) throw new Error(fallback.error?.message ?? error?.message ?? "Applicant not found.");
  return mapApplicant(fallback.data as ApplicantRow);
};

export const createApplicant = async (values: ApplicantFormValues) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("applicants")
    .insert({
      name: values.name,
      student_name: values.name,
      email: values.email,
      class: values.className,
      class_applied: values.className,
      status: normalizeApplicantStatus(values.status),
      parent_name: values.parentName || null,
      parent_email: values.parentEmail || null,
      parent_phone: values.parentPhone || null,
    })
    .select("id, name, student_name, email, class, class_applied, status, parent_name, parent_email, parent_phone, created_at")
    .single();
  if (!error && data) return mapApplicant(data as ApplicantRow);
  const fallback = await client
    .from("applicants")
    .insert({
      name: values.name,
      email: values.email,
      class: values.className,
      status: normalizeApplicantStatus(values.status),
      parent_name: values.parentName || null,
      parent_email: values.parentEmail || null,
      parent_phone: values.parentPhone || null,
    })
    .select("id, name, email, class, status, parent_name, parent_email, parent_phone, created_at")
    .single();
  if (fallback.error || !fallback.data) throw new Error(fallback.error?.message ?? error?.message ?? "Unable to create applicant.");
  const applicant = mapApplicant(fallback.data as ApplicantRow);
  await logAuditEvent("CREATE", "APPLICANT", applicant.id);
  return applicant;
};

export const updateApplicant = async (applicantId: string, values: ApplicantFormValues) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("applicants")
    .update({
      name: values.name,
      student_name: values.name,
      email: values.email,
      class: values.className,
      class_applied: values.className,
      status: normalizeApplicantStatus(values.status),
      parent_name: values.parentName || null,
      parent_email: values.parentEmail || null,
      parent_phone: values.parentPhone || null,
    })
    .eq("id", applicantId)
    .select("id, name, student_name, email, class, class_applied, status, parent_name, parent_email, parent_phone, created_at")
    .single();
  if (!error && data) {
    const applicant = mapApplicant(data as ApplicantRow);
    await logAuditEvent("UPDATE", "APPLICANT", applicant.id);
    return applicant;
  }
  const fallback = await client
    .from("applicants")
    .update({
      name: values.name,
      email: values.email,
      class: values.className,
      status: normalizeApplicantStatus(values.status),
      parent_name: values.parentName || null,
      parent_email: values.parentEmail || null,
      parent_phone: values.parentPhone || null,
    })
    .eq("id", applicantId)
    .select("id, name, email, class, status, parent_name, parent_email, parent_phone, created_at")
    .single();
  if (fallback.error || !fallback.data) throw new Error(fallback.error?.message ?? error?.message ?? "Unable to update applicant.");
  const applicant = mapApplicant(fallback.data as ApplicantRow);
  await logAuditEvent("UPDATE", "APPLICANT", applicant.id);
  return applicant;
};

export const deleteApplicant = async (applicantId: string) => {
  const client = requireSupabase();
  const { error } = await client.from("applicants").delete().eq("id", applicantId);
  if (error) throw new Error(error.message);
  await logAuditEvent("DELETE", "APPLICANT", applicantId);
};

export const approveApplicant = async (values: ApplicantApprovalValues) => {
  const student = await invokeAdminAction<StudentRecord>("approve_applicant", values);
  await logAuditEvent("UPDATE", "APPLICANT", values.applicantId);
  await logAuditEvent("CREATE", "STUDENT", student.id);
  return student;
};

export const rejectApplicant = async (applicantId: string) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("applicants")
    .update({ status: "Rejected" })
    .eq("id", applicantId)
    .select("id, name, student_name, email, class, class_applied, status, parent_name, parent_email, parent_phone, created_at")
    .single();
  if (!error && data) {
    const applicant = mapApplicant(data as ApplicantRow);
    await logAuditEvent("UPDATE", "APPLICANT", applicant.id);
    return applicant;
  }
  const fallback = await client
    .from("applicants")
    .update({ status: "Rejected" })
    .eq("id", applicantId)
    .select("id, name, email, class, status, parent_name, parent_email, parent_phone, created_at")
    .single();
  if (fallback.error || !fallback.data) throw new Error(fallback.error?.message ?? error?.message ?? "Unable to reject applicant.");
  const applicant = mapApplicant(fallback.data as ApplicantRow);
  await logAuditEvent("UPDATE", "APPLICANT", applicant.id);
  return applicant;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const deriveFeeStatus = (totalAmount: number, paidAmount: number) => {
  if (paidAmount <= 0) return "Unpaid";
  if (paidAmount >= totalAmount) return "Paid";
  return "Partial";
};

const formatActivityTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const client = requireSupabase();
  const examActivityPromise = listExamActivityRows();

  const [
    studentsCountResult,
    staffCountResult,
    feeRowsResult,
    studentsClassRowsResult,
    timetableClassRowsResult,
    studentActivityResult,
    applicantActivityResult,
    examActivityRows,
    employeeActivityResult,
  ] = await Promise.all([
    client.from("students").select("id", { count: "exact", head: true }),
    client.from("staff").select("id", { count: "exact", head: true }),
    client.from("fees").select("total_amount, paid_amount, status"),
    client.from("students").select("class, section"),
    client.from("timetable").select("class, section"),
    client.from("students").select("name, created_at").order("created_at", { ascending: false }).limit(3),
    client.from("applicants").select("name, status, created_at").order("created_at", { ascending: false }).limit(3),
    examActivityPromise,
    client.from("employees").select("name, role, created_at").order("created_at", { ascending: false }).limit(3),
  ]);

  if (studentsCountResult.error) throw new Error(studentsCountResult.error.message);
  if (staffCountResult.error) throw new Error(staffCountResult.error.message);
  if (feeRowsResult.error) throw new Error(feeRowsResult.error.message);
  if (studentsClassRowsResult.error) throw new Error(studentsClassRowsResult.error.message);
  if (timetableClassRowsResult.error) throw new Error(timetableClassRowsResult.error.message);
  if (studentActivityResult.error) throw new Error(studentActivityResult.error.message);
  if (applicantActivityResult.error) throw new Error(applicantActivityResult.error.message);
  if (employeeActivityResult.error) throw new Error(employeeActivityResult.error.message);

  const classSet = new Set<string>();
  (studentsClassRowsResult.data ?? []).forEach((row) => {
    if (row.class && row.section) classSet.add(`${row.class}__${row.section}`);
  });
  (timetableClassRowsResult.data ?? []).forEach((row) => {
    if (row.class && row.section) classSet.add(`${row.class}__${row.section}`);
  });

  const feesCollected = (feeRowsResult.data ?? []).reduce((sum, row) => {
    return sum + Number(row.paid_amount ?? (String(row.status ?? "").toLowerCase() === "paid" ? row.total_amount ?? 0 : 0));
  }, 0);

  const stats: DashboardMetric[] = [
    {
      label: "Total Students",
      value: String(studentsCountResult.count ?? 0),
      detail: "Across all active classes",
      path: "/dashboard/students",
    },
    {
      label: "Total Teachers",
      value: String(staffCountResult.count ?? 0),
      detail: "Teaching faculty and coordinators",
      path: "/dashboard/staff",
    },
    {
      label: "Total Classes",
      value: String(classSet.size),
      detail: "Mapped across sections and streams",
      path: "/dashboard/timetable",
    },
    {
      label: "Fees Collected",
      value: formatCurrency(feesCollected),
      detail: "Captured from paid fee records",
      path: "/dashboard/fees",
    },
  ];

  const activityRows = [
    ...(studentActivityResult.data ?? []).map((row) => ({
      module: "Students",
      owner: row.name ?? "Student",
      status: "Added",
      timestamp: row.created_at,
    })),
    ...(applicantActivityResult.data ?? []).map((row) => ({
      module: "Admissions",
      owner: row.name ?? "Applicant",
      status: row.status ?? "Pending",
      timestamp: row.created_at,
    })),
    ...examActivityRows.map((row) => ({
      module: "Exams",
      owner: `${row.name ?? "Exam"}${row.class ? ` (${row.class}${row.section ? ` / ${row.section}` : ""})` : ""}`,
      status: "Scheduled",
      timestamp: row.created_at ?? row.date,
    })),
    ...(employeeActivityResult.data ?? []).map((row) => ({
      module: "HR",
      owner: row.name ?? "Employee",
      status: row.role ?? "Updated",
      timestamp: row.created_at,
    })),
  ];

  const recentActivity: DashboardActivity[] = activityRows
    .sort((a, b) => {
      const left = Date.parse(a.timestamp ?? "");
      const right = Date.parse(b.timestamp ?? "");
      if (Number.isNaN(left) || Number.isNaN(right)) return 0;
      return right - left;
    })
    .slice(0, 6)
    .map((item) => ({
      module: item.module,
      owner: item.owner,
      status: item.status,
      time: formatActivityTime(item.timestamp),
    }));

  return { stats, recentActivity };
};

export const getSelectableSubjects = listSubjects;

export const staffRoleOptions = [
  "Teacher",
  "HR",
  "Accounts",
  "Transport",
  "Admission",
  "Non-Teaching Staff",
];

export const canManageAdminModules = (role: string | null) => role === ROLES.ADMIN;
export const TIMETABLE_PERMISSION_DENIED_MESSAGE = "You don't have permission to edit this timetable";

const normalizeTime = (value: string) => value.slice(0, 5);

const dayFromDate = (value: string) => {
  return getWeekdayFromDateString(value) as TimetableDay;
};

const validateTimetableForm = (values: TimetableFormValues) => {
  const durationMinutes = timetableTimeToMinutes(values.endTime) - timetableTimeToMinutes(values.startTime);

  if (
    !values.className ||
    !values.section ||
    !values.day ||
    !values.startTime ||
    !values.endTime
  ) {
    throw new Error("All timetable fields are required.");
  }

  if (values.startTime >= values.endTime) {
    throw new Error("End time must be later than start time.");
  }

  if (
    timetableTimeToMinutes(values.startTime) < timetableTimeToMinutes(TIMETABLE_SCHOOL_START) ||
    timetableTimeToMinutes(values.endTime) > timetableTimeToMinutes(TIMETABLE_SCHOOL_END)
  ) {
    throw new Error(`Timetable slots must stay within school timing ${TIMETABLE_SCHOOL_START} to ${TIMETABLE_SCHOOL_END}.`);
  }

  if (values.day === "Sun") {
    throw new Error("Sunday is reserved as a holiday.");
  }

  if (values.isBreak) {
    if (!values.breakType) {
      throw new Error("Break type is required.");
    }
    if (!values.breakLabel.trim()) {
      throw new Error("Break name is required.");
    }
    if (TIMETABLE_BREAK_DURATIONS[values.breakType] !== durationMinutes) {
      throw new Error(`${values.breakType} must be exactly ${TIMETABLE_BREAK_DURATIONS[values.breakType]} minutes.`);
    }
    return;
  }

  if (durationMinutes !== TIMETABLE_CLASS_DURATION_MINUTES) {
    throw new Error("Teaching class duration must be exactly 1 hour.");
  }

  if (!values.subjectId || !values.teacherId) {
    throw new Error("Subject and teacher are required for a teaching slot.");
  }
};

const mapTimetableSlots = async (rows: TimetableRow[]): Promise<TimetableSlotRecord[]> => {
  const subjectsMap = await getSubjectsMap(rows.flatMap((item) => (item.subject_id ? [item.subject_id] : [])));
  const teacherRows = await listStaff();
  const teachersMap = new Map(teacherRows.map((item) => [item.id, item]));

  return rows.map((item) => ({
    id: item.id,
    className: item.class,
    section: item.section,
    subjectId: item.subject_id,
    subjectName: item.is_break ? item.break_label ?? "Break" : subjectsMap.get(item.subject_id ?? "")?.name ?? "Unknown subject",
    teacherId: item.teacher_id,
    teacherName: item.is_break ? "Break" : teachersMap.get(item.teacher_id ?? "")?.name ?? "Unknown teacher",
    day: item.day as TimetableSlotRecord["day"],
    startTime: normalizeTime(item.start_time),
    endTime: normalizeTime(item.end_time),
    isBreak: Boolean(item.is_break),
    breakType: item.break_type ?? null,
    breakLabel: item.break_label ?? null,
    isCancelled: Boolean(item.is_cancelled),
    cancellationReason: item.cancellation_reason ?? null,
    effectiveDate: null,
    sourceSlotId: null,
    impactLeaveId: null,
    impactStatus: null,
    replacementTeacherId: null,
    replacementTeacherName: null,
    replacementSubjectId: null,
    replacementSubjectName: null,
  }));
};

const TIMETABLE_BREAK_DAYS: TimetableDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMETABLE_SCHOOL_START = "08:00";
const TIMETABLE_SCHOOL_END = "16:30";
const TIMETABLE_CLASS_DURATION_MINUTES = 60;
const TIMETABLE_BREAK_DURATIONS: Record<"Short Break" | "Lunch Break", number> = {
  "Short Break": 30,
  "Lunch Break": 60,
};

const timetableTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const timetableMinutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const getTimetableDurationMinutes = (startTime: string, endTime: string) =>
  timetableTimeToMinutes(endTime) - timetableTimeToMinutes(startTime);

const getTimetableRowById = async (slotId: string): Promise<TimetableRow> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("timetable")
    .select("id, class, section, subject_id, teacher_id, day, start_time, end_time, is_break, break_type, break_label, is_cancelled, cancellation_reason")
    .eq("id", slotId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Timetable slot not found.");
  }

  return data as TimetableRow;
};

const isMatchingBreakGroup = (
  row: TimetableRow,
  breakGroup: { startTime: string; endTime: string; breakType: "Short Break" | "Lunch Break" | null; breakLabel: string | null },
) =>
  Boolean(row.is_break) &&
  normalizeTime(row.start_time) === breakGroup.startTime &&
  normalizeTime(row.end_time) === breakGroup.endTime &&
  (row.break_type ?? null) === (breakGroup.breakType ?? null) &&
  (row.break_label ?? "") === (breakGroup.breakLabel ?? "");

const shiftRowsForClassDay = async (
  rows: TimetableRow[],
  thresholdTime: string,
  deltaMinutes: number,
) => {
  if (deltaMinutes === 0) return;

  const client = requireSupabase();
  const rowsToShift = rows
    .filter((row) => normalizeTime(row.start_time) >= thresholdTime)
    .sort((a, b) =>
      deltaMinutes > 0
        ? normalizeTime(b.start_time).localeCompare(normalizeTime(a.start_time))
        : normalizeTime(a.start_time).localeCompare(normalizeTime(b.start_time)),
    );

  for (const row of rowsToShift) {
    const nextStart = timetableMinutesToTime(timetableTimeToMinutes(normalizeTime(row.start_time)) + deltaMinutes);
    const nextEnd = timetableMinutesToTime(timetableTimeToMinutes(normalizeTime(row.end_time)) + deltaMinutes);
    const updateResult = await client
      .from("timetable")
      .update({
        start_time: nextStart,
        end_time: nextEnd,
      })
      .eq("id", row.id);

    if (updateResult.error) throw new Error(updateResult.error.message);
  }
};

const syncSchoolWideBreakForClassDay = async (
  className: string,
  section: string,
  day: TimetableDay,
  values: TimetableFormValues,
  previousBreakGroup?: { startTime: string; endTime: string; breakType: "Short Break" | "Lunch Break" | null; breakLabel: string | null },
) => {
  const client = requireSupabase();
  let rows = await getClassDayTimetableRows(className, section, day);

  if (previousBreakGroup) {
    const previousRows = rows.filter((row) => isMatchingBreakGroup(row, previousBreakGroup));
    if (previousRows.length > 0) {
      for (const row of previousRows) {
        const deleteResult = await client.from("timetable").delete().eq("id", row.id);
        if (deleteResult.error) throw new Error(deleteResult.error.message);
      }

      await shiftRowsForClassDay(
        rows.filter((row) => !isMatchingBreakGroup(row, previousBreakGroup)),
        previousBreakGroup.endTime,
        -getTimetableDurationMinutes(previousBreakGroup.startTime, previousBreakGroup.endTime),
      );

      rows = await getClassDayTimetableRows(className, section, day);
    }
  }

  const existingSameBreak = rows.find(
    (row) =>
      Boolean(row.is_break) &&
      (row.break_type ?? null) === values.breakType &&
      normalizeTime(row.start_time) === values.startTime &&
      normalizeTime(row.end_time) === values.endTime,
  );

  if (existingSameBreak) {
    const updateResult = await client
      .from("timetable")
      .update({ break_type: values.breakType, break_label: values.breakLabel.trim() })
      .eq("id", existingSameBreak.id);

    if (updateResult.error) throw new Error(updateResult.error.message);
    return;
  }

  const crossesBreakStart = rows.some(
    (row) =>
      !row.is_break &&
      normalizeTime(row.start_time) < values.startTime &&
      normalizeTime(row.end_time) > values.startTime,
  );

  if (crossesBreakStart) {
    throw new Error(
      `Break conflict: ${className} ${section} on ${day} already has a class running across ${values.startTime}. Move that class first or start the break at the class boundary.`,
    );
  }

  await shiftRowsForClassDay(rows, values.startTime, getTimetableDurationMinutes(values.startTime, values.endTime));

  const insertResult = await client.from("timetable").insert({
    class: className,
    section,
    subject_id: null,
    teacher_id: null,
    day,
    start_time: values.startTime,
    end_time: values.endTime,
    is_break: true,
    break_type: values.breakType,
    break_label: values.breakLabel.trim(),
  });

  if (insertResult.error) throw new Error(insertResult.error.message);
};

const removeBreakGroupForClassDay = async (
  className: string,
  section: string,
  day: TimetableDay,
  breakGroup: { startTime: string; endTime: string; breakType: "Short Break" | "Lunch Break" | null; breakLabel: string | null },
) => {
  const client = requireSupabase();
  const rows = await getClassDayTimetableRows(className, section, day);
  const breakRows = rows.filter((row) => isMatchingBreakGroup(row, breakGroup));

  if (breakRows.length === 0) return;

  for (const row of breakRows) {
    const deleteResult = await client.from("timetable").delete().eq("id", row.id);
    if (deleteResult.error) throw new Error(deleteResult.error.message);
  }

  await shiftRowsForClassDay(
    rows.filter((row) => !isMatchingBreakGroup(row, breakGroup)),
    breakGroup.endTime,
    -getTimetableDurationMinutes(breakGroup.startTime, breakGroup.endTime),
  );
};

const syncWeeklyBreakForClassSection = async (
  values: TimetableFormValues,
  previousBreakGroup?: { startTime: string; endTime: string; breakType: "Short Break" | "Lunch Break" | null; breakLabel: string | null },
  previousClassSection?: { className: string; section: string },
) => {
  if (previousBreakGroup && previousClassSection) {
    const classChanged =
      previousClassSection.className !== values.className || previousClassSection.section !== values.section;

    if (classChanged) {
      for (const day of TIMETABLE_BREAK_DAYS) {
        await removeBreakGroupForClassDay(previousClassSection.className, previousClassSection.section, day, previousBreakGroup);
      }
    }
  }

  for (const day of TIMETABLE_BREAK_DAYS) {
    await syncSchoolWideBreakForClassDay(
      values.className,
      values.section,
      day,
      values,
      previousClassSection &&
        previousBreakGroup &&
        previousClassSection.className === values.className &&
        previousClassSection.section === values.section
        ? previousBreakGroup
        : undefined,
    );
  }
};

const syncSchoolWideBreak = async (
  values: TimetableFormValues,
  previousBreakGroup?: { startTime: string; endTime: string; breakType: "Short Break" | "Lunch Break" | null; breakLabel: string | null },
) => {
  const client = requireSupabase();
  const { data: existingBreakTypes, error: existingBreakTypesError } = await client
    .from("timetable")
    .select("break_type")
    .eq("is_break", true);

  if (existingBreakTypesError) throw new Error(existingBreakTypesError.message);

  const alreadyExists = ((existingBreakTypes ?? []) as Array<{ break_type: "Short Break" | "Lunch Break" | null }>)
    .some(
      (row) =>
        row.break_type === values.breakType &&
        (!previousBreakGroup || previousBreakGroup.breakType !== values.breakType),
    );

  if (alreadyExists) {
    throw new Error(`${values.breakType} already exists in the timetable. Edit the existing break instead of adding another one.`);
  }

  const classOptions = await listTimetableClassOptions();
  if (classOptions.length === 0) {
    throw new Error("Create classes and sections first, then add a school-wide break.");
  }

  for (const option of classOptions) {
    for (const section of option.sections) {
      for (const day of TIMETABLE_BREAK_DAYS) {
        await syncSchoolWideBreakForClassDay(option.className, section, day, values, previousBreakGroup);
      }
    }
  }
};

export const listTimetableClassOptions = async (): Promise<TimetableClassOption[]> => {
  const client = requireSupabase();
  const [classResult, studentResult, staffResult, timetableResult] = await Promise.all([
    client.from("classes").select("class_name, section"),
    client.from("students").select("class, section"),
    client.from("staff").select("assigned_class, assigned_section"),
    client.from("timetable").select("class, section"),
  ]);

  if (classResult.error) throw new Error(classResult.error.message);
  if (studentResult.error) throw new Error(studentResult.error.message);
  if (staffResult.error) throw new Error(staffResult.error.message);
  if (timetableResult.error) throw new Error(timetableResult.error.message);

  const classMap = new Map<string, Set<string>>();

  (classResult.data ?? []).forEach((item) => {
    const className = item.class_name?.trim();
    const section = item.section?.trim();
    if (!className || !section) return;
    classMap.set(className, (classMap.get(className) ?? new Set()).add(section));
  });

  (studentResult.data ?? []).forEach((item) => {
    const className = item.class?.trim();
    const section = item.section?.trim();
    if (!className || !section) return;
    classMap.set(className, (classMap.get(className) ?? new Set()).add(section));
  });

  (staffResult.data ?? []).forEach((item) => {
    const className = item.assigned_class?.trim();
    const section = item.assigned_section?.trim();
    if (!className || !section) return;
    classMap.set(className, (classMap.get(className) ?? new Set()).add(section));
  });

  (timetableResult.data ?? []).forEach((item) => {
    const className = item.class?.trim();
    const section = item.section?.trim();
    if (!className || !section) return;
    classMap.set(className, (classMap.get(className) ?? new Set()).add(section));
  });

  return Array.from(classMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([className, sections]) => ({
      className,
      sections: Array.from(sections).sort((a, b) => a.localeCompare(b)),
    }));
};

export const listTimetableTeachers = listStaff;

const emptyTimetableAccess = (): TimetableAccess => ({
  canEditAny: false,
  canEditSelectedClass: false,
  isClassCoordinator: false,
  assignedClass: null,
  assignedSection: null,
});

export const getTimetableAccess = async (
  userId: string | undefined,
  role: string | null,
  selectedClass: string,
  selectedSection: string,
): Promise<TimetableAccess> => {
  if (!userId || !role) {
    return emptyTimetableAccess();
  }

  if (role === ROLES.ADMIN) {
    return {
      canEditAny: true,
      canEditSelectedClass: true,
      isClassCoordinator: false,
      assignedClass: null,
      assignedSection: null,
    };
  }

  if (role !== ROLES.STAFF) {
    return emptyTimetableAccess();
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("staff")
    .select("is_class_coordinator, assigned_class, assigned_section")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return emptyTimetableAccess();
  }

  const isClassCoordinator = Boolean(data.is_class_coordinator);
  const assignedClass = data.assigned_class ?? null;
  const assignedSection = data.assigned_section ?? null;

  return {
    canEditAny: false,
    canEditSelectedClass:
      isClassCoordinator &&
      assignedClass === selectedClass &&
      assignedSection === selectedSection,
    isClassCoordinator,
    assignedClass,
    assignedSection,
  };
};

export const getCoordinatorAssignment = async (userId: string | undefined) => {
  if (!userId) return null;
  const staff = await getStaffByUserId(userId);
  if (!staff?.isClassCoordinator || !staff.assignedClass || !staff.assignedSection) {
    return null;
  }

  return {
    staffId: staff.id,
    assignedClass: staff.assignedClass,
    assignedSection: staff.assignedSection,
    subjectId: staff.subjectId,
  };
};

export const loadTimetable = async (
  className: string,
  section: string,
): Promise<TimetableSlotRecord[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("timetable")
    .select("id, class, section, subject_id, teacher_id, day, start_time, end_time, is_break, break_type, break_label, is_cancelled, cancellation_reason")
    .eq("class", className)
    .eq("section", section)
    .order("day")
    .order("start_time");

  if (error) throw new Error(error.message);

  return mapTimetableSlots((data ?? []) as TimetableRow[]);
};

export const listTimetableSlots = async (filters?: {
  className?: string;
  section?: string;
  teacherId?: string;
  day?: string;
  date?: string;
}): Promise<TimetableSlotRecord[]> => {
  if (filters?.date) {
    const holiday = await getHolidayByDate(filters.date);
    if (holiday) {
      return [];
    }
  }

  const client = requireSupabase();
  let query = client
    .from("timetable")
    .select("id, class, section, subject_id, teacher_id, day, start_time, end_time, is_break, break_type, break_label, is_cancelled, cancellation_reason")
    .order("day")
    .order("start_time");

  if (filters?.className) {
    query = query.eq("class", filters.className);
  }
  if (filters?.section) {
    query = query.eq("section", filters.section);
  }
  if (filters?.teacherId) {
    query = query.eq("teacher_id", filters.teacherId);
  }
  if (filters?.day) {
    query = query.eq("day", filters.day);
  } else if (filters?.date) {
    query = query.eq("day", dayFromDate(filters.date));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return mapTimetableSlots((data ?? []) as TimetableRow[]);
};

export const loadMyTeachingTimetable = async (userId: string): Promise<TimetableSlotRecord[]> => {
  const staff = await getStaffByUserId(userId);
  if (!staff) return [];
  return listTimetableSlots({ teacherId: staff.id });
};

const assertTimetableWriteAccess = async (
  userId: string | undefined,
  role: string | null,
  className: string,
  section: string,
) => {
  const access = await getTimetableAccess(userId, role, className, section);
  if (!access.canEditAny && !access.canEditSelectedClass) {
    throw new Error(TIMETABLE_PERMISSION_DENIED_MESSAGE);
  }
  return access;
};

const checkTimetableConflicts = async (
  values: TimetableFormValues,
  excludeId?: string,
) => {
  const client = requireSupabase();
  const teacherQuery = client
    .from("timetable")
    .select("id")
    .eq("teacher_id", values.teacherId)
    .eq("day", values.day)
    .lt("start_time", values.endTime)
    .gt("end_time", values.startTime);

  const classQuery = client
    .from("timetable")
    .select("id, is_break, break_type, break_label")
    .eq("class", values.className)
    .eq("section", values.section)
    .eq("day", values.day)
    .lt("start_time", values.endTime)
    .gt("end_time", values.startTime);

  const [teacherResult, classResult] = await Promise.all([
    values.isBreak ? Promise.resolve({ data: [], error: null }) : (excludeId ? teacherQuery.neq("id", excludeId) : teacherQuery),
    excludeId ? classQuery.neq("id", excludeId) : classQuery,
  ]);

  if (teacherResult.error) throw new Error(teacherResult.error.message);
  if (classResult.error) throw new Error(classResult.error.message);

  if ((teacherResult.data ?? []).length > 0) {
    throw new Error("Teacher conflict: this teacher is already assigned to another class at this time.");
  }

  const classConflicts = (classResult.data ?? []) as Array<{ id: string; is_break?: boolean | null; break_type?: string | null; break_label?: string | null }>;
  const breakConflict = classConflicts.find((row) => Boolean(row.is_break));

  if (breakConflict) {
    throw new Error(`Break conflict: this time is already reserved for ${breakConflict.break_type ?? breakConflict.break_label ?? "a school break"}.`);
  }

  if (classConflicts.length > 0) {
    throw new Error("Class conflict: this class already has another subject scheduled at this time.");
  }
};

const mapTimetableWriteError = (message: string) => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("class conflict")) {
    return "This timetable time is already occupied for this class. It may be another class period or a school-wide break.";
  }
  if (lowerMessage.includes("teacher conflict")) {
    return "This teacher is already assigned to another class at that time.";
  }
  return message;
};

const getClassDayTimetableRows = async (className: string, section: string, day: string): Promise<TimetableRow[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("timetable")
    .select("id, class, section, subject_id, teacher_id, day, start_time, end_time, is_break, break_type, break_label, is_cancelled, cancellation_reason")
    .eq("class", className)
    .eq("section", section)
    .eq("day", day)
    .order("start_time");

  if (error) throw new Error(error.message);
  return (data ?? []) as TimetableRow[];
};

const assertTimetableRowConflicts = async (
  candidate: {
    id: string;
    className: string;
    section: string;
    day: string;
    startTime: string;
    endTime: string;
    teacherId: string | null;
    isBreak: boolean;
  },
  excludedIds: string[],
) => {
  const client = requireSupabase();

  if (!candidate.isBreak && candidate.teacherId) {
    let teacherQuery = client
      .from("timetable")
      .select("id")
      .eq("teacher_id", candidate.teacherId)
      .eq("day", candidate.day)
      .lt("start_time", candidate.endTime)
      .gt("end_time", candidate.startTime);

    if (excludedIds.length > 0) {
      teacherQuery = teacherQuery.not("id", "in", `(${excludedIds.join(",")})`);
    }

    const teacherResult = await teacherQuery;
    if (teacherResult.error) throw new Error(teacherResult.error.message);
    if ((teacherResult.data ?? []).length > 0) {
      throw new Error("Teacher conflict: this teacher is already assigned to another class at this time.");
    }
  }

  let classQuery = client
    .from("timetable")
    .select("id")
    .eq("class", candidate.className)
    .eq("section", candidate.section)
    .eq("day", candidate.day)
    .lt("start_time", candidate.endTime)
    .gt("end_time", candidate.startTime);

  if (excludedIds.length > 0) {
    classQuery = classQuery.not("id", "in", `(${excludedIds.join(",")})`);
  }

  const classResult = await classQuery;
  if (classResult.error) throw new Error(classResult.error.message);
  if ((classResult.data ?? []).length > 0) {
    throw new Error("Class conflict: this class already has another subject scheduled at this time.");
  }
};

const shiftFollowingClassDaySlots = async (
  existingRow: TimetableRow,
  values: TimetableFormValues,
) => {
  const deltaMinutes = timetableTimeToMinutes(values.startTime) - timetableTimeToMinutes(normalizeTime(existingRow.start_time));
  if (deltaMinutes === 0) return;

  const sameDayRows = await getClassDayTimetableRows(existingRow.class, existingRow.section, existingRow.day);
  const followingRows = sameDayRows.filter(
    (row) => row.id !== existingRow.id && normalizeTime(row.start_time) >= normalizeTime(existingRow.end_time),
  );

  const excludedIds = [existingRow.id, ...followingRows.map((row) => row.id)];
  const shiftedRows = followingRows.map((row) => ({
    ...row,
    nextStartTime: timetableMinutesToTime(timetableTimeToMinutes(normalizeTime(row.start_time)) + deltaMinutes),
    nextEndTime: timetableMinutesToTime(timetableTimeToMinutes(normalizeTime(row.end_time)) + deltaMinutes),
  }));

  await assertTimetableRowConflicts(
    {
      id: existingRow.id,
      className: values.className,
      section: values.section,
      day: values.day,
      startTime: values.startTime,
      endTime: values.endTime,
      teacherId: values.isBreak ? null : values.teacherId,
      isBreak: values.isBreak,
    },
    excludedIds,
  );

  for (const row of shiftedRows) {
    await assertTimetableRowConflicts(
      {
        id: row.id,
        className: row.class,
        section: row.section,
        day: row.day,
        startTime: row.nextStartTime,
        endTime: row.nextEndTime,
        teacherId: row.teacher_id,
        isBreak: Boolean(row.is_break),
      },
      excludedIds,
    );
  }

  const client = requireSupabase();
  const orderedRows = [...shiftedRows].sort((a, b) =>
    deltaMinutes > 0
      ? b.nextStartTime.localeCompare(a.nextStartTime)
      : a.nextStartTime.localeCompare(b.nextStartTime),
  );

  for (const row of orderedRows) {
    const { error } = await client
      .from("timetable")
      .update({
        start_time: row.nextStartTime,
        end_time: row.nextEndTime,
      })
      .eq("id", row.id);

    if (error) throw new Error(error.message);
  }
};

export const getTimetableImpactById = async (impactId: string) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("timetable_adjustments")
    .select(
      "id, leave_id, timetable_id, impact_date, status, replacement_teacher_id, replacement_subject_id, replacement_start_time, replacement_end_time, note, resolved_by, resolved_at",
    )
    .eq("id", impactId)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Leave impact record not found.");
  const [impact] = await mapTimetableImpacts([data as TimetableAdjustmentRow]);
  if (!impact) throw new Error("Leave impact record not found.");
  return impact;
};

const checkTimetableImpactConflicts = async (
  impact: TimetableImpactRecord,
  values: {
    replacementTeacherId: string;
    replacementStartTime: string;
    replacementEndTime: string;
  },
) => {
  const client = requireSupabase();
  const impactDay = dayFromDate(impact.impactDate);

  const teacherQuery = client
    .from("timetable")
    .select("id")
    .eq("teacher_id", values.replacementTeacherId)
    .eq("day", impactDay)
    .lt("start_time", values.replacementEndTime)
    .gt("end_time", values.replacementStartTime)
    .neq("id", impact.timetableId);

  const classQuery = client
    .from("timetable")
    .select("id")
    .eq("class", impact.className)
    .eq("section", impact.section)
    .eq("day", impactDay)
    .lt("start_time", values.replacementEndTime)
    .gt("end_time", values.replacementStartTime)
    .neq("id", impact.timetableId);

  const [teacherResult, classResult, sameDateImpacts] = await Promise.all([
    teacherQuery,
    classQuery,
    listTimetableImpacts({ dates: [impact.impactDate] }),
  ]);

  if (teacherResult.error) throw new Error(teacherResult.error.message);
  if (classResult.error) throw new Error(classResult.error.message);

  const conflictingTeacherAdjustment = sameDateImpacts.find((item) => {
    if (item.id === impact.id || item.status !== "Rescheduled") return false;

    const candidateStart = item.replacementStartTime ?? item.startTime;
    const candidateEnd = item.replacementEndTime ?? item.endTime;
    const overlaps = candidateStart < values.replacementEndTime && candidateEnd > values.replacementStartTime;

    if (!overlaps) return false;

    return item.replacementTeacherId === values.replacementTeacherId || item.teacherId === values.replacementTeacherId;
  });

  const conflictingClassAdjustment = sameDateImpacts.find((item) => {
    if (item.id === impact.id || item.status !== "Rescheduled") return false;

    const candidateStart = item.replacementStartTime ?? item.startTime;
    const candidateEnd = item.replacementEndTime ?? item.endTime;
    const overlaps = candidateStart < values.replacementEndTime && candidateEnd > values.replacementStartTime;

    if (!overlaps) return false;

    return item.className === impact.className && item.section === impact.section;
  });

  if ((teacherResult.data ?? []).length > 0 || conflictingTeacherAdjustment) {
    throw new Error("Teacher conflict: the selected teacher already has another class during this time.");
  }

  if ((classResult.data ?? []).length > 0 || conflictingClassAdjustment) {
    throw new Error("Class conflict: this class already has another scheduled lesson during this time.");
  }
};

export const rescheduleTimetableImpact = async (
  impactId: string,
  values: {
    replacementTeacherId: string;
    replacementSubjectId?: string;
    replacementStartTime?: string;
    replacementEndTime?: string;
    note?: string;
  },
  context?: { userId?: string; role: string | null },
) => {
  const impact = await getTimetableImpactById(impactId);

  if (context) {
    await assertTimetableWriteAccess(context.userId, context.role, impact.className, impact.section);
  }

  if (!values.replacementTeacherId) {
    throw new Error("Select a replacement teacher to reschedule this class.");
  }

  const replacementStartTime = values.replacementStartTime ?? impact.startTime;
  const replacementEndTime = values.replacementEndTime ?? impact.endTime;
  if (replacementStartTime >= replacementEndTime) {
    throw new Error("Replacement start time must be earlier than the end time.");
  }

  await checkTimetableImpactConflicts(impact, {
    replacementTeacherId: values.replacementTeacherId,
    replacementStartTime,
    replacementEndTime,
  });

  const client = requireSupabase();
  const { error } = await client
    .from("timetable_adjustments")
    .update({
      status: "Rescheduled",
      replacement_teacher_id: values.replacementTeacherId,
      replacement_subject_id: values.replacementSubjectId || impact.subjectId,
      replacement_start_time: replacementStartTime,
      replacement_end_time: replacementEndTime,
      note: values.note?.trim() || null,
      resolved_by: context?.userId ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", impactId);

  if (error) throw new Error(error.message);
  return getTimetableImpactById(impactId);
};

export const cancelTimetableImpact = async (
  impactId: string,
  values: { note?: string },
  context?: { userId?: string; role: string | null },
) => {
  const impact = await getTimetableImpactById(impactId);

  if (context) {
    await assertTimetableWriteAccess(context.userId, context.role, impact.className, impact.section);
  }

  const client = requireSupabase();
  const { error } = await client
    .from("timetable_adjustments")
    .update({
      status: "Cancelled",
      note: values.note?.trim() || null,
      resolved_by: context?.userId ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", impactId);

  if (error) throw new Error(error.message);
  return getTimetableImpactById(impactId);
};

export const createTimetableSlot = async (
  values: TimetableFormValues,
  context?: { userId?: string; role: string | null },
) => {
  validateTimetableForm(values);
  if (context) {
    await assertTimetableWriteAccess(context.userId, context.role, values.className, values.section);
  }
  if (values.isBreak) {
    if (context?.role === ROLES.ADMIN) {
      await syncSchoolWideBreak(values);
    } else {
      await syncWeeklyBreakForClassSection(values);
    }
    await logAuditEvent("CREATE", "TIMETABLE", null);
    return null;
  }
  await checkTimetableConflicts(values);

  const client = requireSupabase();
  const { data, error } = await client
    .from("timetable")
    .insert({
      class: values.className,
      section: values.section,
      subject_id: values.isBreak ? null : values.subjectId,
      teacher_id: values.isBreak ? null : values.teacherId,
      day: values.day,
      start_time: values.startTime,
      end_time: values.endTime,
      is_break: values.isBreak,
      break_type: values.isBreak ? values.breakType : null,
      break_label: values.isBreak ? values.breakLabel.trim() : null,
    })
    .select("id, class, section, subject_id, teacher_id, day, start_time, end_time, is_break, break_type, break_label, is_cancelled, cancellation_reason")
    .single();

  if (error || !data) throw new Error(mapTimetableWriteError(error?.message ?? "Unable to save timetable slot."));
  const [slot] = await mapTimetableSlots([data as TimetableRow]);
  await logAuditEvent("CREATE", "TIMETABLE", slot.id);
  return slot;
};

export const updateTimetableSlot = async (
  slotId: string,
  values: TimetableFormValues,
  context?: { userId?: string; role: string | null },
) => {
  validateTimetableForm(values);
  const existingRow = await getTimetableRowById(slotId);
  if (context) {
    await assertTimetableWriteAccess(context.userId, context.role, values.className, values.section);
  }
  if (values.isBreak) {
    const previousBreakGroup = {
      startTime: normalizeTime(existingRow.start_time),
      endTime: normalizeTime(existingRow.end_time),
      breakType: existingRow.break_type ?? null,
      breakLabel: existingRow.break_label ?? "",
    };

    if (context?.role === ROLES.ADMIN) {
      await syncSchoolWideBreak(values, previousBreakGroup);
    } else {
      await syncWeeklyBreakForClassSection(values, previousBreakGroup, {
        className: existingRow.class,
        section: existingRow.section,
      });
    }
    await logAuditEvent("UPDATE", "TIMETABLE", slotId);
    return null;
  }
  const shouldShiftFollowingRows =
    !values.isBreak &&
    !Boolean(existingRow.is_break) &&
    existingRow.class === values.className &&
    existingRow.section === values.section &&
    existingRow.day === values.day;

  if (shouldShiftFollowingRows) {
    await shiftFollowingClassDaySlots(existingRow, values);
  } else {
    await checkTimetableConflicts(values, slotId);
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("timetable")
    .update({
      class: values.className,
      section: values.section,
      subject_id: values.isBreak ? null : values.subjectId,
      teacher_id: values.isBreak ? null : values.teacherId,
      day: values.day,
      start_time: values.startTime,
      end_time: values.endTime,
      is_break: values.isBreak,
      break_type: values.isBreak ? values.breakType : null,
      break_label: values.isBreak ? values.breakLabel.trim() : null,
    })
    .eq("id", slotId)
    .select("id, class, section, subject_id, teacher_id, day, start_time, end_time, is_break, break_type, break_label, is_cancelled, cancellation_reason")
    .single();

  if (error || !data) throw new Error(mapTimetableWriteError(error?.message ?? "Unable to update timetable slot."));
  const [slot] = await mapTimetableSlots([data as TimetableRow]);
  await logAuditEvent("UPDATE", "TIMETABLE", slot.id);
  return slot;
};

export const deleteTimetableSlot = async (
  slotId: string,
  context?: { userId?: string; role: string | null; className?: string; section?: string },
) => {
  const existingRow = await getTimetableRowById(slotId);
  if (context?.className && context?.section) {
    await assertTimetableWriteAccess(context.userId, context.role, context.className, context.section);
  }
  const client = requireSupabase();
  if (Boolean(existingRow.is_break)) {
    const breakGroup = {
      startTime: normalizeTime(existingRow.start_time),
      endTime: normalizeTime(existingRow.end_time),
      breakType: existingRow.break_type ?? null,
      breakLabel: existingRow.break_label ?? "",
    };

    if (context?.role === ROLES.ADMIN) {
      const classOptions = await listTimetableClassOptions();

      for (const option of classOptions) {
        for (const section of option.sections) {
          for (const day of TIMETABLE_BREAK_DAYS) {
            await removeBreakGroupForClassDay(option.className, section, day, breakGroup);
          }
        }
      }
    } else {
      for (const day of TIMETABLE_BREAK_DAYS) {
        await removeBreakGroupForClassDay(existingRow.class, existingRow.section, day, breakGroup);
      }
    }
    await logAuditEvent("DELETE", "TIMETABLE", slotId);
    return;
  }
  const { error } = await client.from("timetable").delete().eq("id", slotId);
  if (error) throw new Error(error.message);
  await logAuditEvent("DELETE", "TIMETABLE", slotId);
};
