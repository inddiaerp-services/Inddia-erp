import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

export const MobileHero = ({
  title,
  subtitle,
  badge,
  aside,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  aside?: ReactNode;
}) => (
  <section className="mobile-panel overflow-hidden rounded-[1rem] px-5 py-5">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {badge ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">{badge}</p>
        ) : null}
        <h1 className="mt-2 text-[1.9rem] font-semibold leading-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  </section>
);

export const MobileSection = ({
  title,
  description,
  action,
  children,
  className,
}: PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}>) => (
  <section className={cn("space-y-3", className)}>
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    {children}
  </section>
);

export const MobileMetricCarousel = ({
  items,
  onSelect,
}: {
  items: Array<{ label: string; value: string; detail: string }>;
  onSelect?: (index: number) => void;
}) => (
  <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
    {items.map((item, index) => (
      <button
        key={`${item.label}-${index}`}
        type="button"
        onClick={() => onSelect?.(index)}
        className="mobile-panel min-w-[78%] snap-start rounded-[1rem] p-4 text-left active:scale-[0.99]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
        <p className="mt-3 text-3xl font-semibold leading-none text-slate-950">{item.value}</p>
        <p className="mt-3 text-sm leading-6 text-slate-500">{item.detail}</p>
      </button>
    ))}
  </div>
);

export const MobileActionList = ({
  items,
}: {
  items: Array<{ title: string; body: string; path: string }>;
}) => (
  <div className="space-y-3">
    {items.map((item) => (
      <Link
        key={item.path}
        to={item.path}
        className="mobile-panel block rounded-[1rem] px-4 py-4"
      >
        <p className="text-base font-semibold text-slate-900">{item.title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{item.body}</p>
      </Link>
    ))}
  </div>
);

export const MobileActivityFeed = ({
  items,
}: {
  items: Array<{ title: string; subtitle: string; meta: string }>;
}) => (
  <div className="space-y-3">
    {items.map((item, index) => (
      <details
        key={`${item.title}-${index}`}
        className="mobile-panel overflow-hidden rounded-[1rem]"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 truncate text-sm text-slate-500">{item.subtitle}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            View
          </span>
        </summary>
        <div className="border-t border-slate-100 px-4 py-4 text-sm text-slate-600">{item.meta}</div>
      </details>
    ))}
  </div>
);

export const MobileFab = ({
  to,
  label,
}: {
  to: string;
  label: string;
}) => (
  <Link
    to={to}
    className="ui-button ui-button-primary fixed bottom-24 right-4 z-20 min-h-14 rounded-full px-5 md:hidden"
  >
    {label}
  </Link>
);

export default MobileHero;
