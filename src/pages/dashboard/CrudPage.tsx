import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import ActionIconButton from "../../components/ui/ActionIconButton";
import { AdminPageHeader, DetailField, DetailSection } from "./adminPageUtils";

type FieldOption = {
  label: string;
  value: string;
};

export type CrudFieldConfig = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
};

export type CrudColumn<T> = {
  label: string;
  render: (item: T) => ReactNode;
};

type CrudPageProps<T extends { id: string }> = {
  title: string;
  description: string;
  createLabel: string;
  emptyMessage: string;
  fields: CrudFieldConfig[];
  columns: CrudColumn<T>[];
  emptyForm: Record<string, string>;
  loadItems: () => Promise<T[]>;
  createItem: (values: any) => Promise<unknown>;
  updateItem: (id: string, values: any) => Promise<unknown>;
  deleteItem: (id: string) => Promise<void>;
  mapToForm: (item: T) => Record<string, string>;
  detailPath: (item: T) => string;
  extraActions?: (item: T, reload: () => Promise<void>) => ReactNode;
  children?: ReactNode;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  getSearchText?: (item: T) => string;
  filters?: Array<{
    key: string;
    label: string;
    options: Array<{ label: string; value: string }>;
    getValue: (item: T) => string;
  }>;
};

type ModalState<T> = {
  open: boolean;
  mode: "create" | "edit";
  item: T | null;
};

export function CrudPage<T extends { id: string }>({
  title,
  description,
  createLabel,
  emptyMessage,
  fields,
  columns,
  emptyForm,
  loadItems,
  createItem,
  updateItem,
  deleteItem,
  mapToForm,
  detailPath,
  extraActions,
  children,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  getSearchText,
  filters = [],
}: CrudPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [modal, setModal] = useState<ModalState<T>>({ open: false, mode: "create", item: null });
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await loadItems();
      setItems(data);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : `Failed to load ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const closeModal = () => {
    setModal({ open: false, mode: "create", item: null });
    setForm(emptyForm);
    setFormError("");
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setModal({ open: true, mode: "create", item: null });
  };

  const openEdit = (item: T) => {
    setForm(mapToForm(item));
    setFormError("");
    setModal({ open: true, mode: "edit", item });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (modal.mode === "create") {
        await createItem(form);
      } else if (modal.item) {
        await updateItem(modal.item.id, form);
      }
      closeModal();
      await loadData();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : `Failed to save ${title.toLowerCase()}.`;
      setFormError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: T) => {
    if (!window.confirm(`Delete this ${title.slice(0, -1).toLowerCase()} record?`)) return;
    try {
      await deleteItem(item.id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `Failed to delete ${title.toLowerCase()}.`);
    }
  };

  const filteredItems = items.filter((item) => {
    const searchHaystack = getSearchText ? getSearchText(item).toLowerCase() : JSON.stringify(item).toLowerCase();
    const matchesSearch = !search.trim() || searchHaystack.includes(search.trim().toLowerCase());
    const matchesFilters = filters.every((filter) => {
      const activeValue = activeFilters[filter.key] ?? "";
      return !activeValue || filter.getValue(item) === activeValue;
    });
    return matchesSearch && matchesFilters;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        action={canCreate ? (
          <Button onClick={openCreate} fullWidth className="md:w-auto">
            {createLabel}
          </Button>
        ) : undefined}
      />

      {children}

      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_repeat(auto-fit,minmax(180px,220px))]">
          <Input
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            labelClassName="text-slate-700"
            errorClassName="text-rose-600"
          />
          {filters.map((filter) => (
            <label key={filter.key} className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{filter.label}</span>
              <select
                value={activeFilters[filter.key] ?? ""}
                onChange={(event) =>
                  setActiveFilters((current) => ({
                    ...current,
                    [filter.key]: event.target.value,
                  }))
                }
                className="ui-select"
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </Card>

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <DataTable
        data={filteredItems}
        getRowId={(item) => item.id}
        loading={loading}
        loadingMessage={`Loading ${title.toLowerCase()}...`}
        emptyMessage={filteredItems.length === 0 && items.length > 0 ? "No matching records found." : emptyMessage}
        mobileTitle={(item) => columns[0]?.render(item)}
        columns={columns.map((column, index) => ({
          key: column.label,
          label: column.label,
          render: column.render,
          mobileHidden: index === 0,
          emphasis: index === 0,
        }))}
        renderActions={(item) => (
          <div className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
            <Link to={detailPath(item)}>
              <ActionIconButton action="view" />
            </Link>
            {canEdit ? <ActionIconButton action="edit" onClick={() => openEdit(item)} /> : null}
            {canDelete ? <ActionIconButton action="delete" onClick={() => void handleDelete(item)} /> : null}
            {extraActions ? extraActions(item, loadData) : null}
          </div>
        )}
      />

      <Modal
        open={canCreate || canEdit ? modal.open : false}
        onClose={closeModal}
        title={modal.mode === "create" ? `Add ${title.slice(0, -1)}` : `Edit ${title.slice(0, -1)}`}
        description={`Manage ${title.toLowerCase()} records with complete admin control.`}
        maxWidthClass="max-w-3xl"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            {fields.map((field) => {
              const value = form[field.key] ?? "";
              if (field.type === "textarea") {
                return (
                  <label key={field.key} className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">{field.label}</span>
                    <textarea
                      value={value}
                      required={field.required}
                      placeholder={field.placeholder}
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                      className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    />
                  </label>
                );
              }

              if (field.type === "select") {
                return (
                  <label key={field.key} className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">{field.label}</span>
                    <select
                      value={value}
                      required={field.required}
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                      className="ui-select"
                    >
                      <option value="">Select {field.label}</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              return (
                <Input
                  key={field.key}
                  label={field.label}
                  type={field.type ?? "text"}
                  value={value}
                  required={field.required}
                  placeholder={field.placeholder}
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  labelClassName="text-slate-700"
                  errorClassName="text-rose-600"
                />
              );
            })}
          </div>

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal} className="bg-slate-100 text-slate-700 hover:bg-slate-200">
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export const CrudDetailPage = ({
  title,
  backPath,
  sections,
  action,
}: {
  title: string;
  backPath: string;
  sections: Array<{ title: string; fields: Array<{ label: string; value: ReactNode }> }>;
  action?: ReactNode;
}) => (
  <div className="space-y-6">
    <AdminPageHeader
      title={title}
      description="Detailed record view with section-wise admin information."
      action={
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {action}
          <Link to={backPath}>
            <Button variant="ghost" fullWidth className="bg-slate-100 text-slate-700 hover:bg-slate-200 sm:w-auto">
              Back
            </Button>
          </Link>
        </div>
      }
    />

    <div className="space-y-4">
      {sections.map((section) => (
        <DetailSection key={section.title} title={section.title}>
          {section.fields.map((field) => (
            <DetailField key={field.label} label={field.label} value={field.value} />
          ))}
        </DetailSection>
      ))}
    </div>
  </div>
);
