import { useState, type FormEvent } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import { createSchool } from "../../services/saasService";
import type { SchoolCreateValues, SchoolRecord } from "../../types/saas";

const initialForm: SchoolCreateValues = {
  name: "",
  email: "",
  phone: "",
  address: "",
  plan: "Starter",
  durationMonths: "1",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

type CreateSchoolModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (school: SchoolRecord) => Promise<void> | void;
};

export const CreateSchoolModal = ({ open, onClose, onCreated }: CreateSchoolModalProps) => {
  const [form, setForm] = useState<SchoolCreateValues>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const createdSchool = await createSchool(form);
      setSuccess(`School created successfully. School Admin login: ${createdSchool.adminEmail ?? form.adminEmail}`);
      if (createdSchool.warning) {
        setError(createdSchool.warning);
      }
      await onCreated?.(createdSchool);
      window.setTimeout(() => {
        setSubmitting(false);
        handleClose(true);
      }, 900);
      return;
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to create school.");
    }

    setSubmitting(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create school and school admin"
      description="Create the tenant school, assign its subscription, and provision the school admin without leaving this page."
      maxWidthClass="max-w-3xl"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Fill in the school identity, billing plan, and admin credentials in one pass. The school admin account will be provisioned as part of this flow.
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input label="School Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <Input label="School Email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <Input label="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          <Input label="Address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          <Input label="Plan" value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))} required />
          <Input label="Duration (months)" type="number" min="1" value={form.durationMonths} onChange={(event) => setForm((current) => ({ ...current, durationMonths: event.target.value }))} required />
          <Input label="Admin Name" value={form.adminName} onChange={(event) => setForm((current) => ({ ...current, adminName: event.target.value }))} required />
          <Input label="Admin Email" type="email" value={form.adminEmail} onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))} required />
          <div className="md:col-span-2">
            <Input label="Admin Password" type="password" value={form.adminPassword} onChange={(event) => setForm((current) => ({ ...current, adminPassword: event.target.value }))} required />
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}
        {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => handleClose()} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto" disabled={submitting}>
            {submitting ? "Creating school..." : "Create School"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateSchoolModal;
