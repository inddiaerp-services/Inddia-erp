import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { authStore } from "../../store/authStore";
import { getChildrenByParentUserId } from "../../services/adminService";
import { AdminPageHeader, DetailField, DetailSection } from "./adminPageUtils";
import type { StudentRecord } from "../../types/admin";

export const ChildPage = () => {
  const { user } = authStore();
  const [child, setChild] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      setLoading(true);
      try {
        const children = await getChildrenByParentUserId(user.id);
        setChild(children[0] ?? null);
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load child details.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [user]);

  if (loading) return <Card className="border-slate-200 bg-white shadow-sm">Loading child details...</Card>;
  if (error || !child) return <Card className="border-rose-200 bg-rose-50 shadow-sm text-rose-700">{error || "No child linked."}</Card>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Child Details"
        description="Parent view of the linked child profile with direct access to attendance, results, fees, and timetable."
        action={
          <Link to="/dashboard/home">
            <Button variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">Back to Dashboard</Button>
          </Link>
        }
      />
      <DetailSection title="Child Profile">
        <DetailField label="Name" value={child.name} />
        <DetailField label="Student ID" value={child.schoolId ?? "-"} />
        <DetailField label="Class" value={child.className ?? "-"} />
        <DetailField label="Section" value={child.section ?? "-"} />
      </DetailSection>
      <DetailSection title="Quick Links">
        <DetailField label="Attendance" value={<Link to={`/dashboard/attendance?studentId=${child.id}`} className="text-brand-700">Open Attendance</Link>} />
        <DetailField label="Results" value={<Link to={`/dashboard/results?studentId=${child.id}`} className="text-brand-700">Open Results</Link>} />
        <DetailField label="Fees" value={<Link to={`/dashboard/fees?studentId=${child.id}`} className="text-brand-700">Open Fees</Link>} />
        <DetailField label="Timetable" value={<Link to={`/dashboard/timetable?class=${encodeURIComponent(child.className ?? "")}&section=${encodeURIComponent(child.section ?? "")}`} className="text-brand-700">Open Timetable</Link>} />
      </DetailSection>
    </div>
  );
};

export default ChildPage;
