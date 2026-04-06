import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { cn } from "../../lib/utils";

type SuperAdminWorkspaceProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const SuperAdminWorkspace = ({ children, className, ...props }: SuperAdminWorkspaceProps) => (
  <div className={cn("console-frame w-full rounded-[1.25rem] p-3 sm:rounded-[1.5rem] sm:p-5 lg:p-6", className)} {...props}>
    <div className="space-y-6">{children}</div>
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
  <section className="console-hero rounded-[1.4rem] p-5 sm:p-8">
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
      <div className="min-w-0">
        <p className="console-kicker text-[11px] font-semibold uppercase tracking-[0.32em]">{eyebrow}</p>
        <h1 className="console-hero-title mt-4 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl xl:text-[2.8rem]">
          {title}
        </h1>
        <p className="console-hero-description mt-4 max-w-3xl text-sm leading-7 sm:text-base">
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
  <div className={cn("console-panel rounded-[1.25rem] p-5 sm:p-6", className)} {...props}>
    {children}
  </div>
);

type SuperAdminCompactStatGridProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const SuperAdminCompactStatGrid = ({ children, className, ...props }: SuperAdminCompactStatGridProps) => (
  <div className={cn("-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0", className)} {...props}>
    {children}
  </div>
);

type SuperAdminHeroMetricGridProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const SuperAdminHeroMetricGrid = ({ children, className, ...props }: SuperAdminHeroMetricGridProps) => (
  <div className={cn("grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-1", className)} {...props}>
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
  <div className="console-stat rounded-[1.1rem] p-4">
    <p className={cn("console-stat-label text-[10px] font-semibold uppercase tracking-[0.2em]", labelClassName)}>{label}</p>
    <p className="console-stat-value mt-2 text-lg font-semibold leading-none sm:mt-3 sm:text-2xl">{value}</p>
    <p className="console-stat-detail mt-1 line-clamp-2 text-[11px] leading-4 sm:text-sm sm:leading-5">{detail}</p>
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
  <div className="console-panel min-w-[140px] shrink-0 rounded-[1.1rem] p-4 sm:min-w-0 sm:p-5">
    <span
      className={cn(
        "inline-flex max-w-full rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 sm:px-3 sm:text-[11px] sm:tracking-[0.22em]",
        accentClasses[accent],
      )}
    >
      {label}
    </span>
    <p className="console-panel-value mt-3 break-words text-lg font-semibold tracking-tight sm:mt-5 sm:text-3xl">{value}</p>
    {detail ? <p className="console-panel-detail mt-1 text-[11px] leading-4 sm:mt-2 sm:text-sm sm:leading-6">{detail}</p> : null}
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
      {eyebrow ? <p className="console-kicker text-[11px] font-semibold uppercase tracking-[0.28em]">{eyebrow}</p> : null}
      <h2 className="console-section-title mt-2 text-xl font-semibold tracking-tight">{title}</h2>
      {description ? <p className="console-section-description mt-1 text-sm leading-6">{description}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);
