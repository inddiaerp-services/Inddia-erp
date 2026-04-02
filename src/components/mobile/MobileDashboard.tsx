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
  <section className="mobile-glass-panel overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(255,255,255,0.96)_45%,rgba(16,185,129,0.08))] px-5 py-5 shadow-[0_20px_48px_rgba(15,23,42,0.1)]">
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
        className="mobile-glass-panel min-w-[78%] snap-start rounded-[1.6rem] border border-white/80 bg-white/95 p-4 text-left shadow-[0_18px_38px_rgba(15,23,42,0.08)] active:scale-[0.99]"
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
        className="mobile-glass-panel block rounded-[1.35rem] border border-white/70 bg-white/95 px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.07)]"
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
        className="mobile-glass-panel overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/95 shadow-[0_14px_30px_rgba(15,23,42,0.07)]"
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
    className="fixed bottom-24 right-4 z-20 inline-flex min-h-14 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-brand-600 px-5 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(37,99,235,0.28)] md:hidden"
  >
    {label}
  </Link>
);

export default MobileHero;
