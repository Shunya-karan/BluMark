import { useEffect, useState } from "react";
import DirectoryPage from "../../components/common/DirectoryPage";
import { adminService } from "../../services/adminService";

export default function ClassesPage() {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    adminService.departments
      .list({ limit: 100, isActive: "true" })
      .then((r) => setDepartments(r.data?.departments || r.data?.items || []))
      .catch(() => {});
  }, []);

  return (
    <DirectoryPage
      title="Classes"
      description="Manage class groups and academic years."
      service={adminService.classes}
      itemKey="classes"
      createLabel="Add class"
      fields={[
        { name: "name", label: "Class name" },
        { name: "academicYear", label: "Academic year (e.g. 2026-2027)" },
        { name: "division", label: "Division (e.g. A, B, C)", optional: true },
        { name: "semester", label: "Semester", type: "number", optional: true },
        {
          name: "departmentId",
          label: "Department",
          type: "select",
          optional: true,
          placeholder: "Select department (optional)",
          options: departments.map((d) => ({
            value: d.id,
            label: `${d.name} (${d.code})`,
          })),
        },
      ]}
      columns={[
        { label: "Class", key: "name" },
        { label: "Division", render: (r) => r.division || "—" },
        { label: "Academic year", key: "academicYear" },
        { label: "Semester", render: (r) => (r.semester !== null && r.semester !== undefined ? r.semester : "—") },
        { label: "Department", render: (r) => (r.department ? `${r.department.name} (${r.department.code})` : "—") },
      ]}
    />
  );
}
