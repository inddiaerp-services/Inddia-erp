import type { ReactNode } from "react";
import Card from "../../components/ui/Card";

export const AdminPageHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700 ring-1 ring-blue-100">
          Workspace
        </span>
        <h1 className="mt-4 text-[1.75rem] font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">{description}</p>
      </div>
      {action ? <div className="w-full md:w-auto">{action}</div> : null}
    </div>
  </Card>
);

export const DetailSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">Details</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950 sm:text-xl">{title}</h2>
      </div>
      <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 sm:inline-flex">
        Section
      </span>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-2 md:gap-4">{children}</div>
  </Card>
);

export const DetailField = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/70 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
    <div className="mt-2 text-sm font-medium leading-6 text-slate-900">{value || "Not available"}</div>
  </div>
);

export const CompactMetricCard = ({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ReactNode;
}) => (
  <Card className="metric-card p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-semibold leading-none text-slate-900">{value}</p>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>
      </div>
    </div>
  </Card>
);
