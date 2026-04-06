import { useEffect, useMemo, useState } from "react";
import Input from "../../components/ui/Input";
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
import { listSuperAdminAuditLogs } from "../../services/saasService";
import type { SuperAdminAuditLogRecord } from "../../types/saas";

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const formatModule = (value: string) =>
  value
    .replace("SUPERADMIN_", "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const SuperAdminAuditLogsPage = () => {
  const [rows, setRows] = useState<SuperAdminAuditLogRecord[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  useEffect(() => {
    void listSuperAdminAuditLogs()
      .then((data) => {
        setRows(data);
        setError("");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load audit logs.");
      });
  }, []);

  const moduleOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.module))).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [row.schoolName, row.userName, row.module, row.action, row.recordId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesAction = actionFilter === "all" || row.action === actionFilter;
      const matchesModule = moduleFilter === "all" || row.module === moduleFilter;
      return matchesQuery && matchesAction && matchesModule;
    });
  }, [actionFilter, moduleFilter, query, rows]);
  const createCount = rows.filter((row) => row.action === "CREATE").length;
  const updateCount = rows.filter((row) => row.action === "UPDATE").length;
  const deleteCount = rows.filter((row) => row.action === "DELETE").length;

  return (
    <SuperAdminWorkspace className="pb-24 md:pb-0">
      <SuperAdminHero
        eyebrow="Platform history"
        title="Trace every critical superadmin action with clearer oversight."
        description="Review creates, updates, deletes, and high-impact changes through an audit interface that feels built for governance, not clutter."
        aside={
          <SuperAdminHeroMetricGrid>
            <SuperAdminHeroMetricCard label="Entries" value={rows.length} detail="logged platform history records" labelClassName="text-sky-100" />
            <SuperAdminHeroMetricCard label="Updates" value={updateCount} detail="change events currently visible" labelClassName="text-emerald-100" />
            <SuperAdminHeroMetricCard label="Deletes" value={deleteCount} detail="destructive actions on record" labelClassName="text-rose-100" />
          </SuperAdminHeroMetricGrid>
        }
      />

      <SuperAdminCompactStatGrid>
        <SuperAdminStatCard label="Created" value={createCount} detail="Creation events across modules" accent="sky" />
        <SuperAdminStatCard label="Updated" value={updateCount} detail="Modification actions on record" accent="emerald" />
        <SuperAdminStatCard label="Deleted" value={deleteCount} detail="Destructive actions requiring traceability" accent="rose" />
      </SuperAdminCompactStatGrid>

      <SuperAdminPanel>
        <SuperAdminSectionHeading
          eyebrow="Governance filters"
          title="Audit investigation workspace"
          description="Search by actor, school, record, or module to isolate the exact action trail you need."
        />

        <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-white/65 bg-white/60 p-4 shadow-inner shadow-white/70 lg:grid-cols-3">
          <Input label="Search" placeholder="Search school, actor, record, or module" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Action</span>
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="ui-select">
              <option value="all">All actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Module</span>
            <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="ui-select">
              <option value="all">All modules</option>
              {moduleOptions.map((module) => (
                <option key={module} value={module}>
                  {formatModule(module)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="mt-6 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 space-y-3 md:hidden">
          {filteredRows.map((row) => (
            <div key={row.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{row.schoolName}</p>
              <p className="mt-1 text-sm text-slate-600">{formatModule(row.module)}</p>
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-medium">{row.action}</span> by {row.userName}
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(row.createdAt)}</p>
              {row.recordId ? <p className="mt-2 break-all text-xs text-slate-500">Record: {row.recordId}</p> : null}
            </div>
          ))}
        </div>

        <div className="dashboard-table-shell hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">School</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Module</th>
                <th className="px-4 py-3 font-semibold">Record ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(row.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.schoolName}</td>
                  <td className="px-4 py-3 text-slate-600">{row.userName}</td>
                  <td className="px-4 py-3 text-slate-600">{row.action}</td>
                  <td className="px-4 py-3 text-slate-600">{formatModule(row.module)}</td>
                  <td className="px-4 py-3 break-all text-slate-500">{row.recordId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SuperAdminPanel>

      <SuperAdminMobileActionBar
        actions={[
          { label: "Dashboard", to: "/super-admin/dashboard" },
          { label: "Schools", to: "/super-admin/schools" },
        ]}
      />
    </SuperAdminWorkspace>
  );
};

export default SuperAdminAuditLogsPage;
