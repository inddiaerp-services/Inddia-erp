import { useMemo, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import Card from "./Card";
import Button from "./Button";

type DataColumn<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  mobileHidden?: boolean;
  emphasis?: boolean;
};

type DataTableProps<T> = {
  title?: string;
  description?: string;
  data: T[];
  columns: DataColumn<T>[];
  getRowId: (item: T) => string;
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  renderActions?: (item: T) => ReactNode;
  mobileTitle?: (item: T) => ReactNode;
  mobileSubtitle?: (item: T) => ReactNode;
  pageSize?: number;
  className?: string;
};

export const DataTable = <T,>({
  title,
  description,
  data,
  columns,
  getRowId,
  loading = false,
  loadingMessage = "Loading records...",
  emptyMessage = "No data available",
  renderActions,
  mobileTitle,
  mobileSubtitle,
  pageSize = 8,
  className,
}: DataTableProps<T>) => {
  const [page, setPage] = useState(1);
  const isSuperAdminArea =
    typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin");

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedData = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [data, pageSize, safePage]);

  const summary = loading
    ? loadingMessage
    : data.length === 0
      ? emptyMessage
      : `Showing ${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, data.length)} of ${data.length}`;

  return (
    <Card
      className={cn(
        isSuperAdminArea
          ? "overflow-hidden border-slate-200/80 bg-white/95 p-0 shadow-sm ring-1 ring-slate-100/80"
          : "overflow-hidden border-slate-200/80 bg-white p-0 shadow-[0_16px_40px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      {title || description ? (
        <div className={cn("border-b px-4 py-4 md:px-6", isSuperAdminArea ? "border-slate-200/80" : "border-slate-200/80 bg-white")}>
          {title ? <h3 className="text-base font-semibold text-slate-900 md:text-lg">{title}</h3> : null}
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b px-4 py-3 text-sm text-slate-500 md:px-6",
          isSuperAdminArea ? "border-slate-100 bg-slate-50/80" : "border-slate-200/70 bg-slate-50/85",
        )}
      >
        <p>{summary}</p>
        <p className="hidden text-xs uppercase tracking-[0.18em] text-slate-400 md:block">
          {isSuperAdminArea ? "ERP Data View" : "Workspace Table"}
        </p>
      </div>

      <div className="md:hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="mobile-glass-panel rounded-[1.5rem] border border-slate-200/70 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
                <div className="h-5 w-1/2 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-4 space-y-3">
                  <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : pagedData.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500">{emptyMessage}</div>
        ) : (
          <div className="space-y-3 p-3">
            {pagedData.map((item) => (
              <details
                key={getRowId(item)}
                className="mobile-glass-panel overflow-hidden rounded-[1.5rem] border border-slate-200/70 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.07)]"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{mobileTitle ? mobileTitle(item) : columns[0]?.render(item)}</p>
                    {mobileSubtitle ? <div className="mt-1 text-sm text-slate-500">{mobileSubtitle(item)}</div> : null}
                  </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                      Open
                    </span>
                  </summary>

                <div className="space-y-2 border-t border-slate-100 px-4 py-4">
                  {columns.slice(mobileTitle ? 0 : 1).filter((column) => !column.mobileHidden).map((column) => (
                    <div key={column.key} className="rounded-[1rem] bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{column.label}</p>
                      <div className={cn("mt-1 min-w-0 text-sm text-slate-700", column.emphasis && "font-semibold text-slate-900")}>{column.render(item)}</div>
                    </div>
                  ))}
                  {renderActions ? (
                    <div className="inline-flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto pt-2 pb-1">{renderActions(item)}</div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  {column.label}
                </th>
              ))}
              {renderActions ? (
                <th className="border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/65"}>
                  {columns.map((column) => (
                    <td key={column.key} className="border-b border-slate-100 px-6 py-4">
                      <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
                    </td>
                  ))}
                  {renderActions ? (
                    <td className="border-b border-slate-100 px-6 py-4">
                      <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
                    </td>
                  ) : null}
                </tr>
              ))
            ) : pagedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)} className="px-6 py-12 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pagedData.map((item, rowIndex) => (
                <tr key={getRowId(item)} className={cn("transition hover:bg-blue-50/70", rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/70")}>
                  {columns.map((column) => (
                    <td key={column.key} className={cn("border-b border-slate-100 px-6 py-4 align-top text-slate-700", column.emphasis && "font-semibold text-slate-900")}>
                      {column.render(item)}
                    </td>
                  ))}
                  {renderActions ? <td className="border-b border-slate-100 px-6 py-4">{renderActions(item)}</td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.length > pageSize ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <p className="text-sm text-slate-500">Page {safePage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1}>
              Previous
            </Button>
            <Button variant="outline" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
};

export default DataTable;
