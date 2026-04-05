import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import DataTable from "../../components/ui/DataTable";
import { AdminPageHeader, CompactMetricCard } from "./adminPageUtils";
import {
  bulkImportStaff,
  deleteAllStaff,
  deleteStaff,
  createStaffWithRole,
  getSelectableSubjects,
  listStaff,
  previewBulkImportStaff,
  staffRoleOptions,
  updateStaff,
} from "../../services/adminService";
import type { BulkImportResult, StaffFormValues, StaffRecord, SubjectRecord } from "../../types/admin";
import { prepareProfileImage } from "../../utils/profileImage";
import { authStore } from "../../store/authStore";
import { ROLES } from "../../config/roles";

const emptyForm: StaffFormValues = {
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
  staff: StaffRecord | null;
};

const StaffIcon = () => (
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

export const StaffPage = () => {
  const { role } = authStore();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [form, setForm] = useState<StaffFormValues>(emptyForm);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create", staff: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [coordinatorFilter, setCoordinatorFilter] = useState("");
  const filteredStaff = staff.filter((member) => {
    const haystack = `${member.name} ${member.email} ${member.mobileNumber} ${member.role} ${member.subjectName ?? ""} ${member.assignedClass ?? ""} ${member.assignedSection ?? ""}`.toLowerCase();
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
    const matchesRole = !roleFilter || member.role === roleFilter;
    const matchesCoordinator =
      !coordinatorFilter ||
      (coordinatorFilter === "yes" ? member.isClassCoordinator : !member.isClassCoordinator);
    return matchesSearch && matchesRole && matchesCoordinator;
  });
  const requiresSubject = form.role === "Teacher";
  const totalTeachers = staff.filter((member) => member.role === "Teacher").length;
  const totalCoordinators = staff.filter((member) => member.isClassCoordinator).length;
  const canDeleteAllStaff = role === ROLES.ADMIN;
  const canManageStaffRecords = role === ROLES.ADMIN;
  const isPrincipalRole = form.role.trim().toLowerCase() === "principal";

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffData, subjectData] = await Promise.all([listStaff(), getSelectableSubjects()]);
      setStaff(staffData);
      setSubjects(subjectData);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: "create", staff: null });
    setForm(emptyForm);
    setFormError("");
    setProcessingPhoto(false);
  };

  const openCreate = () => {
    if (!canManageStaffRecords) {
      setError("Only school admin can create staff records.");
      return;
    }

    setForm(emptyForm);
    setFormError("");
    setModal({ open: true, mode: "create", staff: null });
  };

  const openEdit = (member: StaffRecord) => {
    if (!canManageStaffRecords) {
      setError("Principal can view staff records only.");
      return;
    }

    setForm({
      name: member.name,
      email: member.email,
      mobileNumber: member.mobileNumber,
      photoUrl: member.photoUrl ?? "",
      password: "",
      role: member.role,
      dateOfJoining: member.dateOfJoining ?? "",
      monthlySalary: member.monthlySalary != null ? String(member.monthlySalary) : "",
      subjectId: member.subjectId ?? "",
      assignedClass: member.assignedClass ?? "",
      assignedSection: member.assignedSection ?? "",
      isClassCoordinator: member.isClassCoordinator,
    });
    setFormError("");
    setModal({ open: true, mode: "edit", staff: member });
  };

  const handleChange = <K extends keyof StaffFormValues>(key: K, value: StaffFormValues[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "role" && value !== "Teacher") {
        next.subjectId = "";
      }

      if (key === "role" && String(value).trim().toLowerCase() === "principal") {
        next.subjectId = "";
        next.assignedClass = "";
        next.assignedSection = "";
        next.isClassCoordinator = false;
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
      setFormError(photoError instanceof Error ? photoError.message : "Failed to process staff image.");
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
      const payload: StaffFormValues = {
        ...form,
        subjectId: form.role === "Teacher" ? form.subjectId : "",
        assignedClass: "",
        assignedSection: "",
        isClassCoordinator: false,
      };

      if (modal.mode === "create") {
        await createStaffWithRole(payload);
      } else if (modal.staff) {
        await updateStaff(modal.staff.id, modal.staff.userId, payload);
      }
      closeModal();
      await loadData();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save staff.";
      setFormError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: StaffRecord) => {
    if (!canManageStaffRecords) {
      setError("Principal can view staff records only.");
      return;
    }

    if (!window.confirm(`Delete staff account for "${member.name}"?`)) return;
    try {
      await deleteStaff(member.id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete staff.");
    }
  };

  const handleDeleteAllStaff = async () => {
    if (!canDeleteAllStaff) {
      setError("Only admin can delete all staff records.");
      return;
    }

    if (!staff.length) {
      setError("There are no staff records to delete.");
      return;
    }

    if (!window.confirm(`Delete all ${staff.length} staff records and linked login accounts for this school?`)) {
      return;
    }

    setDeletingAll(true);
    try {
      await deleteAllStaff();
      setImportResult(null);
      setError("");
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete all staff.");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const { utils, writeFile } = await import("xlsx");
    const workbook = utils.book_new();
    const worksheet = utils.json_to_sheet([
      {
        name: "Asha Teacher",
        email: "asha.teacher@school.com",
        mobileNumber: "9876543210",
        password: "Staff@123",
        role: "Teacher",
        dateOfJoining: "2026-04-01",
        monthlySalary: "25000",
        subjectName: "Mathematics",
        photoUrl: "",
      },
    ]);
    utils.book_append_sheet(workbook, worksheet, "Staff Import");
    writeFile(workbook, "staff-import-template.xlsx");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const { read, utils } = await import("xlsx");
      const workbook = read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("The selected Excel file does not contain any sheet.");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

      if (rows.length === 0) {
        throw new Error("The selected Excel sheet is empty.");
      }

      const preview = await previewBulkImportStaff(rows);

      if (preview.blockingCount > 0) {
        const blockingEmails = preview.conflicts
          .filter((item) => !item.replaceable)
          .map((item) => item.email)
          .join(", ");
        throw new Error(
          `These email addresses already belong to another active account and cannot be replaced: ${blockingEmails}.`,
        );
      }

      const overwriteExisting =
        preview.replaceableCount > 0
          ? window.confirm(
              `${preview.replaceableCount} imported staff email(s) already exist. Do you want to replace/update those existing staff accounts and continue?`,
            )
          : false;

      if (preview.replaceableCount > 0 && !overwriteExisting) {
        setImportResult(null);
        return;
      }

      const result = await bulkImportStaff(rows, { overwriteExisting });

      setImportResult(result);
      await loadData();
      setError("");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Failed to import staff Excel.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff"
        description="Create and manage teachers, role assignments, and subject links. Class coordinator access is controlled from Class Management."
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            {canDeleteAllStaff ? (
              <Button type="button" variant="ghost" onClick={() => void handleDeleteAllStaff()} disabled={deletingAll || loading}>
                {deletingAll ? "Deleting Staff..." : "Delete All Staff"}
              </Button>
            ) : null}
            {canManageStaffRecords ? <Button onClick={openCreate}>+ Add Staff</Button> : null}
          </div>
        }
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Bulk Staff Import</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload an Excel sheet to create staff records and login accounts in one go. Use readable columns like `subjectName` and `role`.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => void handleDownloadTemplate()}>
              Download Template
            </Button>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:bg-slate-50">
              {importing ? "Importing..." : "Upload Staff Excel"}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => void handleImportFile(event)} disabled={importing} />
            </label>
          </div>
        </div>
      </Card>

      {importResult ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Created: {importResult.created}
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              Failed: {importResult.failed}
            </div>
          </div>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {importResult.results.map((item) => (
              <div
                key={`${item.rowNumber}-${item.identifier}`}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  item.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                Row {item.rowNumber} • {item.identifier} • {item.message}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff..."
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
        <CompactMetricCard label="Total Staff" value={staff.length} detail="All active staff profiles in the ERP." icon={<StaffIcon />} />
        <CompactMetricCard label="Teachers" value={totalTeachers} detail="Subject-linked teaching staff." icon={<TeacherIcon />} />
        <CompactMetricCard label="Coordinators" value={totalCoordinators} detail="Class coordinators assigned from the staff list." icon={<CoordinatorIcon />} />
      </div>

      <DataTable
        title="Staff Directory"
        description={canManageStaffRecords ? "Shows only the main staff overview. Open a staff member to view complete profile and employment details." : "Principal view is read-only. Review the staff directory, roles, and coverage without editing records."}
        data={filteredStaff}
        getRowId={(member) => member.id}
        loading={loading}
        loadingMessage="Loading staff..."
        emptyMessage="No matching staff members found."
        mobileTitle={(member) => member.name}
        mobileSubtitle={(member) => `${member.role}${member.subjectName ? ` • ${member.subjectName}` : ""}`}
        columns={[
          {
            key: "name",
            label: "Staff",
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
            {canManageStaffRecords ? (
              <>
                <Link
                  to={`/dashboard/staff/${member.id}`}
                  className="inline-flex min-h-9 items-center justify-center rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 whitespace-nowrap"
                >
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => openEdit(member)}
                  className="inline-flex min-h-9 items-center justify-center rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 whitespace-nowrap"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(member)}
                  className="inline-flex min-h-9 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 whitespace-nowrap"
                >
                  Delete
                </button>
              </>
            ) : (
              <span className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 whitespace-nowrap">
                View Only
              </span>
            )}
          </div>
        )}
        pageSize={10}
      />

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.mode === "create" ? "Add Staff" : "Edit Staff"}
        description="Create staff records with login details, contact info, profile image, joining date, salary, and role assignment."
        maxWidthClass="max-w-4xl"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-600">Account Details</p>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">Staff Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handlePhotoSelect(event)}
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Upload a staff profile photo. The image is resized and saved with the staff record.
                </p>
              </label>
              {processingPhoto ? (
                <div className="md:col-span-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                  Processing selected image...
                </div>
              ) : null}
              {form.photoUrl ? (
                <div className="md:col-span-2">
                  <div className="inline-flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <img src={form.photoUrl} alt="Staff preview" className="h-16 w-16 rounded-full object-cover" />
                    <div className="text-sm text-slate-600">Staff picture preview</div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                      onClick={removePhoto}
                    >
                      Remove Photo
                    </Button>
                  </div>
                </div>
              ) : null}
              <Input
                label="Name"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                required
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                labelClassName="text-slate-700"
                errorClassName="text-rose-600"
                placeholder="Teacher full name"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                required
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                labelClassName="text-slate-700"
                errorClassName="text-rose-600"
                placeholder="teacher@school.com"
              />
              <Input
                label="Mobile Number"
                value={form.mobileNumber}
                onChange={(event) => handleChange("mobileNumber", event.target.value)}
                required
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                labelClassName="text-slate-700"
                errorClassName="text-rose-600"
                placeholder="9876543210"
              />
              <Input
                label={modal.mode === "create" ? "Password" : "Password (leave blank to keep current)"}
                type="password"
                value={form.password}
                onChange={(event) => handleChange("password", event.target.value)}
                required={modal.mode === "create"}
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                labelClassName="text-slate-700"
                errorClassName="text-rose-600"
                placeholder="Minimum secure password"
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
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                labelClassName="text-slate-700"
                errorClassName="text-rose-600"
                placeholder="25000"
              />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Role</span>
                <select
                  value={form.role}
                  onChange={(event) => handleChange("role", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                >
                  {staffRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              {isPrincipalRole ? (
                <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Designation is set automatically to Principal. Subject, class assignment, and timetable-specific fields are not required for this role.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-600">Role Assignment</p>
            {requiresSubject ? (
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <label className="block md:col-span-2 space-y-2">
                  <span className="text-sm font-medium text-slate-700">Subject</span>
                  <select
                    value={form.subjectId}
                    onChange={(event) => handleChange("subjectId", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                    required
                  >
                    <option value="">Select subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                {isPrincipalRole
                  ? "Principal accounts are leadership profiles and do not require subject or timetable assignments."
                  : "This staff role does not need a subject assignment."}
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
              Assign class coordinator access from the `Class Management` screen. When an admin selects a coordinator for a class and section, the sidebar and timetable permissions update automatically.
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
              {processingPhoto ? "Processing Photo..." : saving ? "Saving..." : modal.mode === "create" ? "Create Staff" : "Update Staff"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffPage;
