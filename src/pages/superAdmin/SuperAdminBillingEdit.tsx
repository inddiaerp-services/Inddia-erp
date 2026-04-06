import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { SuperAdminHero, SuperAdminPanel, SuperAdminWorkspace } from "../../components/superAdmin/SuperAdminDesign";
import { listBillingRows, updateSchoolBilling } from "../../services/saasService";
import type { BillingRow, BillingUpdateValues } from "../../types/saas";

const emptyForm: BillingUpdateValues = { planName: "", amount: "", status: "Trial", expiryDate: "" };

export const SuperAdminBillingEditPage = () => {
  const navigate = useNavigate();
  const { schoolId = "" } = useParams();
  const [row, setRow] = useState<BillingRow | null>(null);
  const [form, setForm] = useState<BillingUpdateValues>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    void listBillingRows()
      .then((rows) => {
        if (!active) return;
        const found = rows.find((item) => item.schoolId === schoolId) ?? null;
        if (!found) {
          setError("Billing record not found.");
          setLoading(false);
          return;
        }
        setRow(found);
        setForm({
          planName: found.planName ?? "",
          amount: String(found.amount),
          status: found.status,
          expiryDate: found.expiryDate ?? "",
        });
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load billing record.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [schoolId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!row) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await updateSchoolBilling(row.schoolId, form);
      setSuccess("Billing updated successfully.");
      window.setTimeout(() => navigate("/super-admin/billing", { replace: true }), 900);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to update billing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SuperAdminWorkspace>
      <SuperAdminHero
        eyebrow="Billing editing"
        title={row ? `Edit ${row.schoolName} Billing` : "Edit Billing"}
        description="Adjust plan, amount, validity, and current subscription state from a dedicated revenue workflow."
        actions={
          <Link to="/super-admin/billing" className="w-full sm:w-auto">
            <Button className="w-full rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-300 to-cyan-300 px-5 text-slate-950 shadow-lg shadow-sky-900/20 hover:from-sky-200 hover:to-cyan-200 sm:w-auto">Back to Billing</Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.52fr]">
        <SuperAdminPanel>
          {loading ? (
            <p className="text-sm text-slate-500">Loading billing details...</p>
          ) : (
            <form className="space-y-8" onSubmit={handleSubmit}>
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Commercial Settings</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Subscription details</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Plan" value={form.planName} onChange={(event) => setForm((current) => ({ ...current, planName: event.target.value }))} required />
                  <Input label="Amount" type="number" min="0" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <select className="ui-select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BillingUpdateValues["status"] }))}>
                      <option value="Trial">Trial</option>
                      <option value="Active">Active</option>
                      <option value="Expired">Expired</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </label>
                  <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))} />
                </div>
              </section>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

              <div className="page-form-footer sm:flex-row sm:justify-between">
                <Link to="/super-admin/billing" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
                </Link>
                <Button type="submit" className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto" disabled={submitting || loading}>
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </SuperAdminPanel>

        <SuperAdminPanel>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Billing Snapshot</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="page-detail-card">
              <p className="text-slate-500">School</p>
              <p className="mt-1 font-medium text-slate-900">{row?.schoolName ?? "-"}</p>
            </div>
            <div className="page-detail-card">
              <p className="text-slate-500">Plan</p>
              <p className="mt-1 font-medium text-slate-900">{form.planName || "-"}</p>
            </div>
            <div className="page-detail-card">
              <p className="text-slate-500">Status</p>
              <p className="mt-1 font-medium text-slate-900">{form.status}</p>
            </div>
          </div>
        </SuperAdminPanel>
      </div>
    </SuperAdminWorkspace>
  );
};

export default SuperAdminBillingEditPage;
