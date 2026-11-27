import { useEffect, useState } from "react";
import { Plus, Search, Filter, UserCheck, BookOpen } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SimpleTable from "../../components/tables/SimpleTable";
import Modal from "../../components/common/Modal";
import { Loading, ErrorState } from "../../components/common/DataState";
import { adminService } from "../../services/adminService";
import { teacherService } from "../../services/teacherService";
import { errorMessage } from "../../services/api";

export default function CoursesPage() {
  const [assignments, setAssignments] = useState([]),
    [classes, setClasses] = useState([]),
    [subjects, setSubjects] = useState([]),
    [teachers, setTeachers] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [successMsg, setSuccessMsg] = useState(""),
    [search, setSearch] = useState(""),
    [classFilter, setClassFilter] = useState(""),
    [showAdd, setShowAdd] = useState(false),
    [showReassign, setShowReassign] = useState(false),
    [reassignItem, setReassignItem] = useState(null),
    [form, setForm] = useState({ classId: "", subjectId: "", teacherId: "" }),
    [reassignTeacherId, setReassignTeacherId] = useState(""),
    [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      adminService.classes.list({ limit: 100, isActive: "true" }),
      adminService.subjects.list({ limit: 100, isActive: "true" }),
      teacherService.list({ limit: 100, isActive: "true" }),
    ])
      .then(([cRes, sRes, tRes]) => {
        setClasses(cRes.data?.classes || cRes.data?.items || []);
        setSubjects(sRes.data?.subjects || sRes.data?.items || []);
        setTeachers(tRes.data?.teachers || tRes.data?.items || []);
      })
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: 1,
        limit: 50,
        search,
        classId: classFilter || undefined,
        sortOrder: "asc",
      };
      const r = await adminService.assignments.list(params);
      setAssignments(r.data?.assignments || []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, classFilter]);

  const createAssignment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await adminService.assignments.create(form);
      setShowAdd(false);
      setForm({ classId: "", subjectId: "", teacherId: "" });
      setSuccessMsg("Teacher assigned to subject course successfully.");
      setTimeout(() => setSuccessMsg(""), 3500);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openReassign = (row) => {
    setReassignItem(row);
    setReassignTeacherId(row.teacherId || row.teacher?.id || "");
    setShowReassign(true);
  };

  const reassignTeacher = async (e) => {
    e.preventDefault();
    if (!reassignItem) return;
    setSubmitting(true);
    setError("");
    try {
      await adminService.assignments.reassign(reassignItem.id, {
        teacherId: reassignTeacherId,
      });
      setShowReassign(false);
      setReassignItem(null);
      setSuccessMsg("Teacher reassigned successfully.");
      setTimeout(() => setSuccessMsg(""), 3500);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const cols = [
    {
      label: "Class",
      render: (r) => {
        const c = r.schoolClass;
        if (!c) return "—";
        return c.division ? `${c.name} (${c.division})` : c.name;
      },
    },
    {
      label: "Subject",
      render: (r) => {
        const s = r.subject;
        if (!s) return "—";
        return `${s.name} (${s.code})`;
      },
    },
    {
      label: "Assigned teacher",
      render: (r) => r.teacher?.fullName || "—",
    },
    {
      label: "Teacher email",
      render: (r) => r.teacher?.email || "—",
    },
    {
      label: "Assigned date",
      render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"),
    },
    {
      label: "Actions",
      render: (r) => (
        <button
          onClick={() => openReassign(r)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700"
        >
          <UserCheck size={13} />
          Reassign
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Course & Teacher assignments"
        description="Assign teachers to class subjects and manage curriculum assignments."
        action={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={17} />
            Assign teacher
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
              placeholder="Search by class, subject, or teacher name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              className="input py-1.5 text-xs font-medium"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.division ? `(${c.division})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? <Loading /> : <SimpleTable rows={assignments} columns={cols} />}
      </div>

      {/* ADD ASSIGNMENT MODAL */}
      {showAdd && (
        <Modal title="Assign teacher to class subject" onClose={() => setShowAdd(false)}>
          <form className="space-y-4" onSubmit={createAssignment}>
            <label className="label">
              Class
              <select
                className="input mt-1"
                required
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
              >
                <option value="">Select a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.division ? `(${c.division})` : ""} - {c.academicYear}
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              Subject
              <select
                className="input mt-1"
                required
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              >
                <option value="">Select a subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              Teacher
              <select
                className="input mt-1"
                required
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              >
                <option value="">Select a teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.email})
                  </option>
                ))}
              </select>
            </label>

            <button className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Assigning..." : "Assign teacher"}
            </button>
          </form>
        </Modal>
      )}

      {/* REASSIGN MODAL */}
      {showReassign && reassignItem && (
        <Modal
          title="Reassign teacher"
          onClose={() => {
            setShowReassign(false);
            setReassignItem(null);
          }}
        >
          <form className="space-y-4" onSubmit={reassignTeacher}>
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Class:</span>{" "}
                {reassignItem.schoolClass?.name} {reassignItem.schoolClass?.division || ""}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-800">Subject:</span>{" "}
                {reassignItem.subject?.name} ({reassignItem.subject?.code})
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-800">Current teacher:</span>{" "}
                {reassignItem.teacher?.fullName}
              </p>
            </div>

            <label className="label">
              New teacher
              <select
                className="input mt-1"
                required
                value={reassignTeacherId}
                onChange={(e) => setReassignTeacherId(e.target.value)}
              >
                <option value="">Select new teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.email})
                  </option>
                ))}
              </select>
            </label>

            <button className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Reassigning..." : "Confirm reassign"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
