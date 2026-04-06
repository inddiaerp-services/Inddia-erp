import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import {
  SuperAdminHero,
  SuperAdminHeroMetricCard,
  SuperAdminHeroMetricGrid,
  SuperAdminPanel,
  SuperAdminSectionHeading,
  SuperAdminStatCard,
  SuperAdminWorkspace,
} from "../../components/superAdmin/SuperAdminDesign";
import SuperAdminMobileActionBar from "../../components/superAdmin/SuperAdminMobileActionBar";
import { getSuperAdminMetrics, listBillingRows, listPayments, listSchoolStorage, listSchools } from "../../services/saasService";
import type { BillingRow, PaymentRecord, SchoolRecord, SchoolStorageRecord, SuperAdminMetrics } from "../../types/saas";

const formatCurrencyInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const metricCards = (metrics: SuperAdminMetrics) => [
  { label: "Total Schools", value: String(metrics.totalSchools), tone: "text-slate-900" },
  { label: "Active Subscriptions", value: String(metrics.activeSubscriptions), tone: "text-emerald-700" },
  { label: "Expired Schools", value: String(metrics.expiredSchools), tone: "text-rose-700" },
  { label: "Total Revenue", value: formatCurrencyInr(metrics.totalRevenue), tone: "text-brand-700" },
];

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

export const SuperAdminDashboardPage = () => {
  const [metrics, setMetrics] = useState<SuperAdminMetrics | null>(null);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [billingRows, setBillingRows] = useState<BillingRow[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [storageRows, setStorageRows] = useState<SchoolStorageRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [nextMetrics, nextSchools, nextBilling, nextPayments, nextStorage] = await Promise.all([
          getSuperAdminMetrics(),
          listSchools(),
          listBillingRows(),
          listPayments(),
          listSchoolStorage(),
        ]);

        if (!active) return;
        setMetrics(nextMetrics);
        setSchools(nextSchools);
        setBillingRows(nextBilling);
        setPayments(nextPayments);
        setStorageRows(nextStorage);
        setError("");
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load platform analytics.");
      }
    };

    void load();
    const handleFocus = () => void load();
    window.addEventListener("focus", handleFocus);
    const refreshTimer = window.setInterval(() => void load(), 10000);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(refreshTimer);
    };
  }, []);

  const recentSchools = useMemo(() => schools.slice(0, 5), [schools]);
  const latestBilling = useMemo(() => billingRows.slice(0, 5), [billingRows]);

  const alerts = useMemo(() => {
    const expired = schools
      .filter((school) => school.subscriptionStatus === "Expired")
      .slice(0, 3)
      .map((school) => ({
        id: `expired-${school.id}`,
        tone: "rose",
        title: `${school.name} subscription expired`,
        detail: `Access remains blocked until billing is renewed. Expiry: ${formatDate(school.expiryDate)}`,
      }));

    const renewals = billingRows
      .filter((row) => {
        const value = daysUntil(row.expiryDate);
        return value !== null && value >= 0 && value <= 14;
      })
      .slice(0, 3)
      .map((row) => ({
        id: `renewal-${row.schoolId}`,
        tone: "amber",
        title: `${row.schoolName} renewal reminder`,
        detail: `Plan ${row.planName ?? "Custom"} expires in ${daysUntil(row.expiryDate)} days.`,
      }));

    const failedPayments = payments
      .filter((payment) => payment.status === "Failed")
      .slice(0, 3)
      .map((payment) => ({
        id: `payment-${payment.id}`,
        tone: "rose",
        title: "Failed payment detected",
        detail: `Payment of ${formatCurrencyInr(payment.amount)} failed on ${formatDate(payment.paymentDate)}.`,
      }));

    const lowStorage = storageRows
      .filter((row) => (row.usagePercent ?? 0) >= 80)
      .slice(0, 3)
      .map((row) => ({
        id: `storage-${row.schoolId}`,
        tone: "amber",
        title: `${row.schoolName} storage is near limit`,
        detail: `${row.usagePercent}% used out of ${row.storageLimitMb ?? 0} MB.`,
      }));

    return [...expired, ...renewals, ...failedPayments, ...lowStorage].slice(0, 6);
  }, [billingRows, payments, schools, storageRows]);

  return (
    <SuperAdminWorkspace className="pb-24 md:pb-0">
      <SuperAdminHero
        eyebrow="Platform owner"
        title="A sharper operating cockpit for the entire school network."
        description="Monitor revenue, subscriptions, tenant risk, and platform health from one executive-grade command center designed for fast decisions."
        actions={
          <>
            <Link to="/super-admin/schools/new" className="w-full sm:w-auto">
              <Button className="super-hero-primary w-full rounded-2xl px-5 sm:w-auto">
                + Add School
              </Button>
            </Link>
            <Link to="/super-admin/audit-logs" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="super-hero-outline w-full rounded-2xl px-5 sm:w-auto"
              >
                Review Audit Logs
              </Button>
            </Link>
          </>
        }
        aside={
          <SuperAdminHeroMetricGrid>
            <SuperAdminHeroMetricCard label="Network Watch" value={schools.length} detail="schools in the active SaaS registry" labelClassName="text-sky-100" />
            <SuperAdminHeroMetricCard
              label="Billing Pulse"
              value={payments.filter((payment) => payment.status === "Success").length}
              detail="successful payment records tracked"
              labelClassName="text-emerald-100"
            />
            <SuperAdminHeroMetricCard label="Risk Surface" value={alerts.length} detail="active reminders and exceptions" labelClassName="text-amber-100" />
          </SuperAdminHeroMetricGrid>
        }
      />

      {error ? <SuperAdminPanel className="border-rose-200 bg-rose-50/90 text-rose-700">{error}</SuperAdminPanel> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(metrics ? metricCards(metrics) : Array.from({ length: 4 }).map((_, index) => ({ label: "Loading", value: "...", tone: "text-slate-500" }))).map((item, index) => (
          <SuperAdminStatCard
            key={`${item.label}-${index}`}
            label={item.label}
            value={<span className={item.tone}>{item.value}</span>}
            detail={index === 0 ? "Tenant footprint across the platform" : index === 1 ? "Currently healthy subscription accounts" : index === 2 ? "Schools requiring billing attention" : "Lifetime top-line value captured"}
            accent={index === 0 ? "sky" : index === 1 ? "emerald" : index === 2 ? "rose" : "amber"}
          />
        ))}
      </div>

      <SuperAdminPanel>
        <SuperAdminSectionHeading
          eyebrow="Attention center"
          title="Quick alerts"
          description="Expired plans, low storage, failed payments, and renewals are surfaced here first."
        />
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-[1.5rem] border px-4 py-4 shadow-sm ${
                  alert.tone === "rose" ? "border-rose-200 bg-rose-50/90" : "border-amber-200 bg-amber-50/90"
                }`}
              >
                <p className={`text-sm font-semibold ${alert.tone === "rose" ? "text-rose-700" : "text-amber-800"}`}>{alert.title}</p>
                <p className="mt-2 text-sm text-slate-700">{alert.detail}</p>
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">
              No critical platform alerts right now.
            </div>
          )}
        </div>
      </SuperAdminPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <SuperAdminPanel>
          <SuperAdminSectionHeading
            eyebrow="Tenant activity"
            title="Latest schools"
            description="Recently created school workspaces and their current access state."
          />
          <div className="mt-5 space-y-3">
            {recentSchools.map((item) => (
              <div key={item.id} className="page-summary-row flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">Expiry: {formatDate(item.expiryDate)}</p>
                </div>
                <span className="w-fit rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white shadow-sm">{item.subscriptionStatus}</span>
              </div>
            ))}
          </div>
        </SuperAdminPanel>

        <SuperAdminPanel>
          <SuperAdminSectionHeading
            eyebrow="Revenue operations"
            title="Billing snapshot"
            description="At-a-glance visibility into subscription posture and upcoming expiries."
          />
          <div className="mt-5 space-y-3">
            {latestBilling.map((item) => (
              <div key={item.schoolId} className="page-detail-card">
                <p className="font-medium text-slate-900">{item.schoolName}</p>
                <p className="mt-1 text-sm text-slate-500">{item.planName}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                  {item.status} • expires {formatDate(item.expiryDate)}
                </p>
              </div>
            ))}
          </div>
        </SuperAdminPanel>
      </div>

      <SuperAdminMobileActionBar
        actions={[
          { label: "Add School", to: "/super-admin/schools/new" },
          { label: "Add Payment", to: "/super-admin/billing/new" },
          { label: "Schools", to: "/super-admin/schools" },
          { label: "Audit Logs", to: "/super-admin/audit-logs" },
        ]}
      />
    </SuperAdminWorkspace>
  );
};

export default SuperAdminDashboardPage;
