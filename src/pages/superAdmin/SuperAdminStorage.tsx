import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
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
import { listSchoolStorage, listSchools, updateSchool } from "../../services/saasService";
import type { SchoolRecord, SchoolStorageRecord, SchoolUpdateValues } from "../../types/saas";

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

const formatLimit = (limitMb: number | null) => (limitMb && limitMb > 0 ? `${limitMb.toLocaleString("en-IN")} MB` : "Not set");

export const SuperAdminStoragePage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SchoolStorageRecord[]>([]);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<Pick<SchoolUpdateValues, "storageLimit">>({ storageLimit: "" });
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("usage");
  const [modal, setModal] = useState<{ open: boolean; mode: "view" | "edit"; row: SchoolStorageRecord | null }>({
    open: false,
    mode: "view",
    row: null,
  });

  const load = async () => {
    const [storageRows, schoolRows] = await Promise.all([listSchoolStorage(), listSchools()]);
    setRows(storageRows);
    setSchools(schoolRows);
    setError("");
  };

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load school storage.");
    });
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: "view", row: null });
    setForm({ storageLimit: "" });
    setFormError("");
  };

  const openView = (row: SchoolStorageRecord) => {
    setModal({ open: true, mode: "view", row });
    setFormError("");
  };

  const openEdit = (row: SchoolStorageRecord) => {
    setForm({ storageLimit: row.storageLimitMb != null ? String(row.storageLimitMb) : "" });
    setModal({ open: true, mode: "edit", row });
    setFormError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal.row) return;

    setSaving(true);
    setFormError("");
    try {
      const school = schools.find((item) => item.id === modal.row?.schoolId);
      if (!school) {
        throw new Error("School details not found.");
      }

      await updateSchool(modal.row.schoolId, {
        name: school.name,
        email: school.email ?? "",
        phone: school.phone ?? "",
        address: school.address ?? "",
        subscriptionPlan: school.subscriptionPlan ?? "",
        subscriptionStatus: modal.row.subscriptionStatus,
        storageLimit: form.storageLimit,
        expiryDate: school.expiryDate ?? "",
      });
      closeModal();
      await load();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Unable to update storage limit.");
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const totalUsedBytes = rows.reduce((sum, row) => sum + row.usedBytes, 0);
    const totalFiles = rows.reduce((sum, row) => sum + row.fileCount, 0);
    const schoolsNearLimit = rows.filter((row) => (row.usagePercent ?? 0) >= 80).length;

    return {
      totalUsedBytes,
      totalFiles,
      schoolsNearLimit,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const nextRows = rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [row.schoolName, row.subscriptionPlan, row.subscriptionStatus]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesUsage =
        usageFilter === "all" ||
        (usageFilter === "near-limit" && (row.usagePercent ?? 0) >= 80) ||
        (usageFilter === "no-limit" && row.storageLimitMb == null);
      const matchesStatus = statusFilter === "all" || row.subscriptionStatus === statusFilter;
      return matchesQuery && matchesUsage && matchesStatus;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "name") return left.schoolName.localeCompare(right.schoolName);
      if (sortBy === "files") return right.fileCount - left.fileCount;
      if (sortBy === "latest-billing") return String(right.latestPaymentDate ?? "").localeCompare(String(left.latestPaymentDate ?? ""));
      return (right.usagePercent ?? 0) - (left.usagePercent ?? 0);
    });
  }, [query, rows, sortBy, statusFilter, usageFilter]);

  return (
    <SuperAdminWorkspace className="pb-24 md:pb-0">
      <SuperAdminHero
        eyebrow="Storage monitor"
        title="See capacity risk before it turns into a tenant problem."
        description="Review usage, file volume, and configured limits across every school from a cleaner operational storage dashboard."
        aside={
          <SuperAdminHeroMetricGrid>
            <SuperAdminHeroMetricCard label="Total Used" value={formatStorage(summary.totalUsedBytes)} detail="storage consumed across the network" labelClassName="text-sky-100" />
            <SuperAdminHeroMetricCard label="Tracked Files" value={summary.totalFiles} detail="stored objects in monitored buckets" labelClassName="text-emerald-100" />
            <SuperAdminHeroMetricCard label="Near Limit" value={summary.schoolsNearLimit} detail="schools approaching configured limits" labelClassName="text-amber-100" />
          </SuperAdminHeroMetricGrid>
        }
      />

      <SuperAdminCompactStatGrid>
        <SuperAdminStatCard label="Used Capacity" value={formatStorage(summary.totalUsedBytes)} detail="Total measured storage footprint" accent="sky" />
        <SuperAdminStatCard label="Tracked Files" value={summary.totalFiles} detail="Objects currently tracked in storage" accent="emerald" />
        <SuperAdminStatCard label="Near Limit" value={summary.schoolsNearLimit} detail="Schools that need attention soon" accent="amber" />
      </SuperAdminCompactStatGrid>

      <SuperAdminPanel>
        <SuperAdminSectionHeading
          eyebrow="Capacity controls"
          title="Storage usage search"
          description="Filter by plan, status, and usage pressure, then adjust limits right from the monitor."
        />

        <div className="superadmin-filter-grid">
          <Input label="Search" placeholder="Search school or plan" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Usage filter</span>
            <select value={usageFilter} onChange={(event) => setUsageFilter(event.target.value)} className="erp-select">
              <option value="all">All schools</option>
              <option value="near-limit">Near limit</option>
              <option value="no-limit">No configured limit</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="erp-select">
              <option value="all">All statuses</option>
              <option value="Trial">Trial</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Suspended">Suspended</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="erp-select">
              <option value="usage">Highest usage</option>
              <option value="files">Most files</option>
              <option value="latest-billing">Latest billing</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>

        {error ? <p className="mt-6 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 space-y-3 md:hidden">
          {filteredRows.map((row) => (
            <div key={row.schoolId} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{row.schoolName}</p>
                    <p className="text-sm text-slate-500">{row.subscriptionPlan ?? "-"}</p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${(row.usagePercent ?? 0) >= 80 ? "bg-amber-100 text-amber-700" : "bg-slate-900 text-white"}`}>
                    {(row.usagePercent ?? 0) >= 80 ? "Near Limit" : row.subscriptionStatus}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(4, row.usagePercent ?? 0)}%` }} />
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    {row.usagePercent !== null ? `${row.usagePercent}% of configured limit` : "No limit configured"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Storage Used</p>
                    <p className="mt-1 text-sm text-slate-700">{formatStorage(row.usedBytes)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Limit</p>
                    <p className="mt-1 text-sm text-slate-700">{formatLimit(row.storageLimitMb)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Files</p>
                    <p className="mt-1 text-sm text-slate-700">{row.fileCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest Billing</p>
                    <p className="mt-1 text-sm text-slate-700">{formatCurrencyInr(row.latestPaymentAmount)}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => openView(row)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">View</button>
                  <button type="button" onClick={() => navigate(`/super-admin/storage/${row.schoolId}/edit`)} className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50">Edit Limit</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="superadmin-table-shell hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">School</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Storage Used</th>
                <th className="px-4 py-3 font-semibold">Limit</th>
                <th className="px-4 py-3 font-semibold">Files</th>
                <th className="px-4 py-3 font-semibold">Usage</th>
                <th className="px-4 py-3 font-semibold">Latest Billing</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.schoolId} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div>
                      <p>{row.schoolName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{row.subscriptionStatus}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.subscriptionPlan ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatStorage(row.usedBytes)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatLimit(row.storageLimitMb)}</td>
                  <td className="px-4 py-3 text-slate-600">{row.fileCount}</td>
                  <td className="px-4 py-3">
                    <div className="w-40">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(4, row.usagePercent ?? 0)}%` }} />
                      </div>
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {row.usagePercent !== null ? `${row.usagePercent}% of configured limit` : "No limit configured"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>
                      <p>{formatCurrencyInr(row.latestPaymentAmount)}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.latestPaymentDate ?? "-"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openView(row)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">View</button>
                      <button type="button" onClick={() => navigate(`/super-admin/storage/${row.schoolId}/edit`)} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No school storage data found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SuperAdminPanel>

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.mode === "view" ? "Storage Details" : "Edit Storage Limit"}
        description="Review actual backend usage and adjust the configured storage limit."
        maxWidthClass="max-w-3xl"
      >
        {modal.mode === "view" && modal.row ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">School</p><p className="mt-2 font-semibold text-slate-900">{modal.row.schoolName}</p></Card>
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Plan</p><p className="mt-2 font-semibold text-slate-900">{modal.row.subscriptionPlan ?? "-"}</p></Card>
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Total Used</p><p className="mt-2 font-semibold text-slate-900">{formatStorage(modal.row.usedBytes)}</p></Card>
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Configured Limit</p><p className="mt-2 font-semibold text-slate-900">{formatLimit(modal.row.storageLimitMb)}</p></Card>
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Database Usage</p><p className="mt-2 font-semibold text-slate-900">{formatStorage(modal.row.databaseBytes)}</p></Card>
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Storage Objects</p><p className="mt-2 font-semibold text-slate-900">{formatStorage(modal.row.objectBytes)}</p></Card>
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Tracked DB Rows</p><p className="mt-2 font-semibold text-slate-900">{modal.row.databaseRowCount}</p></Card>
            <Card className="border-slate-200 bg-slate-50 shadow-none"><p className="text-sm text-slate-500">Tracked Files</p><p className="mt-2 font-semibold text-slate-900">{modal.row.fileCount}</p></Card>
          </div>
        ) : null}

        {modal.mode === "edit" && modal.row ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input label="Storage Limit (MB)" type="number" min="0" value={form.storageLimit} onChange={(event) => setForm({ storageLimit: event.target.value })} required />

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
          { label: "Schools", to: "/super-admin/schools" },
          { label: "Audit Logs", to: "/super-admin/audit-logs" },
        ]}
      />
    </SuperAdminWorkspace>
  );
};

export default SuperAdminStoragePage;
