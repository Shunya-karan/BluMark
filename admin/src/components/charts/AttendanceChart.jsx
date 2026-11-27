import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
export default function AttendanceChart({ attendance }) {
  const data = [
    { name: "Present", value: attendance.present || 0, color: "#059669" },
    { name: "Late", value: attendance.late || 0, color: "#f59e0b" },
    { name: "Absent", value: attendance.absent || 0, color: "#f43f5e" },
    { name: "Excused", value: attendance.excused || 0, color: "#64748b" },
  ];
  return (
    <ResponsiveContainer width="100%" height={275}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={3}
        >
          {data.map((x) => (
            <Cell key={x.name} fill={x.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
