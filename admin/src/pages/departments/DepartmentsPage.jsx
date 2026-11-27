import DirectoryPage from "../../components/common/DirectoryPage";
import { adminService } from "../../services/adminService";
export default function DepartmentsPage() {
  return (
    <DirectoryPage
      title="Departments"
      description="Create and maintain institution departments."
      service={adminService.departments}
      itemKey="departments"
      createLabel="Add department"
      fields={[
        { name: "name", label: "Department name" },
        { name: "code", label: "Department code" },
      ]}
      columns={[
        { label: "Name", key: "name" },
        { label: "Code", key: "code" },
        { label: "Created", render: (r) => new Date(r.createdAt).toLocaleDateString() },
      ]}
    />
  );
}
