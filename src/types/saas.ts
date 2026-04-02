export type SchoolAccessStatus = "Active" | "Expired" | "Trial" | "Suspended";
export type SchoolPaymentRequestStatus = "Pending" | "Approved" | "Rejected";
export type BillingDocumentType = "Invoice" | "Receipt";
export type BillingDocumentStatus = "Issued" | "Void";
export type RenewalReminderType = "Upcoming" | "Urgent" | "Expired" | "UpgradeOpportunity";
export type RenewalReminderStatus = "Pending" | "Read" | "Dismissed";
export type PlanChangeRequestStatus = "Pending" | "Approved" | "Rejected";
export type PlanBillingCycle = "Monthly" | "Quarterly" | "Yearly" | "Custom";

export type SchoolRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  attendanceMapLink: string | null;
  attendanceGeoLatitude: number | null;
  attendanceGeoLongitude: number | null;
  attendanceGeoRadiusMeters: number | null;
  billingContactName: string | null;
  billingContactEmail: string | null;
  billingContactPhone: string | null;
  billingAddress: string | null;
  financeEmail: string | null;
  taxId: string | null;
  authorizedSignatory: string | null;
  logoUrl: string | null;
  themeColor: string | null;
  subscriptionStatus: SchoolAccessStatus;
  subscriptionPlan: string | null;
  storageLimit: number | null;
  studentLimit: number | null;
  staffLimit: number | null;
  renewalNoticeDays: number | null;
  expiryDate: string | null;
  createdAt: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
  warning?: string | null;
};

export type SchoolUpdateValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  attendanceMapLink?: string;
  attendanceGeoRadiusMeters?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  billingContactPhone?: string;
  billingAddress?: string;
  financeEmail?: string;
  taxId?: string;
  authorizedSignatory?: string;
  subscriptionPlan: string;
  subscriptionStatus: SchoolAccessStatus;
  storageLimit: string;
  studentLimit?: string;
  staffLimit?: string;
  renewalNoticeDays?: string;
  expiryDate: string;
};

export type SubscriptionRecord = {
  id: string;
  schoolId: string;
  planName: string | null;
  amount: number;
  durationMonths: number | null;
  startDate: string | null;
  endDate: string | null;
  status: "Active" | "Expired";
  createdAt: string | null;
};

export type PaymentRecord = {
  id: string;
  schoolId: string;
  amount: number;
  paymentMethod: string | null;
  paymentDate: string | null;
  status: "Success" | "Failed";
  createdAt: string | null;
};

export type SuperAdminMetrics = {
  totalSchools: number;
  activeSubscriptions: number;
  expiredSchools: number;
  totalRevenue: number;
};

export type SchoolCreateValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  attendanceMapLink?: string;
  attendanceGeoRadiusMeters?: string;
  plan: string;
  durationMonths: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export type BillingCreateValues = {
  schoolId: string;
  planName: string;
  amount: string;
  durationMonths: string;
  paymentMethod: string;
};

export type BillingRow = {
  schoolId: string;
  schoolName: string;
  planName: string | null;
  amount: number;
  status: SchoolAccessStatus;
  expiryDate: string | null;
  createdAt: string | null;
};

export type BillingUpdateValues = {
  planName: string;
  amount: string;
  status: SchoolAccessStatus;
  expiryDate: string;
};

export type SchoolStorageRecord = {
  schoolId: string;
  schoolName: string;
  subscriptionPlan: string | null;
  subscriptionStatus: SchoolAccessStatus;
  storageLimitMb: number | null;
  usedBytes: number;
  fileCount: number;
  databaseBytes: number;
  databaseRowCount: number;
  objectBytes: number;
  usagePercent: number | null;
  latestPaymentAmount: number;
  latestPaymentDate: string | null;
};

export type PaymentUpdateValues = {
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  status: "Success" | "Failed";
};

export type SuperAdminAuditLogRecord = {
  id: string;
  schoolId: string | null;
  schoolName: string;
  userId: string | null;
  userName: string;
  action: string;
  module: string;
  recordId: string | null;
  createdAt: string | null;
};

export type SchoolProfileRecord = {
  school: SchoolRecord;
  adminName: string | null;
  adminEmail: string | null;
  storage: SchoolStorageRecord | null;
  subscriptions: SubscriptionRecord[];
  payments: PaymentRecord[];
  auditLogs: SuperAdminAuditLogRecord[];
};

export type SchoolBillingProfileRecord = {
  school: SchoolRecord;
  latestSubscription: SubscriptionRecord | null;
  latestPayment: PaymentRecord | null;
};

export type SchoolBillingProfileUpdateValues = {
  email: string;
  phone: string;
  address: string;
  billingContactName: string;
  billingContactEmail: string;
  billingContactPhone: string;
  billingAddress: string;
  financeEmail: string;
  taxId: string;
  authorizedSignatory: string;
  renewalNoticeDays: string;
};

export type SchoolSubscriptionOverview = {
  school: SchoolRecord;
  latestSubscription: SubscriptionRecord | null;
  latestPayment: PaymentRecord | null;
  pendingPaymentRequests: number;
  pendingPlanRequests: number;
  upcomingReminderCount: number;
};

export type SchoolPaymentRequestRecord = {
  id: string;
  schoolId: string;
  requestedPlan: string;
  requestedAmount: number;
  durationMonths: number;
  paymentMethod: string | null;
  paymentDate: string | null;
  transactionReference: string | null;
  proofUrl: string | null;
  note: string | null;
  status: SchoolPaymentRequestStatus;
  createdBy: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verifiedNote: string | null;
  paymentId: string | null;
  subscriptionId: string | null;
  createdAt: string | null;
};

export type SchoolPaymentRequestCreateValues = {
  requestedPlan: string;
  requestedAmount: string;
  durationMonths: string;
  paymentMethod: string;
  paymentDate: string;
  transactionReference: string;
  proofUrl: string;
  note: string;
};

export type SchoolPaymentRequestReviewValues = {
  status: Extract<SchoolPaymentRequestStatus, "Approved" | "Rejected">;
  verifiedNote: string;
};

export type BillingDocumentRecord = {
  id: string;
  schoolId: string;
  paymentRequestId: string | null;
  paymentId: string | null;
  subscriptionId: string | null;
  documentNumber: string;
  documentType: BillingDocumentType;
  title: string | null;
  amount: number;
  status: BillingDocumentStatus;
  issueDate: string | null;
  dueDate: string | null;
  note: string | null;
  createdAt: string | null;
};

export type RenewalReminderRecord = {
  id: string;
  schoolId: string;
  reminderType: RenewalReminderType;
  title: string;
  message: string;
  remindAt: string;
  status: RenewalReminderStatus;
  createdAt: string | null;
};

export type PlanChangeRequestRecord = {
  id: string;
  schoolId: string;
  currentPlan: string | null;
  requestedPlan: string;
  requestedBillingCycle: PlanBillingCycle;
  requestedDurationMonths: number;
  expectedAmount: number;
  note: string | null;
  status: PlanChangeRequestStatus;
  requestedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string | null;
};

export type PlanChangeRequestCreateValues = {
  requestedPlan: string;
  requestedBillingCycle: PlanBillingCycle;
  requestedDurationMonths: string;
  expectedAmount: string;
  note: string;
};

export type PlanChangeRequestReviewValues = {
  status: Extract<PlanChangeRequestStatus, "Approved" | "Rejected">;
  reviewNote: string;
};

export type SchoolUsageRecord = {
  schoolId: string;
  schoolName: string;
  subscriptionPlan: string | null;
  storageLimitMb: number | null;
  usedBytes: number;
  fileCount: number;
  databaseBytes: number;
  databaseRowCount: number;
  objectBytes: number;
  usagePercent: number | null;
  studentCount: number;
  staffCount: number;
  classCount: number;
  adminCount: number;
  studentLimit: number | null;
  staffLimit: number | null;
};
