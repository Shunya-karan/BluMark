import { useEffect, useState } from "react";
import { Search, Filter, Eye, Calendar, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SimpleTable from "../../components/tables/SimpleTable";
import Modal from "../../components/common/Modal";
import { Loading, ErrorState } from "../../components/common/DataState";
import { adminService } from "../../services/adminService";
import { errorMessage } from "../../services/api";

export default function AttendancePage() {
  const [sessions, setSessions] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [statusFilter, setStatusFilter] = useState("ALL"),
    [classFilter, setClassFilter] = useState(""),
    [classes, setClasses] = useState([]),
    [selectedSession, setSelectedSession] = useState(null),
    [detailsLoading, setDetailsLoading] = useState(false),
    [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    adminService.classes
      .list({ limit: 100, isActive: "true" })
      .then((r) => setClasses(r.data?.classes || r.data?.items || []))
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
        status: statusFilter,
        classId: classFilter || undefined,
        sortOrder: "desc",
      };
      const r = await adminService.attendance.sessions(params);
      setSessions(r.data?.sessions || []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, statusFilter, classFilter]);

  const viewSession = async (session) => {
    setShowDetails(true);
    setDetailsLoading(true);
    try {
      const r = await adminService.attendance.sessionDetails(session.id);
      setSelectedSession(r.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        );
      case "ENDED":
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            Completed
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Expired
          </span>
        );
      default:
        return status;
    }
  };

  const getRecordStatusBadge = (st) => {
    switch (st) {
      case "PRESENT":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={13} /> Present
          </span>
        );
      case "LATE":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
            <Clock size={13} /> Late
          </span>
        );
      case "ABSENT":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
            <XCircle size={13} /> Absent
          </span>
        );
      case "EXCUSED":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <AlertCircle size={13} /> Excused
          </span>
        );
      default:
        return st;
    }
  };

  const cols = [
    {
      label: "Class",
      render: (r) => {
        const c = r.classSubject?.schoolClass;
        if (!c) return "—";
        return c.division ? `${c.name} (${c.division})` : c.name;
      },
    },
    {
      label: "Subject",
      render: (r) => {
        const s = r.classSubject?.subject;
        if (!s) return "—";
        return `${s.name} (${s.code})`;
      },
    },
    {
      label: "Teacher",
      render: (r) => r.teacher?.fullName || "—",
    },
    {
      label: "Status",
      render: (r) => getStatusBadge(r.status),
    },
    {
      label: "Started",
      render: (r) => new Date(r.startsAt).toLocaleString(),
    },
    {
      label: "Attendees",
      render: (r) => `${r._count?.records || 0} recorded`,
    },
    {
      label: "Action",
      render: (r) => (
        <button
          onClick={() => viewSession(r)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700"
        >
          <Eye size={13} />
          View
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Attendance records"
        description="Monitor real-time and historical attendance sessions across your institution."
      />
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[240px] max-w-md items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search by teacher, subject, or class name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              className="input py-1.5 text-xs font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Live sessions</option>
              <option value="ENDED">Completed</option>
              <option value="EXPIRED">Expired</option>
            </select>

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

        {loading ? <Loading /> : <SimpleTable rows={sessions} columns={cols} />}
      </div>

      {/* SESSION DETAILS MODAL */}
      {showDetails && (
        <Modal
          title="Attendance session details"
          onClose={() => {
            setShowDetails(false);
            setSelectedSession(null);
          }}
        >
          {detailsLoading || !selectedSession ? (
            <Loading />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-slate-400">Class:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedSession.classSubject?.schoolClass?.name}{" "}
                    {selectedSession.classSubject?.schoolClass?.division
                      ? `(${selectedSession.classSubject?.schoolClass?.division})`
                      : ""}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Subject:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedSession.classSubject?.subject?.name}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Teacher:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedSession.teacher?.fullName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedSession.status)}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Attendee Roster ({selectedSession.records?.length || 0})
                </h3>
                <div className="max-h-80 overflow-y-auto">
                  <SimpleTable
                    rows={selectedSession.records || []}
                    columns={[
                      {
                        label: "Student",
                        render: (rec) => rec.student?.fullName || "—",
                      },
                      {
                        label: "Student no.",
                        render: (rec) => rec.student?.studentDetails?.studentNumber || "—",
                      },
                      {
                        label: "Status",
                        render: (rec) => getRecordStatusBadge(rec.status),
                      },
                      {
                        label: "Method",
                        render: (rec) => rec.method || "BLE",
                      },
                      {
                        label: "Marked at",
                        render: (rec) =>
                          rec.markedAt ? new Date(rec.markedAt).toLocaleTimeString() : "—",
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
