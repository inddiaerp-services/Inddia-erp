import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { cn } from "../../lib/utils";

type SuperAdminWorkspaceProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const SuperAdminWorkspace = ({ children, className, ...props }: SuperAdminWorkspaceProps) => (
  <div className={cn("superadmin-shell w-full rounded-[1.4rem] p-3 sm:rounded-[2rem] sm:p-5 lg:p-6", className)} {...props}>
    <div className="superadmin-glow left-[-8rem] top-[-5rem] h-40 w-40 bg-sky-300/40" />
    <div className="superadmin-glow bottom-[-5rem] right-[-4rem] h-44 w-44 bg-emerald-200/35" />
    <div className="relative z-[1] space-y-6">{children}</div>
  </div>
);

type SuperAdminHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
};

export const SuperAdminHero = ({ eyebrow, title, description, actions, aside }: SuperAdminHeroProps) => (
  <section className="superadmin-hero">
    <div className="relative z-[1] grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
      <div className="min-w-0">
        <p className="superadmin-kicker">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl xl:text-[2.8rem]">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-100 sm:text-base">
          {description}
        </p>
        {actions ? <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}
      </div>

      {aside ? <div className="grid gap-3">{aside}</div> : null}
    </div>
  </section>
);

type SuperAdminPanelProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const SuperAdminPanel = ({ children, className, ...props }: SuperAdminPanelProps) => (
  <div className={cn("superadmin-panel p-5 sm:p-6", className)} {...props}>
    {children}
  </div>
);

type SuperAdminCompactStatGridProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const SuperAdminCompactStatGrid = ({ children, className, ...props }: SuperAdminCompactStatGridProps) => (
  <div className={cn("superadmin-compact-stat-grid", className)} {...props}>
    {children}
  </div>
);

type SuperAdminHeroMetricGridProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const SuperAdminHeroMetricGrid = ({ children, className, ...props }: SuperAdminHeroMetricGridProps) => (
  <div className={cn("superadmin-hero-metric-grid", className)} {...props}>
    {children}
  </div>
);

type SuperAdminHeroMetricCardProps = {
  label: string;
  value: ReactNode;
  detail: string;
  labelClassName?: string;
};

export const SuperAdminHeroMetricCard = ({
  label,
  value,
  detail,
  labelClassName,
}: SuperAdminHeroMetricCardProps) => (
  <div className="superadmin-hero-metric-card">
    <p className={cn("text-[10px] font-semibold uppercase tracking-[0.2em]", labelClassName)}>{label}</p>
    <p className="mt-2 text-lg font-semibold leading-none text-white sm:mt-3 sm:text-2xl">{value}</p>
    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-100 sm:text-sm sm:leading-5">{detail}</p>
  </div>
);

type SuperAdminStatCardProps = {
  label: string;
  value: ReactNode;
  detail?: string;
  accent?: "sky" | "emerald" | "amber" | "rose" | "slate";
};

const accentClasses = {
  sky: "bg-sky-500/15 text-sky-700 ring-sky-200",
  emerald: "bg-emerald-500/15 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-500/15 text-amber-700 ring-amber-200",
  rose: "bg-rose-500/15 text-rose-700 ring-rose-200",
  slate: "bg-slate-900 text-white ring-slate-700",
};

export const SuperAdminStatCard = ({
  label,
  value,
  detail,
  accent = "sky",
}: SuperAdminStatCardProps) => (
  <div className="superadmin-stat-card min-w-0">
    <span
      className={cn(
        "inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 sm:px-3 sm:text-[11px] sm:tracking-[0.22em]",
        accentClasses[accent],
      )}
    >
      {label}
    </span>
    <p className="mt-3 break-words text-lg font-semibold tracking-tight text-slate-950 sm:mt-5 sm:text-3xl">{value}</p>
    {detail ? <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">{detail}</p> : null}
  </div>
);

type SuperAdminSectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export const SuperAdminSectionHeading = ({
  eyebrow,
  title,
  description,
  action,
}: SuperAdminSectionHeadingProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow ? <p className="superadmin-section-kicker">{eyebrow}</p> : null}
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);
