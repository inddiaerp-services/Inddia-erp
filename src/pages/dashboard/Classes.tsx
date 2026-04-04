import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import ActionIconButton from "../../components/ui/ActionIconButton";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { createClass, deleteClass, listClasses, listStaff, updateClass } from "../../services/adminService";
import type { ClassFormValues, ClassRecord, StaffRecord } from "../../types/admin";
import { AdminPageHeader } from "./adminPageUtils";

const emptyForm: ClassFormValues = {
  className: "",
  section: "",
  roomNumber: "",
  floor: "",
  capacity: "",
  coordinatorId: "",
};

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  classRecord: ClassRecord | null;
};

export const ClassesPage = () => {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [form, setForm] = useState<ClassFormValues>(emptyForm);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create", classRecord: null });

  const loadClasses = async () => {
    setLoading(true);
    try {
      const [classRows, staffRows] = await Promise.all([listClasses(), listStaff()]);
      setClasses(classRows);
      setTeachers(staffRows.filter((item) => item.role === "Teacher"));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClasses();
  }, []);

  const filteredClasses = classes.filter((item) => {
    const haystack = `${item.className} ${item.section} ${item.roomNumber ?? ""} ${item.floor ?? ""} ${item.coordinatorName ?? ""}`.toLowerCase();
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
    const matchesSection = !sectionFilter || item.section === sectionFilter;
    return matchesSearch && matchesSection;
  });

  const sectionOptions = Array.from(new Set(classes.map((item) => item.section))).sort((a, b) => a.localeCompare(b));

  const closeModal = () => {
    setModal({ open: false, mode: "create", classRecord: null });
    setForm(emptyForm);
    setFormError("");
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setModal({ open: true, mode: "create", classRecord: null });
  };

  const openEdit = (classRecord: ClassRecord) => {
      setForm({
        className: classRecord.className,
        section: classRecord.section,
        roomNumber: classRecord.roomNumber ?? "",
        floor: classRecord.floor ?? "",
        capacity: classRecord.capacity?.toString() ?? "",
        coordinatorId: classRecord.coordinatorId ?? "",
      });
    setFormError("");
    setModal({ open: true, mode: "edit", classRecord });
  };

  const handleChange = <K extends keyof ClassFormValues>(key: K, value: ClassFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const normalizedClassName = form.className.trim().toLowerCase();
      const normalizedSection = form.section.trim().toLowerCase();
      const normalizedRoomNumber = form.roomNumber.trim().toLowerCase();
      const currentClassId = modal.classRecord?.id ?? null;

      const duplicateClass = classes.find(
        (item) =>
          item.id !== currentClassId &&
          item.className.trim().toLowerCase() === normalizedClassName &&
          item.section.trim().toLowerCase() === normalizedSection,
      );

      if (duplicateClass) {
        throw new Error(`Class ${form.className.trim()} - ${form.section.trim()} already exists.`);
      }

      if (normalizedRoomNumber) {
        const duplicateRoom = classes.find(
          (item) =>
            item.id !== currentClassId &&
            String(item.roomNumber ?? "").trim().toLowerCase() === normalizedRoomNumber,
        );

        if (duplicateRoom) {
          throw new Error(`Room number ${form.roomNumber.trim()} is already assigned to another class.`);
        }
      }

      const selectedCoordinator = form.coordinatorId
        ? teachers.find((teacher) => teacher.id === form.coordinatorId) ?? null
        : null;

      if (
        selectedCoordinator &&
        selectedCoordinator.assignedClass &&
        selectedCoordinator.assignedSection &&
        (selectedCoordinator.assignedClass !== form.className.trim() ||
          selectedCoordinator.assignedSection !== form.section.trim())
      ) {
        const proceed = window.confirm(
          `${selectedCoordinator.name} is already assigned as coordinator for ${selectedCoordinator.assignedClass} - ${selectedCoordinator.assignedSection}. Do you want to move this teacher to ${form.className.trim()} - ${form.section.trim()}?`,
        );

        if (!proceed) {
          setSaving(false);
          return;
        }
      }

      if (modal.mode === "create") {
        await createClass(form);
      } else if (modal.classRecord) {
        await updateClass(modal.classRecord.id, form);
      }
      closeModal();
      await loadClasses();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save class.";
      setFormError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classRecord: ClassRecord) => {
    if (!window.confirm(`Delete class ${classRecord.className} ${classRecord.section}? Students must be removed first.`)) {
      return;
    }

    try {
      await deleteClass(classRecord.id);
      await loadClasses();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete class.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Class Management"
        description="Create reusable class sections with room, floor, capacity, and coordinator linkage for the whole ERP."
        action={<Button onClick={openCreate}>+ Add Class</Button>}
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search classes, sections, rooms, or coordinator..."
            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            labelClassName="text-slate-700"
            errorClassName="text-rose-600"
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Section</span>
            <select
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
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
        data={filteredClasses}
        getRowId={(item) => item.id}
        loading={loading}
        loadingMessage="Loading classes..."
        emptyMessage={filteredClasses.length === 0 && classes.length > 0 ? "No matching classes found." : "No classes found yet."}
        mobileTitle={(item) => `${item.className} / ${item.section}`}
        mobileSubtitle={(item) => item.coordinatorName ?? "No coordinator assigned"}
        columns={[
          { key: "className", label: "Class Name", render: (item) => item.className, emphasis: true, mobileHidden: true },
          { key: "section", label: "Section", render: (item) => item.section },
          { key: "roomNumber", label: "Room Number", render: (item) => item.roomNumber ?? "-" },
          { key: "floor", label: "Floor", render: (item) => item.floor ?? "-" },
          { key: "capacity", label: "Capacity", render: (item) => item.capacity ?? "-" },
          { key: "coordinatorName", label: "Coordinator", render: (item) => item.coordinatorName ?? "Not assigned" },
        ]}
        renderActions={(item) => (
          <div className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
            <Link to={`/dashboard/classes/${item.id}`}>
              <ActionIconButton action="view" />
            </Link>
            <ActionIconButton action="edit" onClick={() => openEdit(item)} />
            <ActionIconButton action="delete" onClick={() => void handleDelete(item)} />
          </div>
        )}
      />

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.mode === "create" ? "Add Class" : "Edit Class"}
        description="Store class section details once and reuse them across students, staff coordination, and timetable flows."
        maxWidthClass="max-w-3xl"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Class Name"
              value={form.className}
              onChange={(event) => handleChange("className", event.target.value)}
              placeholder="e.g. 10"
              required
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              labelClassName="text-slate-700"
              errorClassName="text-rose-600"
            />
            <Input
              label="Section"
              value={form.section}
              onChange={(event) => handleChange("section", event.target.value)}
              placeholder="e.g. A"
              required
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              labelClassName="text-slate-700"
              errorClassName="text-rose-600"
            />
            <Input
              label="Room Number"
              value={form.roomNumber}
              onChange={(event) => handleChange("roomNumber", event.target.value)}
              placeholder="e.g. 204"
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              labelClassName="text-slate-700"
              errorClassName="text-rose-600"
            />
            <Input
              label="Floor"
              value={form.floor}
              onChange={(event) => handleChange("floor", event.target.value)}
              placeholder="e.g. Second Floor"
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              labelClassName="text-slate-700"
              errorClassName="text-rose-600"
            />
            <Input
              label="Capacity"
              type="number"
              value={form.capacity}
              onChange={(event) => handleChange("capacity", event.target.value)}
              placeholder="e.g. 40"
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              labelClassName="text-slate-700"
              errorClassName="text-rose-600"
            />
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">Class Coordinator</span>
              <select
                value={form.coordinatorId}
                onChange={(event) => handleChange("coordinatorId", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              >
                <option value="">No coordinator assigned</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} {teacher.subjectName ? `- ${teacher.subjectName}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Choosing a teacher here automatically gives coordinator access for this class and section.
              </p>
            </label>
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
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : modal.mode === "create" ? "Create Class" : "Update Class"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClassesPage;
