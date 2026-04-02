import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { DetailField, DetailSection } from "./adminPageUtils";
import { getSubjectDetail } from "../../services/adminService";
import type { StaffRecord, SubjectRecord } from "../../types/admin";

export const SubjectDetailPage = () => {
  const { id = "" } = useParams();
  const [subject, setSubject] = useState<SubjectRecord | null>(null);
  const [assignedTeachers, setAssignedTeachers] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const detail = await getSubjectDetail(id);
        setSubject(detail.subject);
        setAssignedTeachers(detail.assignedTeachers);
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load subject.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  if (loading) {
    return <Card className="border-slate-200 bg-white shadow-sm">Loading subject details...</Card>;
  }

  if (error || !subject) {
    return <Card className="border-rose-200 bg-rose-50 shadow-sm text-rose-700">{error || "Subject not found."}</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-brand-600">Subject Details</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{subject.name}</h1>
        </div>
        <Link to="/dashboard/subjects">
          <Button variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
            Back to Subjects
          </Button>
        </Link>
      </div>

      <DetailSection title="Subject Information">
        <DetailField label="Subject Name" value={subject.name} />
        <DetailField label="Assigned Teachers" value={assignedTeachers.length} />
      </DetailSection>

      <Card className="border-slate-200 bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Assigned Teachers</h2>
        <div className="mt-5 space-y-3">
          {assignedTeachers.length === 0 ? (
            <p className="text-sm text-slate-500">No teachers are currently assigned to this subject.</p>
          ) : (
            assignedTeachers.map((teacher) => (
              <div key={teacher.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="font-medium text-slate-900">{teacher.name}</p>
                <p className="mt-1 text-sm text-slate-500">{teacher.email}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {teacher.role} • {teacher.assignedClass || "No class"} {teacher.assignedSection || ""}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default SubjectDetailPage;
