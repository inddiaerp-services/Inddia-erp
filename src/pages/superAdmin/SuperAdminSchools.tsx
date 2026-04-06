import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { deleteSchool, listSchools, updateSchool } from "../../services/saasService";
import type { SchoolRecord, SchoolUpdateValues } from "../../types/saas";

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

const daysUntil = (value: string | null) => {
  if (!value) return null;
  const today = new Date();
  const target = new Date(value);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

const statusTone = (status: SchoolRecord["subscriptionStatus"]) => {
  if (status === "Active") return "bg-emerald-100 text-emerald-700";
  if (status === "Expired") return "bg-rose-100 text-rose-700";
  if (status === "Suspended") return "bg-amber-100 text-amber-700";
  return "bg-slate-900 text-white";
};

export const SuperAdminSchoolsPage = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<SchoolUpdateValues>(emptyForm);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [modal, setModal] = useState<{ open: boolean; school: SchoolRecord | null }>({
    open: false,
    school: null,
  });

  const loadSchools = async () => {
    const rows = await listSchools();
    setSchools(rows);
    setError("");
  };

  useEffect(() => {
    void loadSchools().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load schools.");
    });
  }, []);

  const closeModal = () => {
    setModal({ open: false, school: null });
    setForm(emptyForm);
    setFormError("");
  };

  const openEdit = (school: SchoolRecord) => {
    setForm({
      name: school.name,
      email: school.email ?? "",
      phone: school.phone ?? "",
      address: school.address ?? "",
      subscriptionPlan: school.subscriptionPlan ?? "",
      subscriptionStatus: school.subscriptionStatus,
      storageLimit: school.storageLimit != null ? String(school.storageLimit) : "",
      expiryDate: school.expiryDate ?? "",
    });
    setModal({ open: true, school });
    setFormError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal.school) return;

    setSaving(true);
    setFormError("");
    try {
      await updateSchool(modal.school.id, form);
      closeModal();
      await loadSchools();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Unable to update school.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (school: SchoolRecord) => {
    if (!window.confirm(`Delete school "${school.name}"? This will remove all related school data.`)) return;
    try {
      await deleteSchool(school.id);
      await loadSchools();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete school.");
    }
  };

  const handleToggleSuspend = async (school: SchoolRecord) => {
    const nextStatus = school.subscriptionStatus === "Suspended" ? "Active" : "Suspended";
    const confirmed = window.confirm(
      nextStatus === "Suspended"
        ? `Suspend access for "${school.name}" right now? Users from this school will be blocked until you restore access.`
        : `Restore access for "${school.name}"?`,
    );

    if (!confirmed) return;

    try {
      await updateSchool(school.id, {
        name: school.name,
        email: school.email ?? "",
        phone: school.phone ?? "",
        address: school.address ?? "",
        subscriptionPlan: school.subscriptionPlan ?? "",
        subscriptionStatus: nextStatus,
        storageLimit: school.storageLimit != null ? String(school.storageLimit) : "",
        expiryDate: school.expiryDate ?? "",
      });
      await loadSchools();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update school access.");
    }
  };

  const filteredSchools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const rows = schools.filter((school) => {
      const matchesQuery =
        !normalizedQuery ||
        [school.name, school.email, school.adminEmail, school.subscriptionPlan]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      const matchesStatus = statusFilter === "all" || school.subscriptionStatus === statusFilter;
      const renewalDays = daysUntil(school.expiryDate);
      const matchesAccess =
        accessFilter === "all" ||
        (accessFilter === "renewal" && renewalDays !== null && renewalDays >= 0 && renewalDays <= 14) ||
        (accessFilter === "suspended" && school.subscriptionStatus === "Suspended");

      return matchesQuery && matchesStatus && matchesAccess;
    });

    return rows.sort((left, right) => {
      if (sortBy === "name") return left.name.localeCompare(right.name);
      if (sortBy === "expiry") return String(left.expiryDate ?? "").localeCompare(String(right.expiryDate ?? ""));
      if (sortBy === "expired-first") {
        return Number(right.subscriptionStatus === "Expired") - Number(left.subscriptionStatus === "Expired");
      }
      if (sortBy === "active-first") {
        return Number(right.subscriptionStatus === "Active") - Number(left.subscriptionStatus === "Active");
      }
      return String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
    });
  }, [accessFilter, query, schools, sortBy, statusFilter]);

  const summary = useMemo(
    () => ({
      total: schools.length,
      suspended: schools.filter((school) => school.subscriptionStatus === "Suspended").length,
      renewalsDue: schools.filter((school) => {
        const value = daysUntil(school.expiryDate);
        return value !== null && value >= 0 && value <= 14;
      }).length,
    }),
    [schools],
  );

  return (
    <SuperAdminWorkspace className="pb-24 md:pb-0">
      <SuperAdminHero
        eyebrow="School registry"
        title="Manage every tenant school from one polished control surface."
        description="Search the network, review renewal pressure, suspend access instantly, and move into each school profile with a cleaner operating flow."
        actions={
          <Link to="/super-admin/schools/new" className="w-full sm:w-auto">
            <Button className="w-full rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-300 to-cyan-300 px-5 text-slate-950 shadow-lg shadow-sky-900/20 hover:from-sky-200 hover:to-cyan-200 sm:w-auto">
              + Add School
            </Button>
          </Link>
        }
        aside={
          <SuperAdminHeroMetricGrid>
            <SuperAdminHeroMetricCard label="Directory" value={summary.total} detail="schools currently managed" labelClassName="text-sky-100" />
            <SuperAdminHeroMetricCard label="Renewals" value={summary.renewalsDue} detail="accounts expiring within 14 days" labelClassName="text-amber-100" />
            <SuperAdminHeroMetricCard label="Suspended" value={summary.suspended} detail="schools with access paused" labelClassName="text-rose-100" />
          </SuperAdminHeroMetricGrid>
        }
      />

      <SuperAdminCompactStatGrid>
        <SuperAdminStatCard label="All Schools" value={summary.total} detail="Full tenant count across the registry" accent="sky" />
        <SuperAdminStatCard label="Renewal Queue" value={summary.renewalsDue} detail="Workspaces approaching expiry" accent="amber" />
        <SuperAdminStatCard label="Suspended Access" value={summary.suspended} detail="Schools currently blocked from access" accent="rose" />
      </SuperAdminCompactStatGrid>

      <SuperAdminPanel>
        <SuperAdminSectionHeading
          eyebrow="Directory controls"
          title="Search, filter, and prioritize"
          description="Cut through the tenant list quickly with status, renewal, and lifecycle filters."
        />

        <div className="dashboard-filter-grid">
          <Input label="Search" placeholder="Search school, email, admin, or plan" value={query} onChange={(event) => setQuery(event.target.value)} />
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
            <span className="mb-2 block text-sm font-medium text-slate-700">Quick filter</span>
            <select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value)} className="ui-select">
              <option value="all">All schools</option>
              <option value="renewal">Renewal due in 14 days</option>
              <option value="suspended">Suspended only</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="ui-select">
              <option value="newest">Newest</option>
              <option value="name">Name</option>
              <option value="expiry">Expiry date</option>
              <option value="expired-first">Expired first</option>
              <option value="active-first">Active first</option>
            </select>
          </label>
        </div>

        {error ? <p className="mt-6 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 space-y-3 md:hidden">
          {filteredSchools.map((school) => {
            const renewalDays = daysUntil(school.expiryDate);

            return (
              <div key={school.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{school.name}</p>
                      <p className="text-sm text-slate-500">{school.subscriptionPlan ?? "No plan assigned"}</p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusTone(school.subscriptionStatus)}`}>
                      {school.subscriptionStatus}
                    </span>
                  </div>

                  {renewalDays !== null && renewalDays >= 0 && renewalDays <= 14 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      Renewal reminder: expires in {renewalDays} day{renewalDays === 1 ? "" : "s"}.
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">School Email</p>
                      <p className="mt-1 break-words text-sm text-slate-700">{school.email ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Admin Login</p>
                      <p className="mt-1 break-words text-sm text-slate-700">{school.adminEmail ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Expiry</p>
                      <p className="mt-1 text-sm text-slate-700">{formatDate(school.expiryDate)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Created</p>
                      <p className="mt-1 text-sm text-slate-700">{formatDate(school.createdAt)}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => navigate(`/super-admin/schools/${school.id}`)} className="page-action-button">
                      Open Profile
                    </button>
                    <button type="button" onClick={() => navigate(`/super-admin/schools/${school.id}/edit`)} className="page-action-button page-action-button-warning">
                      Edit
                    </button>
                    <button type="button" onClick={() => void handleToggleSuspend(school)} className="page-action-button">
                      {school.subscriptionStatus === "Suspended" ? "Restore Access" : "Suspend Access"}
                    </button>
                    <button type="button" onClick={() => void handleDelete(school)} className="page-action-button page-action-button-danger">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredSchools.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No schools match the current filters.
            </div>
          ) : null}
        </div>

        <div className="dashboard-table-shell hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">School Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Admin Login</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Expiry</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.map((school) => {
                const renewalDays = daysUntil(school.expiryDate);

                return (
                  <tr key={school.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>
                        <p>{school.name}</p>
                        {renewalDays !== null && renewalDays >= 0 && renewalDays <= 14 ? (
                          <p className="mt-1 text-xs font-medium text-amber-700">Renew in {renewalDays} days</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{school.email ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{school.adminEmail ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{school.subscriptionPlan ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(school.subscriptionStatus)}`}>
                        {school.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(school.expiryDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => navigate(`/super-admin/schools/${school.id}`)} className="page-action-button text-xs">
                          Profile
                        </button>
                        <button type="button" onClick={() => navigate(`/super-admin/schools/${school.id}/edit`)} className="page-action-button page-action-button-warning text-xs">
                          Edit
                        </button>
                        <button type="button" onClick={() => void handleToggleSuspend(school)} className="page-action-button text-xs">
                          {school.subscriptionStatus === "Suspended" ? "Restore" : "Suspend"}
                        </button>
                        <button type="button" onClick={() => void handleDelete(school)} className="page-action-button page-action-button-danger text-xs">
                          Delete
                        </button>
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
        title="Edit School"
        description="Update school details, billing state, and platform access."
        maxWidthClass="max-w-3xl"
      >
        {modal.school ? (
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
                <select value={form.subscriptionStatus} onChange={(event) => setForm((current) => ({ ...current, subscriptionStatus: event.target.value as SchoolUpdateValues["subscriptionStatus"] }))} className="ui-select">
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
          { label: "Add School", to: "/super-admin/schools/new" },
          { label: "Audit Logs", to: "/super-admin/audit-logs" },
        ]}
      />
    </SuperAdminWorkspace>
  );
};

export default SuperAdminSchoolsPage;
