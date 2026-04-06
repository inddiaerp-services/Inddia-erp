import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { SuperAdminHero, SuperAdminPanel, SuperAdminWorkspace } from "../../components/superAdmin/SuperAdminDesign";
import { listPayments, listSchools, updatePayment } from "../../services/saasService";
import type { PaymentRecord, PaymentUpdateValues, SchoolRecord } from "../../types/saas";

const emptyForm: PaymentUpdateValues = { amount: "", paymentMethod: "", paymentDate: "", status: "Success" };

export const SuperAdminPaymentEditPage = () => {
  const navigate = useNavigate();
  const { paymentId = "" } = useParams();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [school, setSchool] = useState<SchoolRecord | null>(null);
  const [form, setForm] = useState<PaymentUpdateValues>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([listPayments(), listSchools()])
      .then(([payments, schools]) => {
        if (!active) return;
        const found = payments.find((item) => item.id === paymentId) ?? null;
        if (!found) {
          setError("Payment not found.");
          setLoading(false);
          return;
        }
        setPayment(found);
        setSchool(schools.find((item) => item.id === found.schoolId) ?? null);
        setForm({
          amount: String(found.amount),
          paymentMethod: found.paymentMethod ?? "",
          paymentDate: found.paymentDate ?? "",
          status: found.status,
        });
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load payment.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [paymentId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payment) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await updatePayment(payment.id, form);
      setSuccess("Payment updated successfully.");
      window.setTimeout(() => navigate("/super-admin/payments", { replace: true }), 900);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to update payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SuperAdminWorkspace>
      <SuperAdminHero
        eyebrow="Payment editing"
        title="Edit payment record"
        description="Correct amount, method, date, or status from a full-page payment workflow instead of a small modal."
        actions={
          <Link to="/super-admin/payments" className="w-full sm:w-auto">
            <Button className="w-full rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-300 to-cyan-300 px-5 text-slate-950 shadow-lg shadow-sky-900/20 hover:from-sky-200 hover:to-cyan-200 sm:w-auto">Back to Payments</Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.52fr]">
        <SuperAdminPanel>
          {loading ? (
            <p className="text-sm text-slate-500">Loading payment details...</p>
          ) : (
            <form className="space-y-8" onSubmit={handleSubmit}>
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Payment Record</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Transaction details</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Amount" type="number" min="0" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
                  <Input label="Payment Method" value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} />
                  <Input label="Payment Date" type="date" value={form.paymentDate} onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))} />
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <select className="ui-select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PaymentUpdateValues["status"] }))}>
                      <option value="Success">Success</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </label>
                </div>
              </section>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

              <div className="page-form-footer sm:flex-row sm:justify-between">
                <Link to="/super-admin/payments" className="w-full sm:w-auto">
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Payment Context</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="page-detail-card">
              <p className="text-slate-500">School</p>
              <p className="mt-1 font-medium text-slate-900">{school?.name ?? "-"}</p>
            </div>
            <div className="page-detail-card">
              <p className="text-slate-500">Payment ID</p>
              <p className="mt-1 break-all font-medium text-slate-900">{payment?.id ?? "-"}</p>
            </div>
          </div>
        </SuperAdminPanel>
      </div>
    </SuperAdminWorkspace>
  );
};

export default SuperAdminPaymentEditPage;
