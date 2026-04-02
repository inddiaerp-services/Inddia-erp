import { supabase } from "./supabaseClient";
import { authStore } from "../store/authStore";
import type {
  BillingCreateValues,
  BillingDocumentRecord,
  BillingRow,
  BillingUpdateValues,
  PaymentRecord,
  PaymentUpdateValues,
  PlanChangeRequestCreateValues,
  PlanChangeRequestRecord,
  PlanChangeRequestReviewValues,
  RenewalReminderRecord,
  SchoolBillingProfileRecord,
  SchoolBillingProfileUpdateValues,
  SchoolCreateValues,
  SchoolPaymentRequestCreateValues,
  SchoolPaymentRequestRecord,
  SchoolPaymentRequestReviewValues,
  SchoolProfileRecord,
  SchoolRecord,
  SchoolStorageRecord,
  SchoolSubscriptionOverview,
  SchoolUpdateValues,
  SchoolUsageRecord,
  SubscriptionRecord,
  SuperAdminAuditLogRecord,
  SuperAdminMetrics,
} from "../types/saas";

type SchoolRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  attendance_map_link: string | null;
  attendance_geo_latitude: number | null;
  attendance_geo_longitude: number | null;
  attendance_geo_radius_meters: number | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_contact_phone: string | null;
  billing_address: string | null;
  finance_email: string | null;
  tax_id: string | null;
  authorized_signatory: string | null;
  logo_url: string | null;
  theme_color: string | null;
  subscription_status: "Active" | "Expired" | "Trial" | "Suspended";
  subscription_plan: string | null;
  storage_limit: number | null;
  student_limit: number | null;
  staff_limit: number | null;
  renewal_notice_days: number | null;
  expiry_date: string | null;
  created_at: string | null;
};

type SubscriptionRow = {
  id: string;
  school_id: string;
  plan_name: string | null;
  amount: number | string | null;
  duration_months: number | null;
  start_date: string | null;
  end_date: string | null;
  status: "Active" | "Expired";
  created_at: string | null;
};

type PaymentRow = {
  id: string;
  school_id: string;
  amount: number | string | null;
  payment_method: string | null;
  payment_date: string | null;
  status: "Success" | "Failed";
  created_at: string | null;
};

type PaymentRequestRow = {
  id: string;
  school_id: string;
  requested_plan: string;
  requested_amount: number | string | null;
  duration_months: number;
  payment_method: string | null;
  payment_date: string | null;
  transaction_reference: string | null;
  proof_url: string | null;
  note: string | null;
  status: "Pending" | "Approved" | "Rejected";
  created_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verified_note: string | null;
  payment_id: string | null;
  subscription_id: string | null;
  created_at: string | null;
};

type BillingDocumentRow = {
  id: string;
  school_id: string;
  payment_request_id: string | null;
  payment_id: string | null;
  subscription_id: string | null;
  document_number: string;
  document_type: "Invoice" | "Receipt";
  title: string | null;
  amount: number | string | null;
  status: "Issued" | "Void";
  issue_date: string | null;
  due_date: string | null;
  note: string | null;
  created_at: string | null;
};

type RenewalReminderRow = {
  id: string;
  school_id: string;
  reminder_type: "Upcoming" | "Urgent" | "Expired" | "UpgradeOpportunity";
  title: string;
  message: string;
  remind_at: string;
  status: "Pending" | "Read" | "Dismissed";
  created_at: string | null;
};

type PlanChangeRequestRow = {
  id: string;
  school_id: string;
  current_plan: string | null;
  requested_plan: string;
  requested_billing_cycle: "Monthly" | "Quarterly" | "Yearly" | "Custom";
  requested_duration_months: number;
  expected_amount: number | string | null;
  note: string | null;
  status: "Pending" | "Approved" | "Rejected";
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string | null;
};

const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add your project URL and anon key.");
  }

  return supabase;
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
  const endpoints = ["/api/admin"];

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname.toLowerCase();
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local");

    if (isLocalHost) {
      endpoints.push(`http://localhost:${port}/api/admin`);
    }
  } else {
    endpoints.push(`http://localhost:${port}/api/admin`);
  }

  return Array.from(new Set(endpoints));
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
    const isBrowser = typeof window !== "undefined";
    const isLocalHost =
      isBrowser &&
      ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname.toLowerCase());

    throw new Error(
      isLocalHost
        ? "Unable to reach the local admin API. Start `npm run dev`, or run `npm run dev:server` so `http://localhost:8787/api/admin` is available, then refresh the page."
        : "Unable to reach the admin API. In production, make sure the `/api/admin` endpoint is deployed and the required Vercel environment variables are set.",
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

const invokePlatformAction = async <T>(action: string, payload: Record<string, unknown>) => {
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
      "Admin setup is incomplete. Create `.env.server` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, then run `npm run dev` or `npm run dev:server`.";

    if (response.status >= 500) {
      throw new Error(
        result.error?.trim() ? `${backendMissingMessage} Server response: ${result.error.trim()}` : backendMissingMessage,
      );
    }

    throw new Error(result.error ?? `Platform action failed (${response.status} ${response.statusText}).`);
  }

  return result.data as T;
};

const mapSchool = (row: SchoolRow): SchoolRecord => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  address: row.address,
  attendanceMapLink: row.attendance_map_link,
  attendanceGeoLatitude: row.attendance_geo_latitude,
  attendanceGeoLongitude: row.attendance_geo_longitude,
  attendanceGeoRadiusMeters: row.attendance_geo_radius_meters,
  billingContactName: row.billing_contact_name,
  billingContactEmail: row.billing_contact_email,
  billingContactPhone: row.billing_contact_phone,
  billingAddress: row.billing_address,
  financeEmail: row.finance_email,
  taxId: row.tax_id,
  authorizedSignatory: row.authorized_signatory,
  logoUrl: row.logo_url,
  themeColor: row.theme_color,
  subscriptionStatus: row.subscription_status,
  subscriptionPlan: row.subscription_plan,
  storageLimit: row.storage_limit,
  studentLimit: row.student_limit,
  staffLimit: row.staff_limit,
  renewalNoticeDays: row.renewal_notice_days,
  expiryDate: row.expiry_date,
  createdAt: row.created_at,
});

const mapSubscription = (row: SubscriptionRow): SubscriptionRecord => ({
  id: row.id,
  schoolId: row.school_id,
  planName: row.plan_name,
  amount: Number(row.amount ?? 0),
  durationMonths: row.duration_months,
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status,
  createdAt: row.created_at,
});

const mapPayment = (row: PaymentRow): PaymentRecord => ({
  id: row.id,
  schoolId: row.school_id,
  amount: Number(row.amount ?? 0),
  paymentMethod: row.payment_method,
  paymentDate: row.payment_date,
  status: row.status,
  createdAt: row.created_at,
});

const mapPaymentRequest = (row: PaymentRequestRow): SchoolPaymentRequestRecord => ({
  id: row.id,
  schoolId: row.school_id,
  requestedPlan: row.requested_plan,
  requestedAmount: Number(row.requested_amount ?? 0),
  durationMonths: row.duration_months,
  paymentMethod: row.payment_method,
  paymentDate: row.payment_date,
  transactionReference: row.transaction_reference,
  proofUrl: row.proof_url,
  note: row.note,
  status: row.status,
  createdBy: row.created_by,
  verifiedBy: row.verified_by,
  verifiedAt: row.verified_at,
  verifiedNote: row.verified_note,
  paymentId: row.payment_id,
  subscriptionId: row.subscription_id,
  createdAt: row.created_at,
});

const mapBillingDocument = (row: BillingDocumentRow): BillingDocumentRecord => ({
  id: row.id,
  schoolId: row.school_id,
  paymentRequestId: row.payment_request_id,
  paymentId: row.payment_id,
  subscriptionId: row.subscription_id,
  documentNumber: row.document_number,
  documentType: row.document_type,
  title: row.title,
  amount: Number(row.amount ?? 0),
  status: row.status,
  issueDate: row.issue_date,
  dueDate: row.due_date,
  note: row.note,
  createdAt: row.created_at,
});

const mapRenewalReminder = (row: RenewalReminderRow): RenewalReminderRecord => ({
  id: row.id,
  schoolId: row.school_id,
  reminderType: row.reminder_type,
  title: row.title,
  message: row.message,
  remindAt: row.remind_at,
  status: row.status,
  createdAt: row.created_at,
});

const mapPlanChangeRequest = (row: PlanChangeRequestRow): PlanChangeRequestRecord => ({
  id: row.id,
  schoolId: row.school_id,
  currentPlan: row.current_plan,
  requestedPlan: row.requested_plan,
  requestedBillingCycle: row.requested_billing_cycle,
  requestedDurationMonths: row.requested_duration_months,
  expectedAmount: Number(row.expected_amount ?? 0),
  note: row.note,
  status: row.status,
  requestedBy: row.requested_by,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  reviewNote: row.review_note,
  createdAt: row.created_at,
});

export const listSchools = async (): Promise<SchoolRecord[]> => {
  return invokePlatformAction<SchoolRecord[]>("list_schools", {});
};

export const listSubscriptions = async (): Promise<SubscriptionRecord[]> => {
  return invokePlatformAction<SubscriptionRecord[]>("list_subscriptions", {});
};

export const listPayments = async (): Promise<PaymentRecord[]> => {
  return invokePlatformAction<PaymentRecord[]>("list_payments", {});
};

export const listSchoolStorage = async (): Promise<SchoolStorageRecord[]> => {
  return invokePlatformAction<SchoolStorageRecord[]>("list_school_storage", {});
};

export const getSuperAdminMetrics = async (): Promise<SuperAdminMetrics> => {
  const [schools, payments] = await Promise.all([listSchools(), listPayments()]);

  return {
    totalSchools: schools.length,
    activeSubscriptions: schools.filter((item) => item.subscriptionStatus === "Active").length,
    expiredSchools: schools.filter((item) => item.subscriptionStatus === "Expired").length,
    totalRevenue: payments
      .filter((item) => item.status === "Success")
      .reduce((sum, item) => sum + item.amount, 0),
  };
};

export const listBillingRows = async (): Promise<BillingRow[]> => {
  const [schools, subscriptions] = await Promise.all([listSchools(), listSubscriptions()]);
  const latestSubscriptionBySchool = new Map<string, SubscriptionRecord>();

  subscriptions.forEach((item) => {
    const current = latestSubscriptionBySchool.get(item.schoolId);
    if (!current || String(item.createdAt ?? "") > String(current.createdAt ?? "")) {
      latestSubscriptionBySchool.set(item.schoolId, item);
    }
  });

  return schools.map((school) => {
    const subscription = latestSubscriptionBySchool.get(school.id);
    return {
      schoolId: school.id,
      schoolName: school.name,
      planName: subscription?.planName ?? school.subscriptionPlan,
      amount: subscription?.amount ?? 0,
      status: school.subscriptionStatus,
      expiryDate: school.expiryDate,
      createdAt: subscription?.createdAt ?? school.createdAt,
    };
  });
};

export const createSchool = async (values: SchoolCreateValues) => {
  const durationMonths = Number(values.durationMonths);
  const attendanceGeoRadiusMeters = values.attendanceGeoRadiusMeters?.trim()
    ? Number(values.attendanceGeoRadiusMeters)
    : null;
  if (!values.name.trim()) throw new Error("School name is required.");
  if (!values.adminName.trim()) throw new Error("Admin name is required.");
  if (!values.adminEmail.trim()) throw new Error("Admin email is required.");
  if (!values.adminPassword.trim()) throw new Error("Admin password is required.");
  if (!Number.isFinite(durationMonths) || durationMonths <= 0) throw new Error("Duration must be a positive number.");
  if (
    attendanceGeoRadiusMeters !== null &&
    (!Number.isFinite(attendanceGeoRadiusMeters) || attendanceGeoRadiusMeters <= 0)
  ) {
    throw new Error("Attendance GPS radius must be greater than zero.");
  }

  return invokePlatformAction<SchoolRecord>("create_school_bundle", {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    address: values.address.trim(),
    attendanceMapLink: values.attendanceMapLink?.trim() ?? "",
    attendanceGeoRadiusMeters,
    plan: values.plan.trim(),
    durationMonths,
    adminName: values.adminName.trim(),
    adminEmail: values.adminEmail.trim().toLowerCase(),
    adminPassword: values.adminPassword,
  });
};

export const createBillingPayment = async (values: BillingCreateValues) => {
  const amount = Number(values.amount);
  const durationMonths = Number(values.durationMonths);

  if (!values.schoolId) throw new Error("School is required.");
  if (!values.planName.trim()) throw new Error("Plan name is required.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than zero.");
  if (!Number.isFinite(durationMonths) || durationMonths <= 0) throw new Error("Duration must be a positive number.");

  return invokePlatformAction<{
    payment: PaymentRecord;
    subscription: SubscriptionRecord;
    school: SchoolRecord;
  }>("record_school_payment", {
    schoolId: values.schoolId,
    planName: values.planName.trim(),
    amount,
    durationMonths,
    paymentMethod: values.paymentMethod.trim() || "Manual",
  });
};

export const updateSchool = async (schoolId: string, values: SchoolUpdateValues) => {
  const parseLimit = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? Number(trimmed) : null;
  };
  const attendanceGeoRadiusMeters = parseLimit(values.attendanceGeoRadiusMeters ?? "");

  if (
    attendanceGeoRadiusMeters !== null &&
    (!Number.isFinite(attendanceGeoRadiusMeters) || attendanceGeoRadiusMeters <= 0)
  ) {
    throw new Error("Attendance GPS radius must be greater than zero.");
  }

  return invokePlatformAction<SchoolRecord>("update_school", {
    schoolId,
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    address: values.address.trim(),
    attendanceMapLink: values.attendanceMapLink?.trim() ?? "",
    attendanceGeoRadiusMeters,
    billingContactName: values.billingContactName?.trim() ?? "",
    billingContactEmail: values.billingContactEmail?.trim() ?? "",
    billingContactPhone: values.billingContactPhone?.trim() ?? "",
    billingAddress: values.billingAddress?.trim() ?? "",
    financeEmail: values.financeEmail?.trim() ?? "",
    taxId: values.taxId?.trim() ?? "",
    authorizedSignatory: values.authorizedSignatory?.trim() ?? "",
    subscriptionPlan: values.subscriptionPlan.trim(),
    subscriptionStatus: values.subscriptionStatus,
    storageLimit: parseLimit(values.storageLimit),
    studentLimit: parseLimit(values.studentLimit ?? ""),
    staffLimit: parseLimit(values.staffLimit ?? ""),
    renewalNoticeDays: parseLimit(values.renewalNoticeDays ?? ""),
    expiryDate: values.expiryDate.trim(),
  });
};

export const deleteSchool = async (schoolId: string) => {
  return invokePlatformAction<{ ok: true }>("delete_school", { schoolId });
};

export const updateSchoolBilling = async (schoolId: string, values: BillingUpdateValues) => {
  const amount = Number(values.amount);
  if (!values.planName.trim()) throw new Error("Plan name is required.");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Amount must be zero or more.");

  return invokePlatformAction<{ ok: true }>("update_school_billing", {
    schoolId,
    planName: values.planName.trim(),
    amount,
    status: values.status,
    expiryDate: values.expiryDate.trim(),
  });
};

export const deleteSchoolBilling = async (schoolId: string) => {
  return invokePlatformAction<{ ok: true }>("delete_school_billing", { schoolId });
};

export const updatePayment = async (paymentId: string, values: PaymentUpdateValues) => {
  const amount = Number(values.amount);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Amount must be zero or more.");

  return invokePlatformAction<PaymentRecord>("update_payment", {
    paymentId,
    amount,
    paymentMethod: values.paymentMethod.trim(),
    paymentDate: values.paymentDate.trim(),
    status: values.status,
  });
};

export const deletePayment = async (paymentId: string) => {
  return invokePlatformAction<{ ok: true }>("delete_payment", { paymentId });
};

export const listSuperAdminAuditLogs = async (): Promise<SuperAdminAuditLogRecord[]> => {
  return invokePlatformAction<SuperAdminAuditLogRecord[]>("list_superadmin_audit_logs", {});
};

export const getSuperAdminSchoolProfile = async (schoolId: string): Promise<SchoolProfileRecord> => {
  return invokePlatformAction<SchoolProfileRecord>("get_superadmin_school_profile", { schoolId });
};

export const getSchoolSubscriptionOverview = async (): Promise<SchoolSubscriptionOverview> => {
  return invokePlatformAction<SchoolSubscriptionOverview>("get_school_subscription_overview", {});
};

export const getSchoolBillingProfile = async (): Promise<SchoolBillingProfileRecord> => {
  return invokePlatformAction<SchoolBillingProfileRecord>("get_school_billing_profile", {});
};

export const updateSchoolBillingProfile = async (values: SchoolBillingProfileUpdateValues) => {
  return invokePlatformAction<SchoolBillingProfileRecord>("update_school_billing_profile", {
    email: values.email.trim(),
    phone: values.phone.trim(),
    address: values.address.trim(),
    billingContactName: values.billingContactName.trim(),
    billingContactEmail: values.billingContactEmail.trim(),
    billingContactPhone: values.billingContactPhone.trim(),
    billingAddress: values.billingAddress.trim(),
    financeEmail: values.financeEmail.trim(),
    taxId: values.taxId.trim(),
    authorizedSignatory: values.authorizedSignatory.trim(),
    renewalNoticeDays: values.renewalNoticeDays.trim(),
  });
};

export const listSchoolPaymentRequests = async (): Promise<SchoolPaymentRequestRecord[]> => {
  return invokePlatformAction<SchoolPaymentRequestRecord[]>("list_school_payment_requests", {});
};

export const createSchoolPaymentRequest = async (values: SchoolPaymentRequestCreateValues) => {
  const requestedAmount = Number(values.requestedAmount);
  const durationMonths = Number(values.durationMonths);

  if (!values.requestedPlan.trim()) throw new Error("Plan is required.");
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) throw new Error("Amount must be greater than zero.");
  if (!Number.isFinite(durationMonths) || durationMonths <= 0) throw new Error("Duration must be a positive number.");

  return invokePlatformAction<SchoolPaymentRequestRecord>("create_school_payment_request", {
    requestedPlan: values.requestedPlan.trim(),
    requestedAmount,
    durationMonths,
    paymentMethod: values.paymentMethod.trim(),
    paymentDate: values.paymentDate.trim(),
    transactionReference: values.transactionReference.trim(),
    proofUrl: values.proofUrl.trim(),
    note: values.note.trim(),
  });
};

export const listSchoolBillingDocuments = async (): Promise<BillingDocumentRecord[]> => {
  return invokePlatformAction<BillingDocumentRecord[]>("list_school_billing_documents", {});
};

export const listSchoolRenewalReminders = async (): Promise<RenewalReminderRecord[]> => {
  return invokePlatformAction<RenewalReminderRecord[]>("list_school_renewal_reminders", {});
};

export const getSchoolUsage = async (): Promise<SchoolUsageRecord> => {
  return invokePlatformAction<SchoolUsageRecord>("get_school_usage", {});
};

export const listSchoolPlanChangeRequests = async (): Promise<PlanChangeRequestRecord[]> => {
  return invokePlatformAction<PlanChangeRequestRecord[]>("list_school_plan_change_requests", {});
};

export const createPlanChangeRequest = async (values: PlanChangeRequestCreateValues) => {
  const requestedDurationMonths = Number(values.requestedDurationMonths);
  const expectedAmount = Number(values.expectedAmount);

  if (!values.requestedPlan.trim()) throw new Error("Requested plan is required.");
  if (!Number.isFinite(requestedDurationMonths) || requestedDurationMonths <= 0) {
    throw new Error("Requested duration must be a positive number.");
  }
  if (!Number.isFinite(expectedAmount) || expectedAmount < 0) {
    throw new Error("Expected amount must be zero or more.");
  }

  return invokePlatformAction<PlanChangeRequestRecord>("create_plan_change_request", {
    requestedPlan: values.requestedPlan.trim(),
    requestedBillingCycle: values.requestedBillingCycle,
    requestedDurationMonths,
    expectedAmount,
    note: values.note.trim(),
  });
};

export const listSuperAdminPaymentRequests = async (): Promise<SchoolPaymentRequestRecord[]> => {
  return invokePlatformAction<SchoolPaymentRequestRecord[]>("list_superadmin_payment_requests", {});
};

export const reviewSchoolPaymentRequest = async (paymentRequestId: string, values: SchoolPaymentRequestReviewValues) => {
  return invokePlatformAction<SchoolPaymentRequestRecord>("review_school_payment_request", {
    paymentRequestId,
    status: values.status,
    verifiedNote: values.verifiedNote.trim(),
  });
};

export const listSuperAdminPlanChangeRequests = async (): Promise<PlanChangeRequestRecord[]> => {
  return invokePlatformAction<PlanChangeRequestRecord[]>("list_superadmin_plan_change_requests", {});
};

export const reviewPlanChangeRequest = async (planRequestId: string, values: PlanChangeRequestReviewValues) => {
  return invokePlatformAction<PlanChangeRequestRecord>("review_plan_change_request", {
    planRequestId,
    status: values.status,
    reviewNote: values.reviewNote.trim(),
  });
};

export {
  mapBillingDocument,
  mapPayment,
  mapPaymentRequest,
  mapPlanChangeRequest,
  mapRenewalReminder,
  mapSchool,
  mapSubscription,
};
