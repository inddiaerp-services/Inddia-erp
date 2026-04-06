import { useEffect, useState, type FormEvent } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import { createBillingPayment, listSchools } from "../../services/saasService";
import type { BillingCreateValues, PaymentRecord, SchoolRecord, SubscriptionRecord } from "../../types/saas";

const initialForm: BillingCreateValues = {
  schoolId: "",
  planName: "Growth",
  amount: "",
  durationMonths: "12",
  paymentMethod: "Bank Transfer",
};

type CreateBillingPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (result: { payment: PaymentRecord; subscription: SubscriptionRecord; school: SchoolRecord }) => Promise<void> | void;
};

export const CreateBillingPaymentModal = ({ open, onClose, onCreated }: CreateBillingPaymentModalProps) => {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [form, setForm] = useState<BillingCreateValues>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    void listSchools()
      .then((rows) => {
        setSchools(rows);
        setError("");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load schools.");
      });
  }, [open]);

  const handleClose = (force = false) => {
    if (submitting && !force) return;
    setForm(initialForm);
    setError("");
    setSuccess("");
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const result = await createBillingPayment(form);
      setSuccess("Payment recorded successfully.");
      await onCreated?.(result);
      window.setTimeout(() => {
        setSubmitting(false);
        handleClose(true);
      }, 900);
      return;
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to record payment.");
    }

    setSubmitting(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Activate or renew school billing"
      description="Record a payment and refresh the school subscription without leaving the current screen."
      maxWidthClass="max-w-3xl"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="page-info-box text-sm">
          Choose the school, confirm the plan, and record the payment details. This will update or renew the subscription immediately.
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">School</span>
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
          <Input label="Plan" value={form.planName} onChange={(event) => setForm((current) => ({ ...current, planName: event.target.value }))} required />
          <Input label="Amount" type="number" min="1" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
          <Input label="Duration (months)" type="number" min="1" value={form.durationMonths} onChange={(event) => setForm((current) => ({ ...current, durationMonths: event.target.value }))} required />
          <Input label="Payment Method" value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} required />
        </div>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

        <div className="page-form-footer sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => handleClose()} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto" disabled={submitting}>
            {submitting ? "Saving payment..." : "Add Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBillingPaymentModal;
