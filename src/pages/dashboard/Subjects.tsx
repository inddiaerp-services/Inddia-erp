import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import ActionIconButton from "../../components/ui/ActionIconButton";
import { AdminPageHeader } from "./adminPageUtils";
import type { SubjectRecord } from "../../types/admin";
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from "../../services/adminService";

type SubjectModalState = {
  open: boolean;
  mode: "create" | "edit";
  subject: SubjectRecord | null;
};

const initialModalState: SubjectModalState = {
  open: false,
  mode: "create",
  subject: null,
};

export const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [modal, setModal] = useState<SubjectModalState>(initialModalState);
  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const loadSubjects = async () => {
    setLoading(true);
    try {
      setSubjects(await listSubjects());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubjects();
  }, []);

  const openCreate = () => {
    setName("");
    setFormError("");
    setModal({ open: true, mode: "create", subject: null });
  };

  const openEdit = (subject: SubjectRecord) => {
    setName(subject.name);
    setFormError("");
    setModal({ open: true, mode: "edit", subject });
  };

  const closeModal = () => {
    setModal(initialModalState);
    setName("");
    setFormError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (modal.mode === "create") {
        await createSubject({ name });
      } else if (modal.subject) {
        await updateSubject(modal.subject.id, { name });
      }

      closeModal();
      await loadSubjects();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save subject.";
      setFormError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subject: SubjectRecord) => {
    if (!window.confirm(`Delete subject "${subject.name}"?`)) return;

    try {
      await deleteSubject(subject.id);
      await loadSubjects();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete subject.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Subjects"
        description="Create and manage the academic subject catalog. Every action is connected to Supabase."
        action={<Button onClick={openCreate}>+ Add Subject</Button>}
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <Input
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search subjects..."
          className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
          labelClassName="text-slate-700"
          errorClassName="text-rose-600"
        />
      </Card>

      <DataTable
        data={filteredSubjects}
        getRowId={(item) => item.id}
        loading={loading}
        loadingMessage="Loading subjects..."
        emptyMessage={filteredSubjects.length === 0 && subjects.length > 0 ? "No matching subjects found." : "No subjects found."}
        mobileTitle={(item) => item.name}
        columns={[
          { key: "name", label: "Subject Name", render: (item) => item.name, emphasis: true, mobileHidden: true },
        ]}
        renderActions={(item) => (
          <div className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
            <Link to={`/dashboard/subjects/${item.id}`}>
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
        title={modal.mode === "create" ? "Add Subject" : "Edit Subject"}
        description="Create or update subjects with a focused admin form."
        maxWidthClass="max-w-xl"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-brand-600">Subject Details</p>
            <div className="mt-4">
              <Input
                label="Subject Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                labelClassName="text-slate-700"
                errorClassName="text-rose-600"
                placeholder="Enter subject name"
              />
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
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : modal.mode === "create" ? "Create Subject" : "Update Subject"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SubjectsPage;
