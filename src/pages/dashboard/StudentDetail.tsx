import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { listAttendance, listFees, listResults, getStudentDetail } from "../../services/adminService";
import { AdminPageHeader, DetailField, DetailSection } from "./adminPageUtils";
import type { AttendanceRecord, FeeRecord, ResultRecord, StudentRecord } from "../../types/admin";

const quickLinkClassName =
  "rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-brand-300 hover:bg-brand-50";

export const StudentDetailPage = () => {
  const { id = "" } = useParams();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const studentDetail = await getStudentDetail(id);
        setStudent(studentDetail);

        const [attendanceRows, resultRows, feeRows] = await Promise.all([
          listAttendance({
            className: studentDetail.className ?? undefined,
            section: studentDetail.section ?? undefined,
          }),
          listResults(),
          listFees(),
        ]);

        setAttendance(attendanceRows.filter((row) => row.studentId === studentDetail.id));
        setResults(resultRows.filter((row) => row.studentId === studentDetail.id));
        setFees(feeRows.filter((row) => row.studentId === studentDetail.id));
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load student.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const summary = useMemo(() => {
    const presentCount = attendance.filter((row) => row.status === "Present").length;
    const fee = fees[0] ?? null;
    return {
      attendanceCount: attendance.length,
      presentCount,
      resultCount: results.length,
      feeStatus: fee?.status ?? "No fee record",
      feeDue: fee?.dueDate ?? "-",
    };
  }, [attendance, results, fees]);

  if (loading) {
    return <Card className="border-slate-200 bg-white shadow-sm">Loading student details...</Card>;
  }

  if (error || !student) {
    return <Card className="border-rose-200 bg-rose-50 shadow-sm text-rose-700">{error || "Student not found."}</Card>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={student.name}
        description="Student hub with academic, parent, and finance relationships plus direct navigation to attendance, results, fees, and timetable."
        action={
          <Link to="/dashboard/students">
            <Button variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
              Back to Students
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attendance</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.attendanceCount}</p>
          <p className="mt-2 text-sm text-slate-500">{summary.presentCount} present records tracked</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Results</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.resultCount}</p>
          <p className="mt-2 text-sm text-slate-500">Subject marks linked to exams</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Fees Status</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{summary.feeStatus}</p>
          <p className="mt-2 text-sm text-slate-500">Due date: {summary.feeDue}</p>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Parent Link</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">{student.parentName ?? "Not linked"}</p>
          <p className="mt-2 text-sm text-slate-500">{student.parentEmail ?? "No parent email"}</p>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {student.photoUrl ? (
            <img
              src={student.photoUrl}
              alt={student.name}
              className="h-24 w-24 rounded-3xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-100 text-2xl font-semibold text-slate-500">
              {student.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student Photo</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {student.photoUrl ? "Profile picture added" : "No picture uploaded"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {student.photoUrl
                ? "This image is used anywhere the student profile is shown in the dashboard."
                : "Add a photo URL from the edit form to show the student's picture here and in the student list."}
            </p>
          </div>
        </div>
      </Card>

      <DetailSection title="Student Profile Card">
        <DetailField label="Name" value={student.name} />
        <DetailField label="Student ID" value={student.schoolId ?? "Not assigned"} />
        <DetailField label="Class" value={student.className ?? "Not assigned"} />
        <DetailField label="Section" value={student.section ?? "Not assigned"} />
        <DetailField label="Admission Date" value={student.admissionDate ?? "Not added"} />
        <DetailField label="Discount Fee" value={student.discountFee !== null ? String(student.discountFee) : "Not added"} />
        <DetailField label="Student Aadhar Number" value={student.studentAadharNumber ?? "Not added"} />
        <DetailField label="Date of Birth" value={student.dateOfBirth ?? "Not added"} />
        <DetailField label="Birth ID / NIC" value={student.birthId ?? "Not added"} />
        <DetailField label="Orphan Student" value={student.isOrphan ? "Yes" : "No"} />
        <DetailField label="Gender" value={student.gender ?? "Not added"} />
        <DetailField label="Cast / Caste" value={student.caste ?? "Not added"} />
        <DetailField label="OSC" value={student.osc ?? "Not added"} />
        <DetailField label="Identification Mark" value={student.identificationMark ?? "Not added"} />
        <DetailField label="Previous School" value={student.previousSchool ?? "Not added"} />
        <DetailField label="Region" value={student.region ?? "Not added"} />
        <DetailField label="Blood Group" value={student.bloodGroup ?? "Not added"} />
        <DetailField label="Previous ID / Board Roll No" value={student.previousBoardRollNo ?? "Not added"} />
        <DetailField label="Address" value={student.address ?? "Not added"} />
        <DetailField label="Photo" value={student.photoUrl ? "Uploaded" : "Not added"} />
      </DetailSection>

      <DetailSection title="Father Details">
        <DetailField label="Father Name" value={student.fatherName ?? "Not linked"} />
        <DetailField label="Father Aadhar Number" value={student.fatherAadharNumber ?? "Not added"} />
        <DetailField label="Occupation" value={student.fatherOccupation ?? "Not added"} />
        <DetailField label="Education" value={student.fatherEducation ?? "Not added"} />
        <DetailField label="Mobile Number" value={student.fatherMobileNumber ?? "Not linked"} />
        <DetailField label="Profession" value={student.fatherProfession ?? "Not added"} />
        <DetailField label="Income" value={student.fatherIncome !== null ? String(student.fatherIncome) : "Not added"} />
        <DetailField label="Mail ID" value={student.fatherEmail ?? "Not linked"} />
        <DetailField label="Parent Record ID" value={student.parentId ?? "Not linked"} />
      </DetailSection>

      <DetailSection title="Mother Details">
        <DetailField label="Mother Name" value={student.motherName ?? "Not added"} />
        <DetailField label="Mother Aadhar Number" value={student.motherAadharNumber ?? "Not added"} />
        <DetailField label="Occupation" value={student.motherOccupation ?? "Not added"} />
        <DetailField label="Education" value={student.motherEducation ?? "Not added"} />
        <DetailField label="Mobile Number" value={student.motherMobileNumber ?? "Not added"} />
        <DetailField label="Profession" value={student.motherProfession ?? "Not added"} />
        <DetailField label="Income" value={student.motherIncome !== null ? String(student.motherIncome) : "Not added"} />
      </DetailSection>

      <Card className="border-slate-200 bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Quick Action Links</h2>
        <p className="mt-2 text-sm text-slate-500">
          Jump into the connected student workflows from one place.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link to={`/dashboard/attendance?studentId=${student.id}`} className={quickLinkClassName}>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Attendance</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">View Attendance</p>
            <p className="mt-1 text-sm text-slate-500">Open attendance records for this student.</p>
          </Link>
          <Link to={`/dashboard/results?studentId=${student.id}`} className={quickLinkClassName}>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Results</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">View Results</p>
            <p className="mt-1 text-sm text-slate-500">Check exam-linked marks and grades.</p>
          </Link>
          <Link to={`/dashboard/fees?studentId=${student.id}`} className={quickLinkClassName}>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Fees</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">View Fees</p>
            <p className="mt-1 text-sm text-slate-500">Review payment status and due dates.</p>
          </Link>
          <Link
            to={`/dashboard/timetable${student.className && student.section ? `?class=${encodeURIComponent(student.className)}&section=${encodeURIComponent(student.section)}` : ""}`}
            className={quickLinkClassName}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Timetable</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">View Timetable</p>
            <p className="mt-1 text-sm text-slate-500">Go to the class schedule for this student.</p>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default StudentDetailPage;
