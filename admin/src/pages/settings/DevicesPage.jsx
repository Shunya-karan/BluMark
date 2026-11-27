import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import SimpleTable from "../../components/tables/SimpleTable";
import { Loading, ErrorState } from "../../components/common/DataState";
import { adminService } from "../../services/adminService";
import { errorMessage } from "../../services/api";
export default function DevicesPage() {
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = async () => {
    try {
      const r = await adminService.devices.list({ page: 1, limit: 50, status: "all" });
      setRows(r.data.devices || []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const approve = async (id) => {
    try {
      await adminService.devices.approve(id);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <>
      <PageHeader
        title="Registered devices"
        description="Review student Bluetooth device registrations."
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
              { label: "Student", render: (r) => r.student?.fullName },
              { label: "Identifier", key: "deviceIdentifier" },
              { label: "Status", key: "status" },
              { label: "Registered", render: (r) => new Date(r.registeredAt).toLocaleString() },
              {
                label: "Action",
                render: (r) =>
                  r.status === "PENDING" ? (
                    <button className="btn-secondary py-1.5" onClick={() => approve(r.id)}>
                      Approve
                    </button>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
        )}
      </div>
    </>
  );
}
