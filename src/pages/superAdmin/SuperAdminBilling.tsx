import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  SuperAdminCompactStatGrid,
  SuperAdminHero,
  SuperAdminHeroMetricCard,
  SuperAdminHeroMetricGrid,
  SuperAdminPanel,
  SuperAdminSectionHeading,
  SuperAdminStatCard,
  SuperAdminWorkspace,
} from "../../components/superAdmin/SuperAdminDesign";
import SuperAdminMobileActionBar from "../../components/superAdmin/SuperAdminMobileActionBar";
import { deleteSchoolBilling, listBillingRows, updateSchoolBilling } from "../../services/saasService";
import type { BillingRow, BillingUpdateValues } from "../../types/saas";

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

const daysUntil = (value: string | null) => {
  if (!value) return null;
  const today = new Date();
  const target = new Date(value);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

export const SuperAdminBillingPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<BillingUpdateValues>({ planName: "", amount: "", status: "Trial", expiryDate: "" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [renewalFilter, setRenewalFilter] = useState("all");
  const [sortBy, setSortBy] = useState("expiry");
  const [modal, setModal] = useState<{ open: boolean; mode: "view" | "edit"; row: BillingRow | null }>({
    open: false,
    mode: "view",
    row: null,
  });

  const load = async () => {
    setRows(await listBillingRows());
    setError("");
  };

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load billing data.");
    });
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: "view", row: null });
    setForm({ planName: "", amount: "", status: "Trial", expiryDate: "" });
    setFormError("");
  };

  const openView = (row: BillingRow) => {
    setModal({ open: true, mode: "view", row });
    setFormError("");
  };

  const openEdit = (row: BillingRow) => {
    setForm({
      planName: row.planName ?? "",
      amount: String(row.amount),
      status: row.status,
      expiryDate: row.expiryDate ?? "",
    });
    setModal({ open: true, mode: "edit", row });
    setFormError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal.row) return;

    setSaving(true);
    setFormError("");
    try {
      await updateSchoolBilling(modal.row.schoolId, form);
      closeModal();
      await load();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Unable to update billing.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: BillingRow) => {
    if (!window.confirm(`Delete billing setup for "${row.schoolName}"? Payment history will remain, but subscription settings will be cleared.`)) return;
    try {
      await deleteSchoolBilling(row.schoolId);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete billing.");
    }
  };

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const nextRows = rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [row.schoolName, row.planName, row.status].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const reminderDays = daysUntil(row.expiryDate);
      const matchesReminder =
        renewalFilter === "all" ||
        (renewalFilter === "renewal" && reminderDays !== null && reminderDays >= 0 && reminderDays <= 14) ||
        (renewalFilter === "expired" && row.status === "Expired");
      return matchesQuery && matchesStatus && matchesReminder;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "newest") return String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
      if (sortBy === "amount") return right.amount - left.amount;
      if (sortBy === "expired-first") return Number(right.status === "Expired") - Number(left.status === "Expired");
      if (sortBy === "active-first") return Number(right.status === "Active") - Number(left.status === "Active");
      return String(left.expiryDate ?? "").localeCompare(String(right.expiryDate ?? ""));
    });
  }, [query, renewalFilter, rows, sortBy, statusFilter]);

  const remindersDue = rows.filter((row) => {
    const value = daysUntil(row.expiryDate);
    return value !== null && value >= 0 && value <= 14;
  }).length;
  const expiredCount = rows.filter((row) => row.status === "Expired").length;
  const activeCount = rows.filter((row) => row.status === "Active").length;

  return (
    <SuperAdminWorkspace className="pb-24 md:pb-0">
      <SuperAdminHero
        eyebrow="Subscription billing"
        title="Keep subscription revenue disciplined, visible, and renewal-ready."
        description="Review every school billing record through a cleaner commercial workspace built for renewals, exceptions, and quick plan changes."
        actions={
          <Link to="/super-admin/billing/new" className="w-full sm:w-auto">
            <Button className="w-full rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-300 to-cyan-300 px-5 text-slate-950 shadow-lg shadow-sky-900/20 hover:from-sky-200 hover:to-cyan-200 sm:w-auto">
              + Add Payment
            </Button>
          </Link>
        }
        aside={
          <SuperAdminHeroMetricGrid>
            <SuperAdminHeroMetricCard label="Active Plans" value={activeCount} detail="currently serving paying tenants" labelClassName="text-sky-100" />
            <SuperAdminHeroMetricCard label="Reminders" value={remindersDue} detail="subscriptions expiring within 14 days" labelClassName="text-amber-100" />
            <SuperAdminHeroMetricCard label="Expired" value={expiredCount} detail="accounts needing recovery action" labelClassName="text-rose-100" />
          </SuperAdminHeroMetricGrid>
        }
      />

      <SuperAdminCompactStatGrid>
        <SuperAdminStatCard label="All Billing Rows" value={rows.length} detail="Tracked subscription records" accent="sky" />
        <SuperAdminStatCard label="Renewals Due" value={remindersDue} detail="Upcoming renewals needing follow-up" accent="amber" />
        <SuperAdminStatCard label="Expired Accounts" value={expiredCount} detail="Schools at risk of access interruption" accent="rose" />
      </SuperAdminCompactStatGrid>

      <SuperAdminPanel>
        <SuperAdminSectionHeading
          eyebrow="Revenue controls"
          title="Billing workspace"
          description="Filter by status, isolate expiring plans, and update pricing or validity windows without leaving the screen."
        />

        <div className="dashboard-filter-grid">
          <Input label="Search" placeholder="Search school or plan" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="ui-select">
              <option value="all">All statuses</option>
              <option value="Trial">Trial</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Suspended">Suspended</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Reminder filter</span>
            <select value={renewalFilter} onChange={(event) => setRenewalFilter(event.target.value)} className="ui-select">
              <option value="all">All records</option>
              <option value="renewal">Renewal due in 14 days</option>
              <option value="expired">Expired only</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="ui-select">
              <option value="expiry">Expiry date</option>
              <option value="newest">Newest</option>
              <option value="amount">Highest amount</option>
              <option value="expired-first">Expired first</option>
              <option value="active-first">Active first</option>
            </select>
          </label>
        </div>

        <div className="inline-banner mt-4 border-amber-200 bg-amber-50/90 text-amber-800">
          {remindersDue} billing reminder{remindersDue === 1 ? "" : "s"} due in the next 14 days.
        </div>

        {error ? <p className="mt-6 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 space-y-3 md:hidden">
          {filteredRows.map((row) => {
            const reminderDays = daysUntil(row.expiryDate);

            return (
              <div key={row.schoolId} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{row.schoolName}</p>
                      <p className="text-sm text-slate-500">{row.planName ?? "-"}</p>
                    </div>
                    <span className="w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{row.status}</span>
                  </div>

                  {reminderDays !== null && reminderDays >= 0 && reminderDays <= 14 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      Renewal reminder: expires in {reminderDays} day{reminderDays === 1 ? "" : "s"}.
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Amount</p>
                      <p className="mt-1 text-sm text-slate-700">{formatCurrencyInr(row.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Expiry</p>
                      <p className="mt-1 text-sm text-slate-700">{formatDate(row.expiryDate)}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <button type="button" onClick={() => openView(row)} className="page-action-button">View</button>
                    <button type="button" onClick={() => navigate(`/super-admin/billing/${row.schoolId}/edit`)} className="page-action-button page-action-button-warning">Edit</button>
                    <button type="button" onClick={() => void handleDelete(row)} className="page-action-button page-action-button-danger">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="dashboard-table-shell hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">School</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Expiry</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const reminderDays = daysUntil(row.expiryDate);

                return (
                  <tr key={row.schoolId} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>
                        <p>{row.schoolName}</p>
                        {reminderDays !== null && reminderDays >= 0 && reminderDays <= 14 ? (
                          <p className="mt-1 text-xs font-medium text-amber-700">Renew in {reminderDays} days</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.planName ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrencyInr(row.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{row.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.expiryDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openView(row)} className="page-action-button text-xs">View</button>
                        <button type="button" onClick={() => navigate(`/super-admin/billing/${row.schoolId}/edit`)} className="page-action-button page-action-button-warning text-xs">Edit</button>
                        <button type="button" onClick={() => void handleDelete(row)} className="page-action-button page-action-button-danger text-xs">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SuperAdminPanel>

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.mode === "view" ? "Billing Details" : "Edit Billing"}
        description="Review or update the billing summary for a school."
        maxWidthClass="max-w-2xl"
      >
        {modal.mode === "view" && modal.row ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">School</p><p className="mt-2 font-semibold text-slate-900">{modal.row.schoolName}</p></Card>
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Plan</p><p className="mt-2 font-semibold text-slate-900">{modal.row.planName ?? "-"}</p></Card>
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Amount</p><p className="mt-2 font-semibold text-slate-900">{formatCurrencyInr(modal.row.amount)}</p></Card>
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Expiry</p><p className="mt-2 font-semibold text-slate-900">{formatDate(modal.row.expiryDate)}</p></Card>
          </div>
        ) : null}

        {modal.mode === "edit" && modal.row ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <Input label="Plan Name" value={form.planName} onChange={(event) => setForm((current) => ({ ...current, planName: event.target.value }))} required />
              <Input label="Amount" type="number" min="0" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BillingUpdateValues["status"] }))} className="ui-select">
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
              <Button type="button" variant="ghost" className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 sm:w-auto" onClick={closeModal}>Cancel</Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <SuperAdminMobileActionBar
        actions={[
          { label: "Add Payment", to: "/super-admin/billing/new" },
          { label: "Schools", to: "/super-admin/schools" },
        ]}
      />
    </SuperAdminWorkspace>
  );
};

export default SuperAdminBillingPage;
