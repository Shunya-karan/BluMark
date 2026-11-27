import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { Loading, ErrorState } from "../../components/common/DataState";
import { adminService } from "../../services/adminService";
import { errorMessage } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
export default function ProfilePage() {
  const { setUser } = useAuth();
  const [form, setForm] = useState(),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    adminService
      .profile()
      .then((r) => setForm(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  if (error) return <ErrorState message={error} />;
  if (!form) return <Loading />;
  const save = async (e) => {
    e.preventDefault();
    setSaved(false);
    try {
      const r = await adminService.updateProfile({
        fullName: form.fullName,
        phone: form.phone || undefined,
      });
      setForm(r.data);
      setUser(r.data);
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <>
      <PageHeader title="My profile" description="Your administrator account details." />
      <form className="card max-w-2xl" onSubmit={save}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">
            Full name
            <input
              className="input mt-1"
              value={form.fullName || ""}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </label>
          <label className="label">
            Phone
            <input
              className="input mt-1"
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="label sm:col-span-2">
            Email
            <input className="input mt-1 bg-slate-50" disabled value={form.email || ""} />
          </label>
        </div>
        {saved && <p className="mt-4 text-sm text-emerald-700">Profile saved.</p>}
        <button className="btn-primary mt-5">Save changes</button>
      </form>
    </>
  );
}
