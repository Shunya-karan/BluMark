import { useEffect, useState } from "react";
import { Plus, Search, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import PageHeader from "./PageHeader";
import Modal from "./Modal";
import SimpleTable from "../tables/SimpleTable";
import { ErrorState, Loading } from "./DataState";
import { errorMessage } from "../../services/api";

export default function DirectoryPage({
  title,
  description,
  service,
  itemKey,
  columns,
  fields,
  createLabel = "Add record",
  filters = {},
}) {
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [successMsg, setSuccessMsg] = useState(""),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState(false),
    [editModal, setEditModal] = useState(false),
    [editingItem, setEditingItem] = useState(null),
    [form, setForm] = useState({}),
    [editForm, setEditForm] = useState({}),
    [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await service.list({ page: 1, limit: 50, search, ...filters });
      setItems(r.data[itemKey] || r.data?.items || []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [search]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await service.create(form);
      setModal(false);
      setForm({});
      setSuccessMsg("Record added successfully.");
      setTimeout(() => setSuccessMsg(""), 3500);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (row) => {
    setEditingItem(row);
    const initial = {};
    fields.forEach((f) => {
      initial[f.name] = row[f.name] !== undefined && row[f.name] !== null ? row[f.name] : "";
    });
    setEditForm(initial);
    setEditModal(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setSubmitting(true);
    setError("");
    try {
      await service.update(editingItem.id, editForm);
      setEditModal(false);
      setEditingItem(null);
      setSuccessMsg("Record updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3500);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = async (row) => {
    try {
      await service.update(row.id, { isActive: !row.isActive });
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const renderFieldInput = (f, currentForm, updateForm) => {
    if (f.type === "select") {
      return (
        <select
          className="input mt-1"
          required={!f.optional}
          value={currentForm[f.name] || ""}
          onChange={(e) => updateForm({ ...currentForm, [f.name]: e.target.value || null })}
        >
          <option value="">{f.placeholder || `Select ${f.label.toLowerCase()}`}</option>
          {(f.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        className="input mt-1"
        type={f.type || "text"}
        required={!f.optional}
        value={currentForm[f.name] ?? ""}
        onChange={(e) =>
          updateForm({
            ...currentForm,
            [f.name]: f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value,
          })
        }
      />
    );
  };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus size={17} />
            {createLabel}
          </button>
        }
      />
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}
      {successMsg && (
        <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800 border border-emerald-200">
          {successMsg}
        </div>
      )}
      <div className="card">
        <div className="mb-4 flex max-w-md items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
          <Search size={17} className="text-slate-400" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <Loading />
        ) : (
          <SimpleTable
            rows={items}
            columns={[
              ...columns,
              {
                label: "Status",
                render: (r) => (
                  <button
                    onClick={() => toggle(r)}
                    className={`inline-flex items-center gap-1 text-xs font-medium ${r.isActive ? "text-emerald-700" : "text-slate-400"}`}
                  >
                    {r.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}{" "}
                    {r.isActive ? "Active" : "Inactive"}
                  </button>
                ),
              },
              {
                label: "Actions",
                render: (r) => (
                  <button
                    onClick={() => openEdit(r)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* CREATE MODAL */}
      {modal && (
        <Modal title={createLabel} onClose={() => setModal(false)}>
          <form onSubmit={submit} className="space-y-4">
            {fields.map((f) => (
              <label className="label" key={f.name}>
                {f.label}
                {renderFieldInput(f, form, setForm)}
              </label>
            ))}
            <button className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
          </form>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editModal && editingItem && (
        <Modal
          title={`Edit ${title.toLowerCase().replace(/s$/, "")}`}
          onClose={() => {
            setEditModal(false);
            setEditingItem(null);
          }}
        >
          <form onSubmit={submitEdit} className="space-y-4">
            {fields.map((f) => (
              <label className="label" key={f.name}>
                {f.label}
                {renderFieldInput(f, editForm, setEditForm)}
              </label>
            ))}
            <button className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Updating..." : "Update"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
