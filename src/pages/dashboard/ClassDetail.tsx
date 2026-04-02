import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { getClassDetail } from "../../services/adminService";
import type { ClassDetail } from "../../types/admin";
import { AdminPageHeader, DetailField, DetailSection } from "./adminPageUtils";

const quickLinkClassName =
  "rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-brand-300 hover:bg-brand-50";

export const ClassDetailPage = () => {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setDetail(await getClassDetail(id));
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load class.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  if (loading) {
    return <Card className="border-slate-200 bg-white shadow-sm">Loading class details...</Card>;
  }

  if (error || !detail) {
    return <Card className="border-rose-200 bg-rose-50 shadow-sm text-rose-700">{error || "Class not found."}</Card>;
  }

  const { classRecord, coordinator, students } = detail;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${classRecord.className} - ${classRecord.section}`}
        description="Detailed class profile connected to coordinator assignment, student roster, and academic workflow links."
        action={
          <Link to="/dashboard/classes">
            <Button variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
              Back to Classes
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Capacity</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{classRecord.capacity ?? "-"}</p>
          <p className="mt-2 text-sm text-slate-500">Configured classroom strength</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Students</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{students.length}</p>
          <p className="mt-2 text-sm text-slate-500">Students linked by class and section</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coordinator</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{coordinator?.name ?? "Not assigned"}</p>
          <p className="mt-2 text-sm text-slate-500">{coordinator?.subjectName ?? "No subject assigned"}</p>
        </Card>
      </div>

      <DetailSection title="Class Info">
        <DetailField label="Class Name" value={classRecord.className} />
        <DetailField label="Section" value={classRecord.section} />
        <DetailField label="Room Number" value={classRecord.roomNumber ?? "Not assigned"} />
        <DetailField label="Floor" value={classRecord.floor ?? "Not assigned"} />
        <DetailField label="Capacity" value={classRecord.capacity ?? "Not assigned"} />
      </DetailSection>

      <DetailSection title="Class Coordinator">
        <DetailField label="Teacher Name" value={coordinator?.name ?? "No coordinator assigned"} />
        <DetailField label="Subject" value={coordinator?.subjectName ?? "No subject assigned"} />
      </DetailSection>

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">Students List</h2>
          <p className="mt-1 text-sm text-slate-500">Students currently assigned to this class and section.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="responsive-table min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Parent</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={3} className="responsive-table-empty px-6 py-8 text-slate-500">
                    No students assigned to this class yet.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td data-label="Name" className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                    <td data-label="Parent" className="px-6 py-4 text-slate-600">{student.parentName ?? "Not linked"}</td>
                    <td data-label="Actions" className="px-6 py-4">
                      <Link to={`/dashboard/students/${student.id}`}>
                        <Button variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Quick Links</h2>
        <p className="mt-2 text-sm text-slate-500">Jump directly into the connected academic workflows for this class.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            to={`/dashboard/timetable?class=${encodeURIComponent(classRecord.className)}&section=${encodeURIComponent(classRecord.section)}`}
            className={quickLinkClassName}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Timetable</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">View Timetable</p>
            <p className="mt-1 text-sm text-slate-500">Open the weekly schedule grid for this class.</p>
          </Link>
          <Link
            to={`/dashboard/attendance?class=${encodeURIComponent(classRecord.className)}&section=${encodeURIComponent(classRecord.section)}`}
            className={quickLinkClassName}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Attendance</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">View Attendance</p>
            <p className="mt-1 text-sm text-slate-500">Review attendance sessions for this class and section.</p>
          </Link>
          <Link
            to={`/dashboard/results?class=${encodeURIComponent(classRecord.className)}&section=${encodeURIComponent(classRecord.section)}`}
            className={quickLinkClassName}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Results</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">View Results</p>
            <p className="mt-1 text-sm text-slate-500">Open subject results linked to this class.</p>
          </Link>
          <Link
            to={`/dashboard/fees?class=${encodeURIComponent(classRecord.className)}&section=${encodeURIComponent(classRecord.section)}`}
            className={quickLinkClassName}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Fees</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">View Fees</p>
            <p className="mt-1 text-sm text-slate-500">Review fee records for students in this class.</p>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ClassDetailPage;
