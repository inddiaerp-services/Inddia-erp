import { useEffect, useState, type FormEvent } from "react";
import ActionIconButton from "../../components/ui/ActionIconButton";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  createHoliday,
  deleteHoliday,
  listHolidays,
  updateHoliday,
} from "../../services/adminService";
import type { HolidayFormValues, HolidayRecord } from "../../types/admin";
import { AdminPageHeader } from "./adminPageUtils";

const emptyForm: HolidayFormValues = {
  holidayDate: "",
  title: "",
  description: "",
};

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  holiday: HolidayRecord | null;
};

export const HolidaysPage = () => {
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<HolidayFormValues>(emptyForm);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create", holiday: null });

  const loadHolidays = async () => {
    setLoading(true);
    try {
      setHolidays(await listHolidays());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load holidays.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHolidays();
  }, []);

  const filteredHolidays = holidays.filter((holiday) =>
    `${holiday.holidayDate} ${holiday.title} ${holiday.description ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const closeModal = () => {
    setModal({ open: false, mode: "create", holiday: null });
    setForm(emptyForm);
    setFormError("");
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setModal({ open: true, mode: "create", holiday: null });
  };

  const openEdit = (holiday: HolidayRecord) => {
    setForm({
      holidayDate: holiday.holidayDate,
      title: holiday.title,
      description: holiday.description ?? "",
    });
    setFormError("");
    setModal({ open: true, mode: "edit", holiday });
  };

  const handleChange = <K extends keyof HolidayFormValues>(key: K, value: HolidayFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (modal.mode === "create") {
        await createHoliday(form);
      } else if (modal.holiday) {
        await updateHoliday(modal.holiday.id, form);
      }
      closeModal();
      await loadHolidays();
      setError("");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save holiday.";
      setFormError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (holiday: HolidayRecord) => {
    if (!window.confirm(`Delete holiday "${holiday.title}" on ${holiday.holidayDate}?`)) return;
    try {
      await deleteHoliday(holiday.id);
      await loadHolidays();
      setError("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete holiday.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Holidays"
        description="Manage the school's local calendar. These holiday dates update timetable-based daily flows across the ERP."
        action={
          <Button onClick={openCreate}>+ Add Holiday</Button>
        }
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
          placeholder="Search holidays..."
          className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
          labelClassName="text-slate-700"
          errorClassName="text-rose-600"
        />
      </Card>

      <DataTable
        data={filteredHolidays}
        getRowId={(item) => item.id}
        loading={loading}
        loadingMessage="Loading holidays..."
        emptyMessage={filteredHolidays.length === 0 && holidays.length > 0 ? "No matching holidays found." : "No holidays found."}
        mobileTitle={(item) => item.title}
        mobileSubtitle={(item) => item.holidayDate}
        columns={[
          { key: "title", label: "Title", render: (item) => item.title, emphasis: true, mobileHidden: true },
          { key: "holidayDate", label: "Date", render: (item) => item.holidayDate },
          { key: "description", label: "Description", render: (item) => item.description ?? "-" },
        ]}
        renderActions={(item) => (
          <div className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
            <ActionIconButton action="edit" onClick={() => openEdit(item)} />
            <ActionIconButton action="delete" onClick={() => void handleDelete(item)} />
          </div>
        )}
      />

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.mode === "create" ? "Add Holiday" : "Edit Holiday"}
        description="Holiday dates are stored locally and applied across timetable-based daily workflows."
        maxWidthClass="max-w-3xl"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Holiday Date"
              type="date"
              value={form.holidayDate}
              onChange={(event) => handleChange("holidayDate", event.target.value)}
              required
              className="border-slate-200 bg-white text-slate-900"
              labelClassName="text-slate-700"
              errorClassName="text-rose-600"
            />
            <Input
              label="Title"
              value={form.title}
              onChange={(event) => handleChange("title", event.target.value)}
              placeholder="School Holiday"
              required
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              labelClassName="text-slate-700"
              errorClassName="text-rose-600"
            />
          </div>

          <Input
            label="Description"
            value={form.description}
            onChange={(event) => handleChange("description", event.target.value)}
            placeholder="Optional note"
            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            labelClassName="text-slate-700"
            errorClassName="text-rose-600"
          />

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
              {saving ? "Saving..." : modal.mode === "create" ? "Create Holiday" : "Update Holiday"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HolidaysPage;
