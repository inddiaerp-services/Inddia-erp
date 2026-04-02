import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  SuperAdminHero,
  SuperAdminPanel,
  SuperAdminSectionHeading,
  SuperAdminStatCard,
  SuperAdminWorkspace,
} from "../../components/superAdmin/SuperAdminDesign";
import SuperAdminMobileActionBar from "../../components/superAdmin/SuperAdminMobileActionBar";
import { getSuperAdminSchoolProfile, updateSchool } from "../../services/saasService";
import type { SchoolProfileRecord, SchoolUpdateValues } from "../../types/saas";

const emptyForm: SchoolUpdateValues = {
  name: "",
  email: "",
  phone: "",
  address: "",
  subscriptionPlan: "",
  subscriptionStatus: "Trial",
  storageLimit: "",
  expiryDate: "",
};

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

const formatCurrencyInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatStorage = (bytes: number) => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

const moduleLabel = (value: string) =>
  value
    .replace("SUPERADMIN_", "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const SuperAdminSchoolProfilePage = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [profile, setProfile] = useState<SchoolProfileRecord | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<SchoolUpdateValues>(emptyForm);
  const [editOpen, setEditOpen] = useState(false);

  const loadProfile = async () => {
    const data = await getSuperAdminSchoolProfile(id);
    setProfile(data);
    setError("");
  };

  useEffect(() => {
    if (!id) return;
    void loadProfile().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load school profile.");
    });
  }, [id]);

  const openEdit = () => {
    if (!profile) return;
    setForm({
      name: profile.school.name,
      email: profile.school.email ?? "",
      phone: profile.school.phone ?? "",
      address: profile.school.address ?? "",
      subscriptionPlan: profile.school.subscriptionPlan ?? "",
      subscriptionStatus: profile.school.subscriptionStatus,
      storageLimit: profile.school.storageLimit != null ? String(profile.school.storageLimit) : "",
      expiryDate: profile.school.expiryDate ?? "",
    });
    setFormError("");
    setEditOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setFormError("");
    try {
      await updateSchool(profile.school.id, form);
      setEditOpen(false);
      await loadProfile();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Unable to update school.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!profile) return;
    const nextStatus = profile.school.subscriptionStatus === "Suspended" ? "Active" : "Suspended";
    const confirmed = window.confirm(
      nextStatus === "Suspended"
        ? `Suspend access for "${profile.school.name}"?`
        : `Restore access for "${profile.school.name}"?`,
    );
    if (!confirmed) return;

    try {
      await updateSchool(profile.school.id, {
        name: profile.school.name,
        email: profile.school.email ?? "",
        phone: profile.school.phone ?? "",
        address: profile.school.address ?? "",
        subscriptionPlan: profile.school.subscriptionPlan ?? "",
        subscriptionStatus: nextStatus,
        storageLimit: profile.school.storageLimit != null ? String(profile.school.storageLimit) : "",
        expiryDate: profile.school.expiryDate ?? "",
      });
      await loadProfile();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update school access.");
    }
  };

  const totals = useMemo(() => {
    if (!profile) return null;
    return {
      collected: profile.payments.filter((payment) => payment.status === "Success").reduce((sum, payment) => sum + payment.amount, 0),
      failedPayments: profile.payments.filter((payment) => payment.status === "Failed").length,
    };
  }, [profile]);

  if (error && !profile) {
    return <Card className="border-rose-200 bg-rose-50 text-rose-700">{error}</Card>;
  }

  if (!profile) {
    return <Card>Loading school profile...</Card>;
  }

  return (
    <SuperAdminWorkspace className="pb-24 md:pb-0">
      <SuperAdminHero
        eyebrow="School profile"
        title={profile.school.name}
        description="Full tenant profile with commercial history, storage posture, admin ownership, and superadmin traceability in a single executive view."
        actions={
          <>
            <Button className="w-full rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-300 to-cyan-300 px-5 text-slate-950 shadow-lg shadow-sky-900/20 hover:from-sky-200 hover:to-cyan-200 sm:w-auto" onClick={() => navigate(`/super-admin/schools/${id}/edit`)}>
              Edit School
            </Button>
            <Button variant="secondary" className="w-full bg-sky-500 text-white hover:bg-sky-600 sm:w-auto" onClick={() => void handleToggleSuspend()}>
              {profile.school.subscriptionStatus === "Suspended" ? "Restore Access" : "Suspend Access"}
            </Button>
          </>
        }
        aside={
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/12 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-100">Status</p>
              <p className="mt-3 text-2xl font-semibold">{profile.school.subscriptionStatus}</p>
              <p className="mt-1 text-sm text-slate-100">current access state for this tenant</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/12 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Collected</p>
              <p className="mt-3 text-2xl font-semibold">{formatCurrencyInr(totals?.collected ?? 0)}</p>
              <p className="mt-1 text-sm text-slate-100">successful payment value captured</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/12 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100">Storage Used</p>
              <p className="mt-3 text-2xl font-semibold">{profile.storage ? formatStorage(profile.storage.usedBytes) : "0 B"}</p>
              <p className="mt-1 text-sm text-slate-100">current usage footprint for this tenant</p>
            </div>
          </div>
        }
      />

      {error ? <SuperAdminPanel className="border-rose-200 bg-rose-50/90 text-rose-700">{error}</SuperAdminPanel> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SuperAdminStatCard label="Status" value={profile.school.subscriptionStatus} detail="Current commercial access state" accent="sky" />
        <SuperAdminStatCard label="Plan" value={profile.school.subscriptionPlan ?? "-"} detail="Assigned subscription package" accent="emerald" />
        <SuperAdminStatCard label="Collected Revenue" value={formatCurrencyInr(totals?.collected ?? 0)} detail="Successful payment value for this tenant" accent="amber" />
        <SuperAdminStatCard label="Storage Used" value={profile.storage ? formatStorage(profile.storage.usedBytes) : "0 B"} detail="Measured tenant storage footprint" accent="slate" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SuperAdminPanel>
          <SuperAdminSectionHeading eyebrow="Tenant identity" title="School overview" description="Core contact, plan, and admin ownership details." />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div><p className="text-sm text-slate-500">School Email</p><p className="mt-1 text-sm font-medium text-slate-900">{profile.school.email ?? "-"}</p></div>
            <div><p className="text-sm text-slate-500">Phone</p><p className="mt-1 text-sm font-medium text-slate-900">{profile.school.phone ?? "-"}</p></div>
            <div><p className="text-sm text-slate-500">Address</p><p className="mt-1 text-sm font-medium text-slate-900">{profile.school.address ?? "-"}</p></div>
            <div><p className="text-sm text-slate-500">Expiry</p><p className="mt-1 text-sm font-medium text-slate-900">{formatDate(profile.school.expiryDate)}</p></div>
            <div><p className="text-sm text-slate-500">Admin Name</p><p className="mt-1 text-sm font-medium text-slate-900">{profile.adminName ?? "-"}</p></div>
            <div><p className="text-sm text-slate-500">Admin Login</p><p className="mt-1 text-sm font-medium text-slate-900">{profile.adminEmail ?? "-"}</p></div>
          </div>
        </SuperAdminPanel>

        <SuperAdminPanel>
          <SuperAdminSectionHeading eyebrow="Capacity" title="Storage health" description="Current usage against configured limits and billing context." />
          {profile.storage ? (
            <div className="mt-5 space-y-4">
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(4, profile.storage.usagePercent ?? 0)}%` }} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {profile.storage.usagePercent !== null ? `${profile.storage.usagePercent}% of configured limit` : "No limit configured"}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm text-slate-500">Used</p><p className="mt-1 font-medium text-slate-900">{formatStorage(profile.storage.usedBytes)}</p></div>
                <div><p className="text-sm text-slate-500">Limit</p><p className="mt-1 font-medium text-slate-900">{profile.storage.storageLimitMb != null ? `${profile.storage.storageLimitMb} MB` : "Not set"}</p></div>
                <div><p className="text-sm text-slate-500">Files</p><p className="mt-1 font-medium text-slate-900">{profile.storage.fileCount}</p></div>
                <div><p className="text-sm text-slate-500">Latest Billing</p><p className="mt-1 font-medium text-slate-900">{formatCurrencyInr(profile.storage.latestPaymentAmount)}</p></div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No storage data available yet.</p>
          )}
        </SuperAdminPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SuperAdminPanel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-950">Recent Payments</h2>
            <Link to="/super-admin/payments" className="text-sm font-semibold text-brand-700">Open ledger</Link>
          </div>
          <div className="mt-5 space-y-3">
            {profile.payments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{formatCurrencyInr(payment.amount)}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${payment.status === "Failed" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {payment.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{payment.paymentMethod ?? "Manual"} • {formatDate(payment.paymentDate)}</p>
              </div>
            ))}
          </div>
        </SuperAdminPanel>

        <SuperAdminPanel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-950">Subscription History</h2>
            <Link to="/super-admin/billing" className="text-sm font-semibold text-brand-700">Open billing</Link>
          </div>
          <div className="mt-5 space-y-3">
            {profile.subscriptions.slice(0, 5).map((subscription) => (
              <div key={subscription.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-900">{subscription.planName ?? "Custom Plan"}</p>
                <p className="mt-1 text-sm text-slate-500">{formatCurrencyInr(subscription.amount)} • {formatDate(subscription.endDate)}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{subscription.status}</p>
              </div>
            ))}
          </div>
        </SuperAdminPanel>
      </div>

      <Card className="rounded-[2rem] border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Action History</h2>
            <p className="mt-1 text-sm text-slate-500">Superadmin edits, deletes, billing changes, and access actions for this school.</p>
          </div>
          <Link to="/super-admin/audit-logs" className="text-sm font-semibold text-brand-700">All logs</Link>
        </div>
        <div className="mt-5 space-y-3">
          {profile.auditLogs.length > 0 ? (
            profile.auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-slate-900">{log.action} {moduleLabel(log.module)}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-500">By {log.userName}</p>
                {log.recordId ? <p className="mt-1 break-all text-xs text-slate-500">Record: {log.recordId}</p> : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No action history yet for this school.
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit School"
        description="Update school details, billing state, and access status."
        maxWidthClass="max-w-3xl"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <Input label="School Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            <Input label="Email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            <Input label="Address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
            <Input label="Plan" value={form.subscriptionPlan} onChange={(event) => setForm((current) => ({ ...current, subscriptionPlan: event.target.value }))} />
            <Input label="Storage Limit (MB)" type="number" min="0" value={form.storageLimit} onChange={(event) => setForm((current) => ({ ...current, storageLimit: event.target.value }))} />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
              <select value={form.subscriptionStatus} onChange={(event) => setForm((current) => ({ ...current, subscriptionStatus: event.target.value as SchoolUpdateValues["subscriptionStatus"] }))} className="erp-select">
                <option value="Trial">Trial</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Suspended">Suspended</option>
              </select>
            </label>
            <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))} />
          </div>

          {formError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 sm:w-auto" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      <SuperAdminMobileActionBar
        actions={[
          { label: "Back to Schools", to: "/super-admin/schools" },
          { label: "Billing", to: "/super-admin/billing" },
        ]}
      />
    </SuperAdminWorkspace>
  );
};

export default SuperAdminSchoolProfilePage;
