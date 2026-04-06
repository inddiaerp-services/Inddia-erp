import Card from "../../components/ui/Card";

type ModuleMetric = {
  label: string;
  value: string;
};

type ModulePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: ModuleMetric[];
};

export const ModulePage = ({ eyebrow, title, description, metrics }: ModulePageProps) => (
  <div className="space-y-6">
    <Card className="border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs uppercase tracking-[0.28em] text-blue-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
    </Card>

    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="metric-card">
          <p className="text-sm text-slate-500">{metric.label}</p>
          <h3 className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</h3>
        </Card>
      ))}
    </div>

    <Card className="border-slate-200 bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Ready for live data</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        This screen is already mounted inside the dashboard layout and protected by client-side
        routing. The next step is wiring it to Supabase queries and CRUD flows for this module.
      </p>
    </Card>
  </div>
);

export default ModulePage;
