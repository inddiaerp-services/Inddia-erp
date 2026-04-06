import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { SuperAdminHero, SuperAdminPanel, SuperAdminWorkspace } from "../../components/superAdmin/SuperAdminDesign";
import { createBillingPayment, listSchools } from "../../services/saasService";
import type { BillingCreateValues, SchoolRecord } from "../../types/saas";

const initialForm: BillingCreateValues = {
  schoolId: "",
  planName: "Growth",
  amount: "",
  durationMonths: "12",
  paymentMethod: "Bank Transfer",
};

export const SuperAdminBillingCreatePage = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [form, setForm] = useState<BillingCreateValues>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void listSchools()
      .then(setSchools)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load schools.");
      });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await createBillingPayment(form);
      setSuccess("Payment recorded successfully.");
      window.setTimeout(() => {
        navigate("/super-admin/billing", { replace: true });
      }, 1200);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SuperAdminWorkspace>
      <SuperAdminHero
        eyebrow="Billing activation"
        title="Record a payment and renew tenant billing with more clarity."
        description="Use this form to activate or extend a school subscription while keeping plan, duration, and payment method aligned in one step."
        actions={
          <Link to="/super-admin/billing" className="w-full sm:w-auto">
            <Button className="w-full bg-white text-slate-950 hover:bg-slate-100 sm:w-auto">Back to Billing</Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.52fr]">
        <SuperAdminPanel>
          <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/85 p-4 text-sm text-slate-600">
            Choose the school, confirm the commercial plan, and record the incoming payment in a cleaner renewal workflow.
          </div>

          <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
            <section className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Tenant Selection</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Select school</h2>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">School</span>
                <select
                  className="ui-select"
                  value={form.schoolId}
                  onChange={(event) => setForm((current) => ({ ...current, schoolId: event.target.value }))}
                  required
                >
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Commercial Terms</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Plan and value</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Plan" value={form.planName} onChange={(event) => setForm((current) => ({ ...current, planName: event.target.value }))} required />
                <Input label="Amount" type="number" min="1" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
                <Input label="Duration (months)" type="number" min="1" value={form.durationMonths} onChange={(event) => setForm((current) => ({ ...current, durationMonths: event.target.value }))} required />
                <Input label="Payment Method" value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} required />
              </div>
            </section>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

            <div className="page-form-footer sm:flex-row sm:justify-between">
              <Link to="/super-admin/billing" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
              </Link>
              <Button type="submit" className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto" disabled={submitting}>
                {submitting ? "Saving payment..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </SuperAdminPanel>

        <div className="space-y-6">
          <SuperAdminPanel>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Workflow Impact</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">1. Payment is recorded</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">The transaction is stored in the platform ledger for the selected tenant.</p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">2. Subscription is extended</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Billing validity is created or renewed based on the chosen duration and plan.</p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">3. School remains operational</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">The school can continue working without renewal gaps or manual follow-up.</p>
              </div>
            </div>
          </SuperAdminPanel>

          <SuperAdminPanel>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Renewal Preview</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 page-detail-card">
                <span className="text-slate-500">School</span>
                <span className="font-medium text-slate-900">{schools.find((school) => school.id === form.schoolId)?.name ?? "Select school"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 page-detail-card">
                <span className="text-slate-500">Plan</span>
                <span className="font-medium text-slate-900">{form.planName || "Growth"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 page-detail-card">
                <span className="text-slate-500">Amount</span>
                <span className="font-medium text-slate-900">{form.amount || "0"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 page-detail-card">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium text-slate-900">{form.durationMonths || "12"} month(s)</span>
              </div>
            </div>
          </SuperAdminPanel>
        </div>
      </div>
    </SuperAdminWorkspace>
  );
};

export default SuperAdminBillingCreatePage;
