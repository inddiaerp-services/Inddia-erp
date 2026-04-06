import { useEffect, useMemo, useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { AdminPageHeader, DetailField, DetailSection } from "./adminPageUtils";
import {
  createPlanChangeRequest,
  createSchoolPaymentRequest,
  getSchoolBillingProfile,
  getSchoolSubscriptionOverview,
  getSchoolUsage,
  listSchoolBillingDocuments,
  listSchoolPaymentRequests,
  listSchoolPlanChangeRequests,
  listSchoolRenewalReminders,
  listSchools,
  listSuperAdminPaymentRequests,
  listSuperAdminPlanChangeRequests,
  reviewPlanChangeRequest,
  reviewSchoolPaymentRequest,
  updateSchoolBillingProfile,
} from "../../services/saasService";
import type {
  BillingDocumentRecord,
  PlanBillingCycle,
  PlanChangeRequestCreateValues,
  PlanChangeRequestRecord,
  RenewalReminderRecord,
  SchoolBillingProfileRecord,
  SchoolBillingProfileUpdateValues,
  SchoolPaymentRequestCreateValues,
  SchoolPaymentRequestRecord,
  SchoolSubscriptionOverview,
  SchoolUsageRecord,
} from "../../types/saas";

const formatCurrencyInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const formatStorage = (bytes: number) => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

const downloadBillingDocumentPdf = async (document: BillingDocumentRecord, schoolName: string) => {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  pdf.setFontSize(20);
  pdf.text(`INDDIA ERP ${document.documentType}`, 20, 24);
  pdf.setFontSize(11);
  pdf.text(`Document No: ${document.documentNumber}`, 20, 38);
  pdf.text(`School: ${schoolName}`, 20, 48);
  pdf.text(`Title: ${document.title ?? document.documentType}`, 20, 58);
  pdf.text(`Amount: ${formatCurrencyInr(document.amount)}`, 20, 68);
  pdf.text(`Issue Date: ${formatDate(document.issueDate)}`, 20, 78);
  pdf.text(`Due Date: ${formatDate(document.dueDate)}`, 20, 88);
  pdf.text(`Status: ${document.status}`, 20, 98);
  pdf.text(`Note: ${document.note ?? "-"}`, 20, 112, { maxWidth: 170 });
  pdf.save(`${document.documentNumber.toLowerCase()}.pdf`);
};

const schoolBillingProfileEmpty: SchoolBillingProfileUpdateValues = {
  email: "",
  phone: "",
  address: "",
  billingContactName: "",
  billingContactEmail: "",
  billingContactPhone: "",
  billingAddress: "",
  financeEmail: "",
  taxId: "",
  authorizedSignatory: "",
  renewalNoticeDays: "7",
};

const paymentRequestEmpty: SchoolPaymentRequestCreateValues = {
  requestedPlan: "",
  requestedAmount: "",
  durationMonths: "12",
  paymentMethod: "Bank Transfer",
  paymentDate: new Date().toISOString().slice(0, 16),
  transactionReference: "",
  proofUrl: "",
  note: "",
};

const planRequestEmpty: PlanChangeRequestCreateValues = {
  requestedPlan: "",
  requestedBillingCycle: "Yearly",
  requestedDurationMonths: "12",
  expectedAmount: "",
  note: "",
};

const MiniStat = ({ label, value, detail }: { label: string; value: string | number; detail: string }) => (
  <Card>
    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-3 text-xl font-semibold text-slate-900">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{detail}</p>
  </Card>
);

const StatusPill = ({ value }: { value: string }) => {
  const tone =
    value === "Approved" || value === "Success" || value === "Active"
      ? "bg-emerald-100 text-emerald-700"
      : value === "Pending" || value === "Trial" || value === "Upcoming" || value === "Urgent"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
};

const EmptyState = ({ title }: { title: string }) => (
  <Card className="border-dashed border-slate-300 text-sm text-slate-500">{title}</Card>
);

export const SchoolSubscriptionPage = () => {
  const [overview, setOverview] = useState<SchoolSubscriptionOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getSchoolSubscriptionOverview()
      .then((data) => {
        setOverview(data);
        setError("");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load subscription overview.");
      });
  }, []);

  if (!overview && error) return <Card className="border-rose-200 bg-rose-50 text-rose-700">{error}</Card>;
  if (!overview) return <Card>Loading subscription overview...</Card>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Subscription"
        description="Track the school’s current ERP plan, renewal pressure, pending payment submissions, and upgrade intent in one commercial summary."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Current Plan" value={overview.school.subscriptionPlan ?? "Trial"} detail="Active commercial package" />
        <MiniStat label="Status" value={overview.school.subscriptionStatus} detail="Current platform access state" />
        <MiniStat label="Expiry" value={formatDate(overview.school.expiryDate)} detail="Renewal target date" />
        <MiniStat label="Pending" value={overview.pendingPaymentRequests + overview.pendingPlanRequests} detail="Open payment and upgrade actions" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DetailSection title="Subscription Snapshot">
          <DetailField label="School" value={overview.school.name} />
          <DetailField label="Latest Plan" value={overview.latestSubscription?.planName ?? overview.school.subscriptionPlan ?? "-"} />
          <DetailField label="Latest Amount" value={formatCurrencyInr(overview.latestSubscription?.amount ?? 0)} />
          <DetailField label="Subscription Window" value={`${formatDate(overview.latestSubscription?.startDate ?? null)} to ${formatDate(overview.latestSubscription?.endDate ?? null)}`} />
          <DetailField label="Last Payment" value={formatDateTime(overview.latestPayment?.paymentDate ?? null)} />
          <DetailField label="Reminder Queue" value={`${overview.upcomingReminderCount} active reminder${overview.upcomingReminderCount === 1 ? "" : "s"}`} />
        </DetailSection>

        <DetailSection title="Action Readiness">
          <DetailField label="Pending Payment Proofs" value={overview.pendingPaymentRequests} />
          <DetailField label="Pending Upgrade Requests" value={overview.pendingPlanRequests} />
          <DetailField label="Billing Contact" value={overview.school.billingContactName ?? "-"} />
          <DetailField label="Finance Email" value={overview.school.financeEmail ?? "-"} />
          <DetailField label="Renewal Notice Days" value={overview.school.renewalNoticeDays ?? 7} />
          <DetailField label="Tax ID" value={overview.school.taxId ?? "-"} />
        </DetailSection>
      </div>

      {error ? <Card className="border-rose-200 bg-rose-50 text-rose-700">{error}</Card> : null}
    </div>
  );
};

export const SchoolPaySuperAdminPage = () => {
  const [form, setForm] = useState<SchoolPaymentRequestCreateValues>(paymentRequestEmpty);
  const [requests, setRequests] = useState<SchoolPaymentRequestRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    const rows = await listSchoolPaymentRequests();
    setRequests(rows);
  };

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load payment requests.");
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const created = await createSchoolPaymentRequest(form);
      setForm(paymentRequestEmpty);
      setRequests((current) => [created, ...current]);
      setSuccess("Payment proof submitted for super admin verification.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit payment request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pay to Super Admin"
        description="Submit platform renewal or activation payments with transaction reference and proof so the super admin can verify and activate the billing cycle."
      />

      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input label="Requested Plan" value={form.requestedPlan} onChange={(event) => setForm((current) => ({ ...current, requestedPlan: event.target.value }))} required />
          <Input label="Amount" type="number" min="1" value={form.requestedAmount} onChange={(event) => setForm((current) => ({ ...current, requestedAmount: event.target.value }))} required />
          <Input label="Duration in Months" type="number" min="1" value={form.durationMonths} onChange={(event) => setForm((current) => ({ ...current, durationMonths: event.target.value }))} required />
          <Input label="Payment Method" value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} required />
          <Input label="Payment Date" type="datetime-local" value={form.paymentDate} onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))} required />
          <Input label="Transaction / UTR Reference" value={form.transactionReference} onChange={(event) => setForm((current) => ({ ...current, transactionReference: event.target.value }))} required />
          <Input label="Proof URL" value={form.proofUrl} onChange={(event) => setForm((current) => ({ ...current, proofUrl: event.target.value }))} />
          <Input label="Note" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
          <div className="md:col-span-2 flex items-center justify-between gap-4">
            <div className="text-sm">
              {error ? <span className="text-rose-600">{error}</span> : success ? <span className="text-emerald-600">{success}</span> : <span className="text-slate-500">Approved requests automatically become billing receipts and update the live subscription.</span>}
            </div>
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Proof"}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Recent Payment Requests</h2>
        <div className="mt-4 space-y-3">
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">No payment submissions yet.</p>
          ) : (
            requests.slice(0, 5).map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{row.requestedPlan}</p>
                    <p className="text-sm text-slate-500">{formatCurrencyInr(row.requestedAmount)} for {row.durationMonths} month(s)</p>
                  </div>
                  <StatusPill value={row.status} />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-slate-600">
                  <div>Reference: {row.transactionReference ?? "-"}</div>
                  <div>Date: {formatDateTime(row.paymentDate)}</div>
                  <div>Reviewed: {formatDateTime(row.verifiedAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export const SchoolBillingHistoryPage = () => {
  const [rows, setRows] = useState<SchoolPaymentRequestRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void listSchoolPaymentRequests()
      .then((data) => {
        setRows(data);
        setError("");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load billing history.");
      });
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Billing History"
        description="Review every payment submission made by the school to the platform, including proof reference, verification notes, and approval outcome."
      />

      {rows.length === 0 ? <EmptyState title="No billing history is available yet." /> : null}
      <div className="space-y-4">
        {rows.map((row) => (
          <Card key={row.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">{row.requestedPlan}</h2>
                  <StatusPill value={row.status} />
                </div>
                <p className="mt-2 text-sm text-slate-500">{formatCurrencyInr(row.requestedAmount)} for {row.durationMonths} month(s)</p>
              </div>
              <div className="grid gap-2 text-sm text-slate-600">
                <div>Transaction Reference: {row.transactionReference ?? "-"}</div>
                <div>Submitted: {formatDateTime(row.createdAt)}</div>
                <div>Verified: {formatDateTime(row.verifiedAt)}</div>
                <div>Review Note: {row.verifiedNote ?? "-"}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {error ? <Card className="border-rose-200 bg-rose-50 text-rose-700">{error}</Card> : null}
    </div>
  );
};

export const SchoolInvoicesPage = () => {
  const [documents, setDocuments] = useState<BillingDocumentRecord[]>([]);
  const [profile, setProfile] = useState<SchoolBillingProfileRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([listSchoolBillingDocuments(), getSchoolBillingProfile()])
      .then(([docs, billingProfile]) => {
        setDocuments(docs);
        setProfile(billingProfile);
        setError("");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load documents.");
      });
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Invoices & Receipts"
        description="View every invoice and receipt generated for the school’s platform account and download a clean PDF copy whenever finance needs it."
      />

      {documents.length === 0 ? <EmptyState title="No invoices or receipts are available yet." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {documents.map((document) => (
          <Card key={document.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{document.documentNumber}</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">{document.title ?? document.documentType}</h2>
                <p className="mt-2 text-sm text-slate-500">{formatCurrencyInr(document.amount)}</p>
              </div>
              <StatusPill value={document.documentType} />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <div>Issue Date: {formatDate(document.issueDate)}</div>
              <div>Due Date: {formatDate(document.dueDate)}</div>
              <div>Status: {document.status}</div>
              <div>Note: {document.note ?? "-"}</div>
            </div>
            <div className="mt-4">
              <Button variant="outline" onClick={() => void downloadBillingDocumentPdf(document, profile?.school.name ?? "School")}>Download PDF</Button>
            </div>
          </Card>
        ))}
      </div>
      {error ? <Card className="border-rose-200 bg-rose-50 text-rose-700">{error}</Card> : null}
    </div>
  );
};

export const SchoolRenewalRemindersPage = () => {
  const [rows, setRows] = useState<RenewalReminderRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void listSchoolRenewalReminders()
      .then((data) => {
        setRows(data);
        setError("");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load reminders.");
      });
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Renewal Reminder System"
        description="Stay ahead of subscription expiry with platform reminders that flag upcoming renewals, urgent billing deadlines, expired access, and trial upgrade opportunities."
      />

      {rows.length === 0 ? <EmptyState title="No renewal reminders are active right now." /> : null}
      <div className="space-y-4">
        {rows.map((row) => (
          <Card key={row.id}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{row.title}</h2>
                <p className="mt-2 text-sm text-slate-500">{row.message}</p>
              </div>
              <StatusPill value={row.reminderType} />
            </div>
            <p className="mt-4 text-sm text-slate-600">Reminder Date: {formatDate(row.remindAt)}</p>
          </Card>
        ))}
      </div>
      {error ? <Card className="border-rose-200 bg-rose-50 text-rose-700">{error}</Card> : null}
    </div>
  );
};

export const SchoolPlanUpgradePage = () => {
  const [requests, setRequests] = useState<PlanChangeRequestRecord[]>([]);
  const [overview, setOverview] = useState<SchoolSubscriptionOverview | null>(null);
  const [form, setForm] = useState<PlanChangeRequestCreateValues>(planRequestEmpty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    const [rows, nextOverview] = await Promise.all([listSchoolPlanChangeRequests(), getSchoolSubscriptionOverview()]);
    setRequests(rows);
    setOverview(nextOverview);
  };

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load plan upgrade data.");
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const created = await createPlanChangeRequest(form);
      setRequests((current) => [created, ...current]);
      setForm(planRequestEmpty);
      setSuccess("Plan upgrade request sent to super admin.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit plan change request.");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = useMemo(() => requests.filter((row) => row.status === "Pending").length, [requests]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Plan Upgrade"
        description="Request upgrades, downgrades, or billing-cycle changes with expected budget and business notes so the super admin can review them with context."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MiniStat label="Current Plan" value={overview?.school.subscriptionPlan ?? "Trial"} detail="Your active package today" />
        <MiniStat label="Pending Requests" value={pendingCount} detail="Open change requests awaiting review" />
        <MiniStat label="Current Expiry" value={formatDate(overview?.school.expiryDate ?? null)} detail="Useful for timing the upgrade" />
      </div>

      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input label="Requested Plan" value={form.requestedPlan} onChange={(event) => setForm((current) => ({ ...current, requestedPlan: event.target.value }))} required />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Billing Cycle</span>
            <select className="ui-select" value={form.requestedBillingCycle} onChange={(event) => setForm((current) => ({ ...current, requestedBillingCycle: event.target.value as PlanBillingCycle }))}>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
              <option value="Custom">Custom</option>
            </select>
          </label>
          <Input label="Requested Duration in Months" type="number" min="1" value={form.requestedDurationMonths} onChange={(event) => setForm((current) => ({ ...current, requestedDurationMonths: event.target.value }))} required />
          <Input label="Expected Amount" type="number" min="0" value={form.expectedAmount} onChange={(event) => setForm((current) => ({ ...current, expectedAmount: event.target.value }))} required />
          <Input label="Business Note" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
          <div className="md:col-span-2 flex items-center justify-between gap-4">
            <div className="text-sm">
              {error ? <span className="text-rose-600">{error}</span> : success ? <span className="text-emerald-600">{success}</span> : <span className="text-slate-500">Use this to request plan change approval before the next renewal window.</span>}
            </div>
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Request Plan Change"}</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        {requests.map((row) => (
          <Card key={row.id}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{row.currentPlan ?? "Current Plan"} to {row.requestedPlan}</h2>
                <p className="mt-2 text-sm text-slate-500">{row.requestedBillingCycle} billing for {row.requestedDurationMonths} month(s)</p>
              </div>
              <StatusPill value={row.status} />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
              <div>Expected Amount: {formatCurrencyInr(row.expectedAmount)}</div>
              <div>Submitted: {formatDateTime(row.createdAt)}</div>
              <div>Review Note: {row.reviewNote ?? "-"}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const SchoolUsageDashboardPage = () => {
  const [usage, setUsage] = useState<SchoolUsageRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getSchoolUsage()
      .then((data) => {
        setUsage(data);
        setError("");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load usage dashboard.");
      });
  }, []);

  if (!usage && error) return <Card className="border-rose-200 bg-rose-50 text-rose-700">{error}</Card>;
  if (!usage) return <Card>Loading usage dashboard...</Card>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Usage Dashboard"
        description="See how the school is consuming storage and operational capacity so you can justify renewals, upgrades, and commercial planning with live numbers."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Storage Used" value={formatStorage(usage.usedBytes)} detail="Total objects and database footprint" />
        <MiniStat label="Students" value={usage.studentCount} detail={`Limit ${usage.studentLimit ?? "Not set"}`} />
        <MiniStat label="Staff" value={usage.staffCount} detail={`Limit ${usage.staffLimit ?? "Not set"}`} />
        <MiniStat label="Classes" value={usage.classCount} detail="Configured academic sections" />
      </div>

      <Card>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Storage Usage</p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(4, usage.usagePercent ?? 0)}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-600">{usage.usagePercent != null ? `${usage.usagePercent}% of configured storage limit` : "No storage cap is configured yet."}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="File Storage" value={formatStorage(usage.objectBytes)} />
          <DetailField label="Database Size" value={formatStorage(usage.databaseBytes)} />
          <DetailField label="Database Rows" value={usage.databaseRowCount} />
          <DetailField label="Admin Accounts" value={usage.adminCount} />
        </div>
      </Card>

      {error ? <Card className="border-rose-200 bg-rose-50 text-rose-700">{error}</Card> : null}
    </div>
  );
};

export const SchoolBillingProfilePage = () => {
  const [profile, setProfile] = useState<SchoolBillingProfileRecord | null>(null);
  const [form, setForm] = useState<SchoolBillingProfileUpdateValues>(schoolBillingProfileEmpty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    const data = await getSchoolBillingProfile();
    setProfile(data);
    setForm({
      email: data.school.email ?? "",
      phone: data.school.phone ?? "",
      address: data.school.address ?? "",
      billingContactName: data.school.billingContactName ?? "",
      billingContactEmail: data.school.billingContactEmail ?? "",
      billingContactPhone: data.school.billingContactPhone ?? "",
      billingAddress: data.school.billingAddress ?? "",
      financeEmail: data.school.financeEmail ?? "",
      taxId: data.school.taxId ?? "",
      authorizedSignatory: data.school.authorizedSignatory ?? "",
      renewalNoticeDays: String(data.school.renewalNoticeDays ?? 7),
    });
  };

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load billing profile.");
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateSchoolBillingProfile(form);
      setProfile(updated);
      setSuccess("School billing profile updated.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update billing profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="School Profile & Billing Details"
        description="Maintain the school’s commercial identity for invoices, finance communication, tax records, and renewal notices."
      />

      {profile ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="School" value={profile.school.name} detail="Tenant identity used across billing" />
          <MiniStat label="Current Plan" value={profile.school.subscriptionPlan ?? "Trial"} detail="Live subscription on record" />
          <MiniStat label="Latest Payment" value={formatCurrencyInr(profile.latestPayment?.amount ?? 0)} detail={formatDate(profile.latestPayment?.paymentDate ?? null)} />
          <MiniStat label="Renewal Notice" value={`${profile.school.renewalNoticeDays ?? 7} days`} detail="Reminder lead time on the account" />
        </div>
      ) : null}

      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input label="School Email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <Input label="School Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          <Input label="School Address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          <Input label="Billing Address" value={form.billingAddress} onChange={(event) => setForm((current) => ({ ...current, billingAddress: event.target.value }))} />
          <Input label="Billing Contact Name" value={form.billingContactName} onChange={(event) => setForm((current) => ({ ...current, billingContactName: event.target.value }))} />
          <Input label="Billing Contact Email" type="email" value={form.billingContactEmail} onChange={(event) => setForm((current) => ({ ...current, billingContactEmail: event.target.value }))} />
          <Input label="Billing Contact Phone" value={form.billingContactPhone} onChange={(event) => setForm((current) => ({ ...current, billingContactPhone: event.target.value }))} />
          <Input label="Finance Email" type="email" value={form.financeEmail} onChange={(event) => setForm((current) => ({ ...current, financeEmail: event.target.value }))} />
          <Input label="Tax ID / GST" value={form.taxId} onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))} />
          <Input label="Authorized Signatory" value={form.authorizedSignatory} onChange={(event) => setForm((current) => ({ ...current, authorizedSignatory: event.target.value }))} />
          <Input label="Renewal Notice Days" type="number" min="0" value={form.renewalNoticeDays} onChange={(event) => setForm((current) => ({ ...current, renewalNoticeDays: event.target.value }))} />
          <div className="md:col-span-2 flex items-center justify-between gap-4">
            <div className="text-sm">
              {error ? <span className="text-rose-600">{error}</span> : success ? <span className="text-emerald-600">{success}</span> : <span className="text-slate-500">These details are used in billing documents and renewal coordination.</span>}
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Billing Profile"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

type ReviewModalState = {
  open: boolean;
  type: "payment" | "plan" | null;
  id: string | null;
  nextStatus: "Approved" | "Rejected";
};

export const SuperAdminBillingRequestsPage = () => {
  const [paymentRequests, setPaymentRequests] = useState<SchoolPaymentRequestRecord[]>([]);
  const [planRequests, setPlanRequests] = useState<PlanChangeRequestRecord[]>([]);
  const [schoolNames, setSchoolNames] = useState<Map<string, string>>(new Map());
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ReviewModalState>({ open: false, type: null, id: null, nextStatus: "Approved" });

  const load = async () => {
    const [schools, nextPaymentRequests, nextPlanRequests] = await Promise.all([
      listSchools(),
      listSuperAdminPaymentRequests(),
      listSuperAdminPlanChangeRequests(),
    ]);
    setSchoolNames(new Map(schools.map((row) => [row.id, row.name])));
    setPaymentRequests(nextPaymentRequests);
    setPlanRequests(nextPlanRequests);
    setError("");
  };

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load billing requests.");
    });
  }, []);

  const pendingPayments = useMemo(() => paymentRequests.filter((row) => row.status === "Pending"), [paymentRequests]);
  const pendingPlans = useMemo(() => planRequests.filter((row) => row.status === "Pending"), [planRequests]);

  const openModal = (type: "payment" | "plan", id: string, nextStatus: "Approved" | "Rejected") => {
    setModal({ open: true, type, id, nextStatus });
    setReviewNote("");
  };

  const closeModal = () => setModal({ open: false, type: null, id: null, nextStatus: "Approved" });

  const handleReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal.id || !modal.type) return;
    setSaving(true);
    setError("");
    try {
      if (modal.type === "payment") {
        await reviewSchoolPaymentRequest(modal.id, { status: modal.nextStatus, verifiedNote: reviewNote });
      } else {
        await reviewPlanChangeRequest(modal.id, { status: modal.nextStatus, reviewNote: reviewNote });
      }
      closeModal();
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Billing Verification"
        description="Verify school payment proofs and review plan change requests so commercial changes move from request to approved subscription cleanly."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MiniStat label="Pending Payments" value={pendingPayments.length} detail="Proof submissions waiting for verification" />
        <MiniStat label="Pending Plan Requests" value={pendingPlans.length} detail="Upgrade or downgrade requests waiting for action" />
        <MiniStat label="Approved Proofs" value={paymentRequests.filter((row) => row.status === "Approved").length} detail="Requests already turned into live billing" />
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Payment Proof Verification</h2>
        <div className="mt-4 space-y-3">
          {paymentRequests.length === 0 ? <p className="text-sm text-slate-500">No payment proof submissions yet.</p> : paymentRequests.map((row) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{schoolNames.get(row.schoolId) ?? row.schoolId}</p>
                  <p className="mt-1 text-sm text-slate-500">{row.requestedPlan} for {formatCurrencyInr(row.requestedAmount)}</p>
                </div>
                <StatusPill value={row.status} />
              </div>
              <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                <div>Method: {row.paymentMethod ?? "-"}</div>
                <div>Reference: {row.transactionReference ?? "-"}</div>
                <div>Paid On: {formatDateTime(row.paymentDate)}</div>
                <div>Proof: {row.proofUrl ? <a href={row.proofUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">Open</a> : "-"}</div>
              </div>
              {row.status === "Pending" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => openModal("payment", row.id, "Approved")}>Approve</Button>
                  <Button variant="ghost" onClick={() => openModal("payment", row.id, "Rejected")}>Reject</Button>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Review Note: {row.verifiedNote ?? "-"}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Plan Upgrade Requests</h2>
        <div className="mt-4 space-y-3">
          {planRequests.length === 0 ? <p className="text-sm text-slate-500">No plan requests yet.</p> : planRequests.map((row) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{schoolNames.get(row.schoolId) ?? row.schoolId}</p>
                  <p className="mt-1 text-sm text-slate-500">{row.currentPlan ?? "Current"} to {row.requestedPlan}</p>
                </div>
                <StatusPill value={row.status} />
              </div>
              <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                <div>Cycle: {row.requestedBillingCycle}</div>
                <div>Duration: {row.requestedDurationMonths} month(s)</div>
                <div>Budget: {formatCurrencyInr(row.expectedAmount)}</div>
                <div>Submitted: {formatDateTime(row.createdAt)}</div>
              </div>
              {row.status === "Pending" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => openModal("plan", row.id, "Approved")}>Approve</Button>
                  <Button variant="ghost" onClick={() => openModal("plan", row.id, "Rejected")}>Reject</Button>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Review Note: {row.reviewNote ?? "-"}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {error ? <Card className="border-rose-200 bg-rose-50 text-rose-700">{error}</Card> : null}

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={`${modal.nextStatus} ${modal.type === "payment" ? "Payment Request" : "Plan Request"}`}
        description="Add an optional review note so the school team understands the decision."
      >
        <form className="space-y-4" onSubmit={handleReview}>
          <Input label="Review Note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : modal.nextStatus}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
