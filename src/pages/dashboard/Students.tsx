import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import ActionIconButton from "../../components/ui/ActionIconButton";
import { AdminPageHeader } from "./adminPageUtils";
import {
  createStudent,
  deleteStudent,
  getStaffByUserId,
  listClasses,
  listStudents,
  updateStudent,
} from "../../services/adminService";
import { authStore } from "../../store/authStore";
import { ROLES } from "../../config/roles";
import { normalizeStaffWorkspace, STAFF_WORKSPACES } from "../../config/staffWorkspaces";
import type { ClassRecord, StudentFormValues, StudentRecord } from "../../types/admin";
import { prepareProfileImage } from "../../utils/profileImage";

const emptyForm: StudentFormValues = {
  studentName: "",
  photoUrl: "",
  schoolId: "",
  className: "",
  section: "",
  admissionDate: "",
  discountFee: "",
  studentAadharNumber: "",
  studentPassword: "",
  dateOfBirth: "",
  birthId: "",
  isOrphan: false,
  gender: "",
  caste: "",
  osc: "",
  identificationMark: "",
  previousSchool: "",
  region: "",
  bloodGroup: "",
  previousBoardRollNo: "",
  address: "",
  fatherName: "",
  fatherAadharNumber: "",
  fatherOccupation: "",
  fatherEducation: "",
  fatherMobileNumber: "",
  fatherProfession: "",
  fatherIncome: "",
  fatherEmail: "",
  fatherPassword: "",
  motherName: "",
  motherAadharNumber: "",
  motherOccupation: "",
  motherEducation: "",
  motherMobileNumber: "",
  motherProfession: "",
  motherIncome: "",
};

const genderOptions = ["Male", "Female", "Other"];
const regionOptions = ["Urban", "Rural", "Semi-Urban", "Tribal"];
const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  student: StudentRecord | null;
};

export const StudentsPage = () => {
  const { role, user, school, loading: authLoading } = authStore();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [form, setForm] = useState<StudentFormValues>(emptyForm);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create", student: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [canCreateStudent, setCanCreateStudent] = useState(role === ROLES.ADMIN);
  const canManageStudentRecords = role === ROLES.ADMIN;
  const filteredStudents = students.filter((student) => {
    const haystack = `${student.name} ${student.schoolId ?? ""} ${student.className ?? ""} ${student.section ?? ""} ${student.fatherName ?? ""} ${student.motherName ?? ""}`.toLowerCase();
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
    const matchesClass = !classFilter || student.className === classFilter;
    const matchesSection = !sectionFilter || student.section === sectionFilter;
    return matchesSearch && matchesClass && matchesSection;
  });
  const classOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...classes.map((item) => item.className),
          ...students.map((item) => item.className).filter((value): value is string => Boolean(value)),
        ]),
      ).sort((a, b) => a.localeCompare(b)),
    [classes, students],
  );
  const availableSections = useMemo(
    () =>
      Array.from(
        new Set([
          ...classes.filter((item) => item.className === form.className).map((item) => item.section),
          ...students
            .filter((item) => item.className === form.className)
            .map((item) => item.section)
            .filter((value): value is string => Boolean(value)),
        ]),
      )
        .sort((a, b) => a.localeCompare(b)),
    [classes, form.className, students],
  );
  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          classFilter
            ? [
                ...classes.filter((item) => item.className === classFilter).map((item) => item.section),
                ...students
                  .filter((item) => item.className === classFilter)
                  .map((item) => item.section)
                  .filter((value): value is string => Boolean(value)),
              ]
            : [
                ...classes.map((item) => item.section),
                ...students.map((item) => item.section).filter((value): value is string => Boolean(value)),
              ],
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [classFilter, classes, students],
  );
  const studentStats = useMemo(
    () => [
      { label: "Total Students", value: String(students.length), detail: "Active student records" },
      { label: "Filtered Results", value: String(filteredStudents.length), detail: "Students in current view" },
      { label: "Classes", value: String(classOptions.length), detail: "Classes with enrollments" },
      { label: "Sections", value: String(sectionOptions.length), detail: "Available section splits" },
    ],
    [classOptions.length, filteredStudents.length, sectionOptions.length, students.length],
  );

  const loadStudents = async () => {
    setLoading(true);
    try {
      setStudents(await listStudents());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      setClasses(await listClasses());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load classes.");
    }
  };

  useEffect(() => {
    if (authLoading || (!school?.id && !user?.schoolId)) {
      return;
    }

    void loadStudents();
    void loadClasses();
  }, [authLoading, school?.id, user?.schoolId]);

  useEffect(() => {
    let active = true;

    if (role === ROLES.ADMIN) {
      setCanCreateStudent(true);
      return () => {
        active = false;
      };
    }

    if (role !== ROLES.STAFF || !user?.id) {
      setCanCreateStudent(false);
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const staff = await getStaffByUserId(user.id);
        if (active) {
          setCanCreateStudent(normalizeStaffWorkspace(staff?.role) === STAFF_WORKSPACES.ADMISSION);
        }
      } catch {
        if (active) {
          setCanCreateStudent(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [role, user?.id]);

  const closeModal = () => {
    setModal({ open: false, mode: "create", student: null });
    setForm(emptyForm);
    setFormError("");
    setProcessingPhoto(false);
  };

  const openCreate = () => {
    if (!canCreateStudent) {
      setError("Only admin and admission workspace staff can add students.");
      return;
    }
    setForm(emptyForm);
    setFormError("");
    setModal({ open: true, mode: "create", student: null });
  };

  const openEdit = (student: StudentRecord) => {
    if (!canManageStudentRecords) {
      setError("Only admin can edit student records.");
      return;
    }
    setForm({
      studentName: student.name,
      photoUrl: student.photoUrl ?? "",
      schoolId: student.schoolId ?? "",
      className: student.className ?? "",
      section: student.section ?? "",
      admissionDate: student.admissionDate ?? "",
      discountFee: student.discountFee?.toString() ?? "",
      studentAadharNumber: student.studentAadharNumber ?? "",
      studentPassword: "",
      dateOfBirth: student.dateOfBirth ?? "",
      birthId: student.birthId ?? "",
      isOrphan: student.isOrphan,
      gender: student.gender ?? "",
      caste: student.caste ?? "",
      osc: student.osc ?? "",
      identificationMark: student.identificationMark ?? "",
      previousSchool: student.previousSchool ?? "",
      region: student.region ?? "",
      bloodGroup: student.bloodGroup ?? "",
      previousBoardRollNo: student.previousBoardRollNo ?? "",
      address: student.address ?? "",
      fatherName: student.fatherName ?? "",
      fatherAadharNumber: student.fatherAadharNumber ?? "",
      fatherOccupation: student.fatherOccupation ?? "",
      fatherEducation: student.fatherEducation ?? "",
      fatherMobileNumber: student.fatherMobileNumber ?? "",
      fatherProfession: student.fatherProfession ?? "",
      fatherIncome: student.fatherIncome?.toString() ?? "",
      fatherEmail: student.fatherEmail ?? "",
      fatherPassword: "",
      motherName: student.motherName ?? "",
      motherAadharNumber: student.motherAadharNumber ?? "",
      motherOccupation: student.motherOccupation ?? "",
      motherEducation: student.motherEducation ?? "",
      motherMobileNumber: student.motherMobileNumber ?? "",
      motherProfession: student.motherProfession ?? "",
      motherIncome: student.motherIncome?.toString() ?? "",
    });
    setFormError("");
    setModal({ open: true, mode: "edit", student });
  };

  const handleChange = <K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) => {
    setForm((current) => {
      if (key === "className") {
        return { ...current, className: value as string, section: "" };
      }

      return { ...current, [key]: value };
    });
  };

  const handlePhotoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setProcessingPhoto(true);
    setFormError("");

    try {
      const preparedImage = await prepareProfileImage(file);
      handleChange("photoUrl", preparedImage);
    } catch (photoError) {
      setFormError(photoError instanceof Error ? photoError.message : "Failed to process student image.");
    } finally {
      setProcessingPhoto(false);
    }
  };

  const removePhoto = () => {
    handleChange("photoUrl", "");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (modal.mode === "create") {
        await createStudent(form);
      } else if (
        modal.student?.parentId &&
        modal.student.parentUserId
      ) {
        await updateStudent(
          modal.student.id,
          modal.student.userId,
          modal.student.parentId,
          modal.student.parentUserId,
          form,
        );
      } else {
        throw new Error("Student parent link is missing.");
      }

      closeModal();
      await loadStudents();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save student.";
      setFormError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: StudentRecord) => {
    if (!canManageStudentRecords) {
      setError("Only admin can delete student records.");
      return;
    }
    if (!window.confirm(`Delete student "${student.name}" and the linked parent account?`)) return;
    try {
      await deleteStudent(student.id);
      await loadStudents();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete student.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Students"
        description={canManageStudentRecords
          ? "Manage student enrollment and mandatory parent linking with real Supabase inserts, updates, and deletes."
          : "Admission staff can create student records here. Editing and deleting remain admin-only."}
        action={canCreateStudent ? <Button onClick={openCreate}>+ Add Student</Button> : undefined}
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {studentStats.map((stat) => (
          <Card key={stat.label} className="erp-kpi-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{stat.label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
            <p className="mt-2 text-sm text-slate-500">{stat.detail}</p>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_220px_220px]">
          <Input
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search students..."
            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            labelClassName="text-slate-700"
            errorClassName="text-rose-600"
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Class</span>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="erp-select"
            >
              <option value="">All</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Section</span>
            <select
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
              className="erp-select"
            >
              <option value="">All</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <DataTable
        data={filteredStudents}
        getRowId={(student) => student.id}
        loading={loading}
        loadingMessage="Loading students..."
        emptyMessage={filteredStudents.length === 0 && students.length > 0 ? "No matching students found." : "No students found."}
        mobileTitle={(student) => student.name}
        mobileSubtitle={(student) => `${student.className ?? "-"} / ${student.section ?? "-"}`}
        columns={[
          {
            key: "id",
            label: "ID",
            render: (student) => student.schoolId ?? "-",
          },
          {
            key: "name",
            label: "Name",
            render: (student) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt={student.name} className="h-full w-full object-cover" />
                  ) : (
                    student.name.slice(0, 1).toUpperCase()
                  )}
                </div>
                <span>{student.name}</span>
              </div>
            ),
            emphasis: true,
          },
          { key: "class", label: "Class", render: (student) => student.className ?? "-" },
          { key: "section", label: "Section", render: (student) => student.section ?? "-" },
          { key: "gender", label: "Gender", render: (student) => student.gender ?? "-" },
          {
            key: "status",
            label: "Status",
            render: (student) => (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                {student.parentName ? "Active" : "Pending"}
              </span>
            ),
          },
        ]}
        renderActions={(student) => (
          <div className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
            <Link to={`/dashboard/students/${student.id}`}>
              <ActionIconButton action="view" />
            </Link>
            {canManageStudentRecords ? <ActionIconButton action="edit" onClick={() => openEdit(student)} /> : null}
            {canManageStudentRecords ? <ActionIconButton action="delete" onClick={() => void handleDelete(student)} /> : null}
          </div>
        )}
      />

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.mode === "create" ? "Add Student" : "Edit Student"}
        description="Create linked student and parent records with one clean admin workflow."
        maxWidthClass="max-w-5xl"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-600">Student Information</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Student Account</h3>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <Input
                label="Student Name"
                value={form.studentName}
                onChange={(event) => handleChange("studentName", event.target.value)}
                required
                className="border-slate-200 bg-white text-slate-900"
                placeholder="Student full name"
              />
              <Input
                label="Student ID"
                value={form.schoolId}
                onChange={(event) => handleChange("schoolId", event.target.value.toUpperCase())}
                required
                className="border-slate-200 bg-white text-slate-900"
                placeholder="Example: STU-0001"
              />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Select Class</span>
                <select
                  value={form.className}
                  onChange={(event) => handleChange("className", event.target.value)}
                  required
                  className="erp-select"
                >
                  <option value="">Select class</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Select Section</span>
                <select
                  value={form.section}
                  onChange={(event) => handleChange("section", event.target.value)}
                  required
                  disabled={!form.className}
                  className="erp-select disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">{form.className ? "Select section" : "Select class first"}</option>
                  {availableSections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">Profile Picture Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handlePhotoSelect(event)}
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700"
                />
                <p className="mt-2 text-xs text-slate-500">Upload a student profile picture for the admin dashboard.</p>
              </label>
              {processingPhoto ? (
                <div className="md:col-span-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                  Processing selected image...
                </div>
              ) : null}
              {form.photoUrl ? (
                <div className="md:col-span-2">
                  <div className="inline-flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <img src={form.photoUrl} alt="Student preview" className="h-16 w-16 rounded-full object-cover" />
                    <div className="text-sm text-slate-600">Student picture preview</div>
                    <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={removePhoto}>
                      Remove Photo
                    </Button>
                  </div>
                </div>
              ) : null}
              <Input
                label="Date of Admission"
                type="date"
                value={form.admissionDate}
                onChange={(event) => handleChange("admissionDate", event.target.value)}
                className="border-slate-200 bg-white text-slate-900"
              />
              <Input
                label="Discount Fee"
                type="number"
                min="0"
                step="0.01"
                value={form.discountFee}
                onChange={(event) => handleChange("discountFee", event.target.value)}
                className="border-slate-200 bg-white text-slate-900"
                placeholder="0"
              />
              <Input
                label="Student Aadhar Number"
                value={form.studentAadharNumber}
                onChange={(event) => handleChange("studentAadharNumber", event.target.value)}
                className="border-slate-200 bg-white text-slate-900"
                placeholder="Aadhar number"
              />
              <Input
                label={modal.mode === "create" ? "Password" : "Password (leave blank to keep current)"}
                type="password"
                value={form.studentPassword}
                onChange={(event) => handleChange("studentPassword", event.target.value)}
                required={modal.mode === "create"}
                className="border-slate-200 bg-white text-slate-900"
                placeholder="Student login password"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-600">Other Information</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Personal and Academic Background</h3>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(event) => handleChange("dateOfBirth", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Student Birth ID / NIC" value={form.birthId} onChange={(event) => handleChange("birthId", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Orphan Student</span>
                <select value={form.isOrphan ? "yes" : "no"} onChange={(event) => handleChange("isOrphan", event.target.value === "yes")} className="erp-select">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Gender</span>
                <select value={form.gender} onChange={(event) => handleChange("gender", event.target.value)} className="erp-select">
                  <option value="">Select gender</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Cast / Caste" value={form.caste} onChange={(event) => handleChange("caste", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">OSC</span>
                <select value={form.osc} onChange={(event) => handleChange("osc", event.target.value as StudentFormValues["osc"])} className="erp-select">
                  <option value="">Select OSC</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </label>
              <Input label="Identification Mark" value={form.identificationMark} onChange={(event) => handleChange("identificationMark", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Previous School" value={form.previousSchool} onChange={(event) => handleChange("previousSchool", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Region</span>
                <select value={form.region} onChange={(event) => handleChange("region", event.target.value)} className="erp-select">
                  <option value="">Select region</option>
                  {regionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Blood Group</span>
                <select value={form.bloodGroup} onChange={(event) => handleChange("bloodGroup", event.target.value)} className="erp-select">
                  <option value="">Select blood group</option>
                  {bloodGroupOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Previous ID / Board Roll No" value={form.previousBoardRollNo} onChange={(event) => handleChange("previousBoardRollNo", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">Address</span>
                <textarea
                  value={form.address}
                  onChange={(event) => handleChange("address", event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-200/70"
                  placeholder="Student address"
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-600">Father Information</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Primary Parent Login</h3>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <Input label="Father Name" value={form.fatherName} onChange={(event) => handleChange("fatherName", event.target.value)} required className="border-slate-200 bg-white text-slate-900" />
              <Input label="Father Aadhar Number" value={form.fatherAadharNumber} onChange={(event) => handleChange("fatherAadharNumber", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Occupation" value={form.fatherOccupation} onChange={(event) => handleChange("fatherOccupation", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Education" value={form.fatherEducation} onChange={(event) => handleChange("fatherEducation", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Mobile Number" value={form.fatherMobileNumber} onChange={(event) => handleChange("fatherMobileNumber", event.target.value)} required className="border-slate-200 bg-white text-slate-900" />
              <Input label="Profession" value={form.fatherProfession} onChange={(event) => handleChange("fatherProfession", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Income" type="number" min="0" step="0.01" value={form.fatherIncome} onChange={(event) => handleChange("fatherIncome", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Mail ID" type="email" value={form.fatherEmail} onChange={(event) => handleChange("fatherEmail", event.target.value)} required className="border-slate-200 bg-white text-slate-900" placeholder="father@email.com" />
              <Input
                label={modal.mode === "create" ? "Password" : "Password (leave blank to keep current)"}
                type="password"
                value={form.fatherPassword}
                onChange={(event) => handleChange("fatherPassword", event.target.value)}
                required={modal.mode === "create"}
                className="border-slate-200 bg-white text-slate-900"
                placeholder="Father login password"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-600">Mother Information</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Mother Profile</h3>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <Input label="Mother Name" value={form.motherName} onChange={(event) => handleChange("motherName", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Mother Aadhar Number" value={form.motherAadharNumber} onChange={(event) => handleChange("motherAadharNumber", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Occupation" value={form.motherOccupation} onChange={(event) => handleChange("motherOccupation", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Education" value={form.motherEducation} onChange={(event) => handleChange("motherEducation", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Mobile Number" value={form.motherMobileNumber} onChange={(event) => handleChange("motherMobileNumber", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Profession" value={form.motherProfession} onChange={(event) => handleChange("motherProfession", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
              <Input label="Income" type="number" min="0" step="0.01" value={form.motherIncome} onChange={(event) => handleChange("motherIncome", event.target.value)} className="border-slate-200 bg-white text-slate-900" />
            </div>
          </div>

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || processingPhoto}>
              {processingPhoto ? "Processing Photo..." : saving ? "Saving..." : modal.mode === "create" ? "Create Student" : "Update Student"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentsPage;
