import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { SuperAdminHero, SuperAdminPanel, SuperAdminWorkspace } from "../../components/superAdmin/SuperAdminDesign";
import { createSchool } from "../../services/saasService";
import type { SchoolCreateValues } from "../../types/saas";

const initialForm: SchoolCreateValues = {
  name: "",
  email: "",
  phone: "",
  address: "",
  attendanceMapLink: "",
  attendanceGeoRadiusMeters: "10",
  plan: "Starter",
  durationMonths: "1",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export const SuperAdminSchoolCreatePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<SchoolCreateValues>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      window.setTimeout(() => {
        navigate("/super-admin/schools", { replace: true });
      }, 1200);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to create school.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SuperAdminWorkspace>
      <SuperAdminHero
        eyebrow="New tenant setup"
        title="Create a school workspace with a launch-ready admin account."
        description="This flow provisions the school record and the primary school admin in one professional onboarding experience."
        actions={
          <Link to="/super-admin/schools" className="w-full sm:w-auto">
            <Button className="w-full rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-300 to-cyan-300 px-5 text-slate-950 shadow-lg shadow-sky-900/20 hover:from-sky-200 hover:to-cyan-200 sm:w-auto">
              Back to Schools
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.52fr]">
        <SuperAdminPanel>
          <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/85 p-4 text-sm text-slate-600">
            Capture school identity, commercial plan, and admin credentials in one guided setup. This page is intended to feel like a workspace handoff, not a popup.
          </div>

          <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
            <section className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">School Identity</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Institution details</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="School Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                <Input label="School Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                <Input label="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                <Input label="Address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Attendance GPS</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">School attendance area</h2>
                <p className="mt-2 text-sm text-slate-500">Paste the school Google Maps link and set the radius in meters. Teachers can save attendance only inside this area.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input
                    label="School Map Link"
                    placeholder="https://maps.google.com/..."
                    value={form.attendanceMapLink ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, attendanceMapLink: event.target.value }))}
                  />
                </div>
                <Input
                  label="Attendance Radius (meters)"
                  type="number"
                  min="1"
                  value={form.attendanceGeoRadiusMeters ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, attendanceGeoRadiusMeters: event.target.value }))}
                />
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Commercial Setup</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Plan and duration</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Plan" value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))} required />
                <Input label="Duration (months)" type="number" min="1" value={form.durationMonths} onChange={(event) => setForm((current) => ({ ...current, durationMonths: event.target.value }))} required />
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Admin Access</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Primary school admin</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Admin Name" value={form.adminName} onChange={(event) => setForm((current) => ({ ...current, adminName: event.target.value }))} required />
                <Input label="Admin Email" value={form.adminEmail} onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))} required />
                <div className="md:col-span-2">
                  <Input label="Admin Password" type="password" value={form.adminPassword} onChange={(event) => setForm((current) => ({ ...current, adminPassword: event.target.value }))} required />
                </div>
              </div>
            </section>

            {error ? <p className="text-sm text-amber-700">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
              <Link to="/super-admin/schools" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
              </Link>
              <Button type="submit" className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto" disabled={submitting}>
                {submitting ? "Creating school..." : "Create School"}
              </Button>
            </div>
          </form>
        </SuperAdminPanel>

        <div className="space-y-6">
          <SuperAdminPanel>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">What Happens Next</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">1. School workspace is created</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">The tenant school record is provisioned with plan and expiry metadata.</p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">2. Admin account is issued</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">The primary admin receives the credentials needed to enter the school workspace.</p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">3. Tenant can go live</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">You can immediately continue to billing, profile review, or school directory management.</p>
              </div>
            </div>
          </SuperAdminPanel>

          <SuperAdminPanel>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Setup Preview</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-slate-500">School</span>
                <span className="font-medium text-slate-900">{form.name || "New School"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-slate-500">Plan</span>
                <span className="font-medium text-slate-900">{form.plan || "Starter"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium text-slate-900">{form.durationMonths || "1"} month(s)</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-slate-500">Admin</span>
                <span className="font-medium text-slate-900">{form.adminName || "Pending"}</span>
              </div>
            </div>
          </SuperAdminPanel>
        </div>
      </div>
    </SuperAdminWorkspace>
  );
};

export default SuperAdminSchoolCreatePage;
