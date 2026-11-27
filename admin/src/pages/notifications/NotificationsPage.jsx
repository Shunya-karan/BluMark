import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import SimpleTable from "../../components/tables/SimpleTable";
import { Loading, ErrorState } from "../../components/common/DataState";
import { adminService } from "../../services/adminService";
import { errorMessage } from "../../services/api";
export default function NotificationsPage() {
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [form, setForm] = useState({
      title: "",
      body: "",
      type: "GENERAL",
      target: { scope: "INSTITUTION" },
    });
  const load = async () => {
    try {
      const r = await adminService.notifications.list({
        page: 1,
        limit: 50,
        readStatus: "ALL",
        sortOrder: "desc",
      });
      setRows(r.data.notifications || []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await adminService.notifications.send(form);
      setShow(false);
      setForm({ title: "", body: "", type: "GENERAL", target: { scope: "INSTITUTION" } });
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Send institution-wide notifications and review delivery history."
        action={
          <button className="btn-primary" onClick={() => setShow(true)}>
            <Plus size={17} />
            New notification
          </button>
        }
      />
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}
      <div className="card">
        {loading ? (
          <Loading />
        ) : (
          <SimpleTable
            rows={rows}
            columns={[
              { label: "Title", key: "title" },
              { label: "Type", key: "type" },
              { label: "Recipient", render: (r) => r.recipient?.fullName || "—" },
              { label: "Sent", render: (r) => new Date(r.createdAt).toLocaleString() },
              { label: "Read", render: (r) => (r.readAt ? "Read" : "Unread") },
            ]}
          />
        )}
      </div>
      {show && (
        <Modal title="Send notification" onClose={() => setShow(false)}>
          <form className="space-y-4" onSubmit={submit}>
            <label className="label">
              Title
              <input
                className="input mt-1"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="label">
              Message
              <textarea
                className="input mt-1 min-h-28"
                required
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
            <label className="label">
              Audience
              <select
                className="input mt-1"
                value={form.target.scope}
                onChange={(e) => {
                  const scope = e.target.value;
                  setForm({
                    ...form,
                    target: scope === "ROLE" ? { scope, role: "STUDENT" } : { scope },
                  });
                }}
              >
                <option value="INSTITUTION">Entire institution</option>
                <option value="ROLE">By role</option>
              </select>
            </label>
            {form.target.scope === "ROLE" && (
              <label className="label">
                Role
                <select
                  className="input mt-1"
                  value={form.target.role}
                  onChange={(e) =>
                    setForm({ ...form, target: { ...form.target, role: e.target.value } })
                  }
                >
                  <option>STUDENT</option>
                  <option>TEACHER</option>
                </select>
              </label>
            )}
            <button className="btn-primary w-full">Send notification</button>
          </form>
        </Modal>
      )}
    </>
  );
}
