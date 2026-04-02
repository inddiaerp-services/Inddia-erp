import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { AdminPageHeader, CompactMetricCard } from "./adminPageUtils";
import { getAnalyticsDashboard } from "../../services/adminService";
import type { AnalyticsDashboard } from "../../types/admin";

const PIE_COLORS = ["#2563eb", "#14b8a6", "#f59e0b", "#ef4444"];

const AnalyticsPage = () => {
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      try {
        const data = await getAnalyticsDashboard();
        if (active) {
          setDashboard(data);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load analytics.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics Dashboard"
        description="Live operational analytics built from the ERP database with real fee, attendance, and academic performance aggregates."
        action={
          <Link to="/dashboard/fees">
            <Button variant="outline" className="md:w-auto">
              Open Fees
            </Button>
          </Link>
        }
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(loading ? Array.from({ length: 4 }, () => null) : dashboard?.metrics ?? []).map((metric, index) => (
          <div key={metric?.label ?? index}>
            {metric ? (
              <CompactMetricCard
                label={metric.label}
                value={metric.value}
                detail={metric.helper}
                icon={
                  index % 4 === 0 ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="M12 20V10M18 20V4M6 20v-6" />
                    </svg>
                  ) : index % 4 === 1 ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 3" />
                    </svg>
                  ) : index % 4 === 2 ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="m3 8 9-5 9 5-9 5-9-5Z" />
                      <path d="M7 10.5v4.5c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="M3 12h18M12 3v18" />
                    </svg>
                  )
                }
              />
            ) : (
              <Card className="p-3.5">
                <div className="space-y-3">
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                  <div className="h-7 w-28 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                </div>
              </Card>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Chart 1</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Monthly Fees Collection</h2>
              <p className="mt-2 text-sm text-slate-500">SUM of paid amounts grouped by fee creation month.</p>
            </div>
          </div>
          <div className="mt-6 h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart...</div>
            ) : !dashboard || dashboard.monthlyFees.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No fee collection data found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.monthlyFees}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0))} />
                  <Legend />
                  <Bar dataKey="value" name="Collected" fill="#2563eb" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Chart 2</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Attendance Distribution</h2>
          <p className="mt-2 text-sm text-slate-500">Present versus total attendance records with database-calculated percentages.</p>
          <div className="mt-6 h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart...</div>
            ) : !dashboard || dashboard.attendance.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No attendance records found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboard.attendance} dataKey="value" nameKey="label" innerRadius={74} outerRadius={112} paddingAngle={4}>
                    {dashboard.attendance.map((entry, index) => (
                      <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, _name, payload) => `${Number(value ?? 0)} entries${payload?.payload?.percentage != null ? ` (${payload.payload.percentage}%)` : ""}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Chart 3</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Student Performance By Subject</h2>
        <p className="mt-2 text-sm text-slate-500">Average marks per subject from the marks table.</p>
        <div className="mt-6 h-[360px]">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart...</div>
          ) : !dashboard || dashboard.performance.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">No performance data found.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.performance}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => `${Number(value ?? 0)} avg marks`} />
                <Legend />
                <Line type="monotone" dataKey="value" name="Average Marks" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
