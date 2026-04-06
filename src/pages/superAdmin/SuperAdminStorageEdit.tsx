import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { SuperAdminHero, SuperAdminPanel, SuperAdminWorkspace } from "../../components/superAdmin/SuperAdminDesign";
import { listSchoolStorage, listSchools, updateSchool } from "../../services/saasService";
import type { SchoolRecord, SchoolStorageRecord } from "../../types/saas";

export const SuperAdminStorageEditPage = () => {
  const navigate = useNavigate();
  const { schoolId = "" } = useParams();
  const [row, setRow] = useState<SchoolStorageRecord | null>(null);
  const [school, setSchool] = useState<SchoolRecord | null>(null);
  const [storageLimit, setStorageLimit] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([listSchoolStorage(), listSchools()])
      .then(([storageRows, schoolRows]) => {
        if (!active) return;
        const storage = storageRows.find((item) => item.schoolId === schoolId) ?? null;
        const schoolRecord = schoolRows.find((item) => item.id === schoolId) ?? null;
        if (!storage || !schoolRecord) {
          setError("Storage record not found.");
          setLoading(false);
          return;
        }
        setRow(storage);
        setSchool(schoolRecord);
        setStorageLimit(storage.storageLimitMb != null ? String(storage.storageLimitMb) : "");
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load storage record.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [schoolId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!school || !row) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await updateSchool(school.id, {
        name: school.name,
        email: school.email ?? "",
        phone: school.phone ?? "",
        address: school.address ?? "",
        subscriptionPlan: school.subscriptionPlan ?? "",
        subscriptionStatus: school.subscriptionStatus,
        storageLimit,
        expiryDate: school.expiryDate ?? "",
      });
      setSuccess("Storage limit updated successfully.");
      window.setTimeout(() => navigate("/super-admin/storage", { replace: true }), 900);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to update storage.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SuperAdminWorkspace>
      <SuperAdminHero
        eyebrow="Storage editing"
        title={row ? `Edit ${row.schoolName} Storage` : "Edit Storage"}
        description="Adjust tenant storage limits from a full-page capacity workflow with clearer operational context."
        actions={
          <Link to="/super-admin/storage" className="w-full sm:w-auto">
            <Button className="w-full rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-300 to-cyan-300 px-5 text-slate-950 shadow-lg shadow-sky-900/20 hover:from-sky-200 hover:to-cyan-200 sm:w-auto">Back to Storage</Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.52fr]">
        <SuperAdminPanel>
          {loading ? (
            <p className="text-sm text-slate-500">Loading storage details...</p>
          ) : (
            <form className="space-y-8" onSubmit={handleSubmit}>
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Capacity Settings</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Storage limit</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Storage Limit (MB)" type="number" min="0" value={storageLimit} onChange={(event) => setStorageLimit(event.target.value)} />
                </div>
              </section>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

              <div className="page-form-footer sm:flex-row sm:justify-between">
                <Link to="/super-admin/storage" className="w-full sm:w-auto">
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Storage Context</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="page-detail-card">
              <p className="text-slate-500">School</p>
              <p className="mt-1 font-medium text-slate-900">{row?.schoolName ?? "-"}</p>
            </div>
            <div className="page-detail-card">
              <p className="text-slate-500">Current Usage</p>
              <p className="mt-1 font-medium text-slate-900">{row?.usagePercent ?? 0}%</p>
            </div>
            <div className="page-detail-card">
              <p className="text-slate-500">File Count</p>
              <p className="mt-1 font-medium text-slate-900">{row?.fileCount ?? 0}</p>
            </div>
          </div>
        </SuperAdminPanel>
      </div>
    </SuperAdminWorkspace>
  );
};

export default SuperAdminStorageEditPage;
