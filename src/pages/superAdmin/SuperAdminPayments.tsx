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
import { deletePayment, listPayments, listSchools, updatePayment } from "../../services/saasService";
import type { PaymentUpdateValues } from "../../types/saas";

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

type PaymentRowView = {
  id: string;
  schoolId: string;
  schoolName: string;
  amount: number;
  method: string;
  date: string;
  status: "Success" | "Failed";
  createdAt: string | null;
};

export const SuperAdminPaymentsPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PaymentRowView[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<PaymentUpdateValues>({ amount: "", paymentMethod: "", paymentDate: "", status: "Success" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [modal, setModal] = useState<{ open: boolean; mode: "view" | "edit"; row: PaymentRowView | null }>({
    open: false,
    mode: "view",
    row: null,
  });

  const load = async () => {
    const [payments, schools] = await Promise.all([listPayments(), listSchools()]);
    const schoolMap = new Map(schools.map((item) => [item.id, item.name]));
    setRows(
      payments.map((payment) => ({
        id: payment.id,
        schoolId: payment.schoolId,
        schoolName: schoolMap.get(payment.schoolId) ?? "Unknown school",
        amount: payment.amount,
        method: payment.paymentMethod ?? "-",
        date: payment.paymentDate ?? "-",
        status: payment.status,
        createdAt: payment.createdAt,
      })),
    );
    setError("");
  };

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load payments.");
    });
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: "view", row: null });
    setForm({ amount: "", paymentMethod: "", paymentDate: "", status: "Success" });
    setFormError("");
  };

  const openView = (row: PaymentRowView) => {
    setModal({ open: true, mode: "view", row });
    setFormError("");
  };

  const openEdit = (row: PaymentRowView) => {
    setForm({
      amount: String(row.amount),
      paymentMethod: row.method === "-" ? "" : row.method,
      paymentDate: row.date === "-" ? "" : row.date,
      status: row.status,
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
      await updatePayment(modal.row.id, form);
      closeModal();
      await load();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Unable to update payment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: PaymentRowView) => {
    if (!window.confirm(`Delete payment record for "${row.schoolName}"?`)) return;
    try {
      await deletePayment(row.id);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete payment.");
    }
  };

  const downloadReceipt = async (row: PaymentRowView) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("INDDIA ERP Payment Receipt", 20, 24);
    doc.setFontSize(11);
    doc.text(`Receipt ID: ${row.id}`, 20, 38);
    doc.text(`School: ${row.schoolName}`, 20, 48);
    doc.text(`Amount: ${formatCurrencyInr(row.amount)}`, 20, 58);
    doc.text(`Method: ${row.method}`, 20, 68);
    doc.text(`Payment Date: ${formatDate(row.date === "-" ? null : row.date)}`, 20, 78);
    doc.text(`Status: ${row.status}`, 20, 88);
    doc.text(`Generated: ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`, 20, 108);
    doc.text("This receipt was generated from the Super Admin payments ledger.", 20, 124);
    doc.save(`${row.schoolName.replace(/\s+/g, "-").toLowerCase()}-payment-receipt.pdf`);
  };

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const nextRows = rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [row.schoolName, row.method, row.status, row.id].some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesMethod = methodFilter === "all" || row.method === methodFilter;
      return matchesQuery && matchesStatus && matchesMethod;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "failed-first") return Number(right.status === "Failed") - Number(left.status === "Failed");
      if (sortBy === "success-first") return Number(right.status === "Success") - Number(left.status === "Success");
      if (sortBy === "amount") return right.amount - left.amount;
      return String(right.createdAt ?? right.date).localeCompare(String(left.createdAt ?? left.date));
    });
  }, [methodFilter, query, rows, sortBy, statusFilter]);

  const paymentMethods = useMemo(
    () => Array.from(new Set(rows.map((row) => row.method).filter((value) => value && value !== "-"))),
    [rows],
  );

  const failedPayments = rows.filter((row) => row.status === "Failed").length;
  const successfulPayments = rows.filter((row) => row.status === "Success").length;
  const totalCaptured = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <SuperAdminWorkspace className="pb-24 md:pb-0">
      <SuperAdminHero
        eyebrow="Payments ledger"
        title="Track every transaction with clearer financial signal."
        description="Use a more executive-grade ledger to inspect failed payments, filter by method, and generate receipts from a single polished workspace."
        actions={
          <Link to="/super-admin/billing/new" className="w-full sm:w-auto">
            <Button className="w-full rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-300 to-cyan-300 px-5 text-slate-950 shadow-lg shadow-sky-900/20 hover:from-sky-200 hover:to-cyan-200 sm:w-auto">
              + Add Payment
            </Button>
          </Link>
        }
        aside={
          <SuperAdminHeroMetricGrid>
            <SuperAdminHeroMetricCard label="Captured" value={formatCurrencyInr(totalCaptured)} detail="gross value across tracked payments" labelClassName="text-sky-100" />
            <SuperAdminHeroMetricCard label="Successful" value={successfulPayments} detail="payments completed successfully" labelClassName="text-emerald-100" />
            <SuperAdminHeroMetricCard label="Failed" value={failedPayments} detail="transactions requiring investigation" labelClassName="text-rose-100" />
          </SuperAdminHeroMetricGrid>
        }
      />

      <SuperAdminCompactStatGrid>
        <SuperAdminStatCard label="Ledger Rows" value={rows.length} detail="Total payment events on record" accent="sky" />
        <SuperAdminStatCard label="Successful" value={successfulPayments} detail="Payments processed cleanly" accent="emerald" />
        <SuperAdminStatCard label="Failed" value={failedPayments} detail="Exceptions needing action" accent="rose" />
      </SuperAdminCompactStatGrid>

      <SuperAdminPanel>
        <SuperAdminSectionHeading
          eyebrow="Transaction controls"
          title="Payment search and analysis"
          description="Slice the ledger by status, payment method, and amount priority without losing context."
        />

        <div className="dashboard-filter-grid">
          <Input label="Search" placeholder="Search school, method, status, or receipt id" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="ui-select">
              <option value="all">All statuses</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Method</span>
            <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} className="ui-select">
              <option value="all">All methods</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="ui-select">
              <option value="newest">Newest</option>
              <option value="failed-first">Failed first</option>
              <option value="success-first">Success first</option>
              <option value="amount">Highest amount</option>
            </select>
          </label>
        </div>

        <div className="inline-banner mt-4 border-rose-200 bg-rose-50/90 text-rose-700">
          {failedPayments} failed payment{failedPayments === 1 ? "" : "s"} need attention.
        </div>

        {error ? <p className="mt-6 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 space-y-3 md:hidden">
          {filteredRows.map((row) => (
            <div key={row.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-base font-semibold text-slate-900">{row.schoolName}</p>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${row.status === "Failed" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {row.status}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Amount</p>
                    <p className="mt-1 text-sm text-slate-700">{formatCurrencyInr(row.amount)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Method</p>
                    <p className="mt-1 text-sm text-slate-700">{row.method}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Date</p>
                    <p className="mt-1 text-sm text-slate-700">{formatDate(row.date === "-" ? null : row.date)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Receipt ID</p>
                    <p className="mt-1 break-all text-sm text-slate-700">{row.id}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => void downloadReceipt(row)} className="page-action-button">Download Receipt</button>
                  <button type="button" onClick={() => openView(row)} className="page-action-button">View</button>
                  <button type="button" onClick={() => navigate(`/super-admin/payments/${row.id}/edit`)} className="page-action-button page-action-button-warning">Edit</button>
                  <button type="button" onClick={() => void handleDelete(row)} className="page-action-button page-action-button-danger">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-table-shell hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">School</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.schoolName}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrencyInr(row.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{row.method}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(row.date === "-" ? null : row.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.status === "Failed" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void downloadReceipt(row)} className="page-action-button text-xs">Receipt</button>
                      <button type="button" onClick={() => openView(row)} className="page-action-button text-xs">View</button>
                        <button type="button" onClick={() => navigate(`/super-admin/payments/${row.id}/edit`)} className="page-action-button page-action-button-warning text-xs">Edit</button>
                      <button type="button" onClick={() => void handleDelete(row)} className="page-action-button page-action-button-danger text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SuperAdminPanel>

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.mode === "view" ? "Payment Details" : "Edit Payment"}
        description="Review or update platform payment records."
        maxWidthClass="max-w-2xl"
      >
        {modal.mode === "view" && modal.row ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">School</p><p className="mt-2 font-semibold text-slate-900">{modal.row.schoolName}</p></Card>
              <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Amount</p><p className="mt-2 font-semibold text-slate-900">{formatCurrencyInr(modal.row.amount)}</p></Card>
              <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Method</p><p className="mt-2 font-semibold text-slate-900">{modal.row.method}</p></Card>
              <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Date</p><p className="mt-2 font-semibold text-slate-900">{formatDate(modal.row.date === "-" ? null : modal.row.date)}</p></Card>
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                if (!modal.row) return;
                void downloadReceipt(modal.row);
              }}
            >
              Download Receipt PDF
            </Button>
          </div>
        ) : null}

        {modal.mode === "edit" && modal.row ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <Input label="Amount" type="number" min="0" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
              <Input label="Method" value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} />
              <Input label="Payment Date" type="date" value={form.paymentDate} onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PaymentUpdateValues["status"] }))} className="ui-select">
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                </select>
              </label>
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
          { label: "Billing", to: "/super-admin/billing" },
        ]}
      />
    </SuperAdminWorkspace>
  );
};

export default SuperAdminPaymentsPage;
