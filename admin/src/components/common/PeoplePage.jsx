import { useEffect, useState } from "react";
import { Plus, Search, ToggleLeft, ToggleRight, Pencil, Filter } from "lucide-react";
import PageHeader from "./PageHeader";
import Modal from "./Modal";
import SimpleTable from "../tables/SimpleTable";
import { Loading, ErrorState } from "./DataState";
import { errorMessage } from "../../services/api";
import { adminService } from "../../services/adminService";

export default function PeoplePage({ type, service }) {
  const isStudent = type === "student",
    label = isStudent ? "Students" : "Teachers";
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [successMsg, setSuccessMsg] = useState(""),
    [search, setSearch] = useState(""),
    [filterClassId, setFilterClassId] = useState(""),
    [filterDepartmentId, setFilterDepartmentId] = useState(""),
    [classes, setClasses] = useState([]),
    [departments, setDepartments] = useState([]),
    [showAdd, setShowAdd] = useState(false),
    [showEdit, setShowEdit] = useState(false),
    [editingItem, setEditingItem] = useState(null),
    [form, setForm] = useState({ role: isStudent ? "STUDENT" : "TEACHER" }),
    [editForm, setEditForm] = useState({}),
    [submitting, setSubmitting] = useState(false);

  // Load auxiliary data (classes for students, departments for teachers)
  useEffect(() => {
    if (isStudent) {
      adminService.classes
        .list({ limit: 100, isActive: "true" })
        .then((r) => setClasses(r.data?.classes || r.data?.items || []))
        .catch(() => {});
    } else {
      adminService.departments
        .list({ limit: 100, isActive: "true" })
        .then((r) => setDepartments(r.data?.departments || r.data?.items || []))
        .catch(() => {});
    }
  }, [isStudent]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: 1,
        limit: 50,
        search,
        isActive: "all",
      };
      if (isStudent && filterClassId) {
        params.classId = filterClassId;
      }
      if (!isStudent && filterDepartmentId) {
        params.departmentId = filterDepartmentId;
      }

      const r = await service.list(params);
      setRows(r.data[isStudent ? "students" : "teachers"] || []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, filterClassId, filterDepartmentId]);

  const create = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        role: isStudent ? "STUDENT" : "TEACHER",
        ...(isStudent
          ? { studentNumber: form.studentNumber }
          : {
              employeeId: form.employeeId,
              departmentId: form.departmentId || undefined,
            }),
      };

      const res = await service.provision(payload);

      // If student and classId is selected, assign enrollment immediately
      if (isStudent && form.classId && res.data?.profileId) {
        try {
          await service.assignEnrollment(res.data.profileId, form.classId);
        } catch (enrollErr) {
          console.warn("Class assignment warning:", enrollErr);
        }
      }

      setShowAdd(false);
      setForm({ role: isStudent ? "STUDENT" : "TEACHER" });
      setSuccessMsg(`${isStudent ? "Student" : "Teacher"} created successfully.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (row) => {
    setEditingItem(row);
    setEditForm({
      fullName: row.fullName || "",
      email: row.email || "",
      phone: row.phone || "",
      ...(isStudent
        ? {
            studentNumber: row.studentDetails?.studentNumber || "",
            classId: row.activeEnrollment?.schoolClass?.id || "",
          }
        : {
            employeeId: row.teacherDetails?.employeeId || "",
            departmentId:
              row.teacherDetails?.departmentId || row.teacherDetails?.department?.id || "",
          }),
    });
    setShowEdit(true);
  };

  const update = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      const payload = {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone || null,
        ...(isStudent
          ? {
              studentNumber: editForm.studentNumber,
              classId: editForm.classId || null,
            }
          : {
              employeeId: editForm.employeeId,
              departmentId: editForm.departmentId || null,
            }),
      };

      await service.update(editingItem.id, payload);
      setShowEdit(false);
      setEditingItem(null);
      setSuccessMsg(`${isStudent ? "Student" : "Teacher"} details updated successfully.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const status = async (r) => {
    try {
      await service.setStatus(r.id, !r.isActive);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const cols = [
    { label: "Name", key: "fullName" },
    { label: "Email", key: "email" },
    {
      label: "Phone",
      render: (r) => r.phone || "—",
    },
    {
      label: isStudent ? "Student no." : "Employee ID",
      render: (r) => (isStudent ? r.studentDetails?.studentNumber : r.teacherDetails?.employeeId),
    },
    {
      label: isStudent ? "Class" : "Department",
      render: (r) => {
        if (isStudent) {
          const c = r.activeEnrollment?.schoolClass;
          if (!c) return "—";
          return c.division ? `${c.name} (${c.division})` : c.name;
        } else {
          const d = r.teacherDetails?.department;
          if (!d) return "—";
          return d.code ? `${d.name} (${d.code})` : d.name;
        }
      },
    },
    {
      label: "Status",
      render: (r) => (
        <button
          onClick={() => status(r)}
          className={`inline-flex items-center gap-1 text-xs font-semibold ${r.isActive ? "text-emerald-700" : "text-slate-400"}`}
        >
          {r.isActive ? <ToggleRight size={21} /> : <ToggleLeft size={21} />}{" "}
          {r.isActive ? "Active" : "Inactive"}
        </button>
      ),
    },
    {
      label: "Actions",
      render: (r) => (
        <button
          onClick={() => openEdit(r)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700"
        >
          <Pencil size={13} />
          Edit
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={label}
        description={`Manage institution ${label.toLowerCase()} with live backend records.`}
        action={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={17} />
            Add {isStudent ? "student" : "teacher"}
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
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[240px] max-w-md items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder={`Search ${label.toLowerCase()} by name, email, or ${isStudent ? "student number" : "employee ID"}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter dropdown */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            {isStudent ? (
              <select
                className="input py-1.5 text-xs font-medium"
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.division ? `(${c.division})` : ""} - {c.academicYear}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="input py-1.5 text-xs font-medium"
                value={filterDepartmentId}
                onChange={(e) => setFilterDepartmentId(e.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        {loading ? <Loading /> : <SimpleTable rows={rows} columns={cols} />}
      </div>

      {/* ADD MODAL */}
      {showAdd && (
        <Modal title={`Add ${isStudent ? "student" : "teacher"}`} onClose={() => setShowAdd(false)}>
          <form className="space-y-3" onSubmit={create}>
            {[
              ["fullName", "Full name"],
              ["email", "Email", "email"],
              ["phone", "Phone"],
              [
                isStudent ? "studentNumber" : "employeeId",
                isStudent ? "Student number" : "Employee ID",
              ],
            ].map(([name, inputLabel, inputType]) => (
              <label className="label" key={name}>
                {inputLabel}
                <input
                  className="input mt-1"
                  type={inputType || "text"}
                  required={name !== "phone"}
                  value={form[name] || ""}
                  onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                />
              </label>
            ))}

            {/* Class selection for student */}
            {isStudent && (
              <label className="label">
                Class assignment
                <select
                  className="input mt-1"
                  value={form.classId || ""}
                  onChange={(e) => setForm({ ...form, classId: e.target.value })}
                >
                  <option value="">Select a class (optional)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.division ? `(${c.division})` : ""} - {c.academicYear}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Department selection for teacher */}
            {!isStudent && (
              <label className="label">
                Department
                <select
                  className="input mt-1"
                  value={form.departmentId || ""}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  <option value="">Select a department (optional)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <p className="text-xs leading-5 text-slate-400">
              The backend provisions a temporary password and delivers credentials using its
              configured email service.
            </p>
            <button className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Creating..." : "Create account"}
            </button>
          </form>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {showEdit && editingItem && (
        <Modal
          title={`Edit ${isStudent ? "student" : "teacher"} details`}
          onClose={() => {
            setShowEdit(false);
            setEditingItem(null);
          }}
        >
          <form className="space-y-3" onSubmit={update}>
            <label className="label">
              Full name
              <input
                className="input mt-1"
                required
                value={editForm.fullName || ""}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              />
            </label>

            <label className="label">
              Email
              <input
                className="input mt-1"
                type="email"
                required
                value={editForm.email || ""}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </label>

            <label className="label">
              Phone
              <input
                className="input mt-1"
                type="text"
                placeholder="Optional phone number"
                value={editForm.phone || ""}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </label>

            {isStudent ? (
              <label className="label">
                Student number
                <input
                  className="input mt-1"
                  required
                  value={editForm.studentNumber || ""}
                  onChange={(e) => setEditForm({ ...editForm, studentNumber: e.target.value })}
                />
              </label>
            ) : (
              <label className="label">
                Employee ID
                <input
                  className="input mt-1"
                  required
                  value={editForm.employeeId || ""}
                  onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                />
              </label>
            )}

            {/* Class selection for student */}
            {isStudent && (
              <label className="label">
                Class enrollment
                <select
                  className="input mt-1"
                  value={editForm.classId || ""}
                  onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                >
                  <option value="">No class assigned</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.division ? `(${c.division})` : ""} - {c.academicYear}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Department selection for teacher */}
            {!isStudent && (
              <label className="label">
                Department
                <select
                  className="input mt-1"
                  value={editForm.departmentId || ""}
                  onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                >
                  <option value="">No department assigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="pt-2">
              <button className="btn-primary w-full" disabled={submitting}>
                {submitting ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
