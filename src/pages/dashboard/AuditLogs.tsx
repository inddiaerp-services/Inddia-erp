import { useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import { listAuditLogs } from "../../services/adminService";
import type { AuditLogRecord } from "../../types/admin";
import { AdminPageHeader } from "./adminPageUtils";

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const formatModule = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatRole = (value: string | null) => {
  if (!value) return "-";
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const AuditLogsPage = () => {
  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    let active = true;

    void listAuditLogs(dateFilter ? { date: dateFilter } : undefined)
      .then((data) => {
        if (!active) return;
        setRows(data);
        setError("");
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load audit logs.");
      });

    return () => {
      active = false;
    };
  }, [dateFilter]);

  const moduleOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.module))).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [row.userName, row.userEmail, row.userRole, row.module, row.action, row.recordId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesAction = actionFilter === "all" || row.action === actionFilter;
      const matchesModule = moduleFilter === "all" || row.module === moduleFilter;

      return matchesQuery && matchesAction && matchesModule;
    });
  }, [actionFilter, moduleFilter, query, rows]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Logs"
        description="Track school activity from admins and staff, including edits, creates, deletes, and password updates inside this school workspace."
      />

      <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <Input
            label="Search"
            placeholder="Search actor, role, module, or record"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Action</span>
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="erp-select">
              <option value="all">All actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Module</span>
            <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="erp-select">
              <option value="all">All modules</option>
              {moduleOptions.map((module) => (
                <option key={module} value={module}>
                  {formatModule(module)}
                </option>
              ))}
            </select>
          </label>
          <Input label="Date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </div>

        {error ? <p className="mt-6 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 space-y-3 md:hidden">
          {filteredRows.map((row) => (
            <div key={row.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{row.userName}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatRole(row.userRole)}</p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{row.action}</span>
              </div>
              <p className="mt-3 text-sm text-slate-700">{formatModule(row.module)}</p>
              <p className="mt-1 text-xs text-slate-500">{row.userEmail ?? "-"}</p>
              <p className="mt-2 text-xs text-slate-500">{formatDateTime(row.createdAt)}</p>
              {row.recordId ? <p className="mt-2 break-all text-xs text-slate-500">Record: {row.recordId}</p> : null}
            </div>
          ))}

          {filteredRows.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No audit activity matches the current filters.
            </div>
          ) : null}
        </div>

        <div className="mt-6 hidden overflow-hidden rounded-[1.5rem] border border-slate-200 md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Module</th>
                <th className="px-4 py-3 font-semibold">Record ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.userName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.userEmail ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatRole(row.userRole)}</td>
                  <td className="px-4 py-3 text-slate-600">{row.action}</td>
                  <td className="px-4 py-3 text-slate-600">{formatModule(row.module)}</td>
                  <td className="px-4 py-3 break-all text-slate-500">{row.recordId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AuditLogsPage;
