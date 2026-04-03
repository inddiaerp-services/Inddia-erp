import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import DataTable from "../../components/ui/DataTable";
import { AdminPageHeader, CompactMetricCard } from "./adminPageUtils";
import {
  createEmployee,
  deleteEmployee,
  getSelectableSubjects,
  listEmployees,
  staffRoleOptions,
  updateEmployee,
} from "../../services/adminService";
import type { EmployeeFormValues, EmployeeRecord, SubjectRecord } from "../../types/admin";
import { prepareProfileImage } from "../../utils/profileImage";

const emptyForm: EmployeeFormValues = {
  name: "",
  email: "",
  mobileNumber: "",
  photoUrl: "",
  password: "",
  role: "Teacher",
  dateOfJoining: "",
  monthlySalary: "",
  subjectId: "",
  assignedClass: "",
  assignedSection: "",
  isClassCoordinator: false,
};

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  employee: EmployeeRecord | null;
};

const EmployeeIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TeacherIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="m3 8 9-5 9 5-9 5-9-5Z" />
    <path d="M7 10.5v4.5c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5" />
  </svg>
);

const CoordinatorIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M8 2v4M16 2v4M3 10h18" />
    <path d="m10 14 2 2 4-4" />
  </svg>
);

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [form, setForm] = useState<EmployeeFormValues>(emptyForm);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create", employee: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [coordinatorFilter, setCoordinatorFilter] = useState("");
  const filteredEmployees = employees.filter((member) => {
    const haystack = `${member.name} ${member.email} ${member.mobileNumber} ${member.role} ${member.subjectName ?? ""} ${member.assignedClass ?? ""} ${member.assignedSection ?? ""}`.toLowerCase();
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
    const matchesRole = !roleFilter || member.role === roleFilter;
    const matchesCoordinator =
      !coordinatorFilter ||
      (coordinatorFilter === "yes" ? member.isClassCoordinator : !member.isClassCoordinator);
    return matchesSearch && matchesRole && matchesCoordinator;
  });
  const totalTeachers = employees.filter((member) => member.role === "Teacher").length;
  const totalCoordinators = employees.filter((member) => member.isClassCoordinator).length;

  const loadData = async () => {
    setLoading(true);
    try {
      const [employeeData, subjectData] = await Promise.all([listEmployees(), getSelectableSubjects()]);
      setEmployees(employeeData);
      setSubjects(subjectData);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: "create", employee: null });
    setForm(emptyForm);
    setFormError("");
    setProcessingPhoto(false);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setModal({ open: true, mode: "create", employee: null });
  };

  const openEdit = (employee: EmployeeRecord) => {
    setForm({
      name: employee.name,
      email: employee.email,
      mobileNumber: employee.mobileNumber,
      photoUrl: employee.photoUrl ?? "",
      password: "",
      role: employee.role,
      dateOfJoining: employee.dateOfJoining ?? "",
      monthlySalary: employee.monthlySalary != null ? String(employee.monthlySalary) : "",
      subjectId: "",
      assignedClass: employee.assignedClass ?? "",
      assignedSection: employee.assignedSection ?? "",
      isClassCoordinator: employee.isClassCoordinator,
    });
    setFormError("");
    setModal({ open: true, mode: "edit", employee });
  };

  const handleChange = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "role" && value !== "Teacher") {
        next.subjectId = "";
      }

      return next;
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
      setFormError(photoError instanceof Error ? photoError.message : "Failed to process employee image.");
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
      const payload: EmployeeFormValues = {
        ...form,
        subjectId: form.role === "Teacher" ? form.subjectId : "",
        assignedClass: "",
        assignedSection: "",
        isClassCoordinator: false,
      };

      if (modal.mode === "create") {
        await createEmployee(payload);
      } else if (modal.employee) {
        await updateEmployee(modal.employee.id, payload);
      }
      closeModal();
      await loadData();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save employee.";
      setFormError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employee: EmployeeRecord) => {
    if (!window.confirm(`Delete employee account for "${employee.name}"?`)) return;
    try {
      await deleteEmployee(employee.id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete employee.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Employees"
        description="Manage employee records with the same HR workflow used for staff creation, role assignment, and subject links."
        action={<Button onClick={openCreate}>+ Add Employee</Button>}
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees..."
            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            labelClassName="text-slate-700"
            errorClassName="text-rose-600"
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All</option>
              {staffRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Coordinator</span>
            <select
              value={coordinatorFilter}
              onChange={(event) => setCoordinatorFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <CompactMetricCard label="Total Employees" value={employees.length} detail="All employee profiles available in the HR workspace." icon={<EmployeeIcon />} />
        <CompactMetricCard label="Teachers" value={totalTeachers} detail="Employees linked with teaching roles and subjects." icon={<TeacherIcon />} />
        <CompactMetricCard label="Coordinators" value={totalCoordinators} detail="Class coordinators currently assigned in the ERP." icon={<CoordinatorIcon />} />
      </div>

      <DataTable
        title="Employee Directory"
        description="The HR employee directory now uses the same add and edit experience as the admin staff screen."
        data={filteredEmployees}
        getRowId={(member) => member.id}
        loading={loading}
        loadingMessage="Loading employees..."
        emptyMessage="No matching employee records found."
        mobileTitle={(member) => member.name}
        mobileSubtitle={(member) => member.email}
        columns={[
          {
            key: "name",
            label: "Employee",
            render: (member) => (
              <div className="flex min-w-[220px] items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                  ) : (
                    member.name.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{member.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{member.email}</p>
                </div>
              </div>
            ),
            emphasis: true,
          },
          {
            key: "role",
            label: "Role",
            render: (member) => (
              <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {member.role}
              </span>
            ),
          },
          {
            key: "subject",
            label: "Subject",
            render: (member) => member.subjectName ?? "Not assigned",
          },
          {
            key: "assignment",
            label: "Assignment",
            render: (member) =>
              member.assignedClass && member.assignedSection
                ? `${member.assignedClass} / ${member.assignedSection}`
                : "No class assigned",
          },
          {
            key: "coordinator",
            label: "Coordinator",
            render: (member) => (
              <span
                className={
                  member.isClassCoordinator
                    ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                    : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                }
              >
                {member.isClassCoordinator ? "Yes" : "No"}
              </span>
            ),
          },
        ]}
        renderActions={(member) => (
          <div className="inline-flex flex-nowrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 whitespace-nowrap">
            <Link
              to={`/dashboard/employees/${member.id}`}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              View
            </Link>
            <button
              type="button"
              onClick={() => openEdit(member)}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(member)}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Delete
            </button>
          </div>
        )}
      />

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.mode === "create" ? "Add Employee" : "Edit Employee"}
        description="Use the same employee setup flow here that admin uses for staff creation."
        maxWidthClass="max-w-4xl"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-brand-600">Employee Profile</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input
                    label="Full Name"
                    value={form.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                    required
                    placeholder="Enter employee name"
                    className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                    labelClassName="text-slate-700"
                    errorClassName="text-rose-600"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    required
                    placeholder="employee@school.com"
                    className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                    labelClassName="text-slate-700"
                    errorClassName="text-rose-600"
                  />
                  <Input
                    label="Mobile Number"
                    value={form.mobileNumber}
                    onChange={(event) => handleChange("mobileNumber", event.target.value)}
                    required
                    placeholder="9876543210"
                    className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                    labelClassName="text-slate-700"
                    errorClassName="text-rose-600"
                  />
                  <Input
                    label={modal.mode === "create" ? "Password" : "Reset Password"}
                    type="text"
                    value={form.password}
                    onChange={(event) => handleChange("password", event.target.value)}
                    required={modal.mode === "create"}
                    placeholder={modal.mode === "create" ? "Set password for new employee" : "Leave blank to keep current password"}
                    className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                    labelClassName="text-slate-700"
                    errorClassName="text-rose-600"
                  />
                  <Input
                    label="Date Of Joining"
                    type="date"
                    value={form.dateOfJoining}
                    onChange={(event) => handleChange("dateOfJoining", event.target.value)}
                    required
                    className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                    labelClassName="text-slate-700"
                    errorClassName="text-rose-600"
                  />
                  <Input
                    label="Monthly Salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monthlySalary}
                    onChange={(event) => handleChange("monthlySalary", event.target.value)}
                    required
                    placeholder="25000"
                    className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                    labelClassName="text-slate-700"
                    errorClassName="text-rose-600"
                  />
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
                    <select
                      value={form.role}
                      onChange={(event) => handleChange("role", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                      required
                    >
                      {staffRoleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-brand-600">Teaching Assignment</p>
                <div className="mt-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Subject</span>
                    <select
                      value={form.subjectId}
                      onChange={(event) => handleChange("subjectId", event.target.value)}
                      disabled={form.role !== "Teacher"}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">{form.role === "Teacher" ? "Select subject" : "Only teachers need subjects"}</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-brand-600">Profile Photo</p>
              <div className="mt-4 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-center">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-500">
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt="Employee preview" className="h-full w-full object-cover" />
                  ) : (
                    (form.name.trim()[0] ?? "E").toUpperCase()
                  )}
                </div>
                <p className="mt-4 text-sm font-medium text-slate-700">
                  {processingPhoto ? "Processing image..." : "Upload a profile image"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Images are resized before saving so the employee directory stays lightweight.
                </p>
                <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100">
                  Choose Image
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => void handlePhotoSelect(event)} />
                </label>
                {form.photoUrl ? (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="mt-3 text-sm font-medium text-rose-600 transition hover:text-rose-700"
                  >
                    Remove image
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="bg-slate-100 text-slate-700 hover:bg-slate-200"
              onClick={closeModal}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || processingPhoto}>
              {saving ? "Saving..." : modal.mode === "create" ? "Create Employee" : "Update Employee"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
