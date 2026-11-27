import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Settings,
  Users,
  UserRoundCog,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
const nav = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/students", icon: GraduationCap, label: "Students" },
  { to: "/teachers", icon: Users, label: "Teachers" },
  { to: "/parents", icon: Users, label: "Parents" },
  { to: "/departments", icon: Building2, label: "Departments" },
  { to: "/courses", icon: BookOpen, label: "Courses" },
  { to: "/classes", icon: BookOpen, label: "Classes" },
  { to: "/subjects", icon: ClipboardCheck, label: "Subjects" },
  { to: "/attendance", icon: CalendarDays, label: "Attendance" },
  { to: "/timetable", icon: CalendarDays, label: "Timetable" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/devices", icon: MonitorSmartphone, label: "Devices" },
];
export default function Sidebar({ collapsed, toggle }) {
  const { signOut } = useAuth();
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-ink text-white transition-all ${collapsed ? "w-[76px]" : "w-64"}`}
    >
      <div className="flex h-20 items-center gap-3 px-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400 text-lg font-black text-ink">
          B
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold">BluMark</div>
            <div className="text-xs text-emerald-200">ADMIN PORTAL</div>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            title={label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive ? "bg-white/15 text-white" : "text-emerald-50/70 hover:bg-white/10 hover:text-white"}`
            }
          >
            <Icon size={19} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <NavLink
          to="/settings"
          className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-50/70 hover:bg-white/10"
        >
          <Settings size={19} />
          {!collapsed && "Settings"}
        </NavLink>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-50/70 hover:bg-white/10"
        >
          <LogOut size={19} />
          {!collapsed && "Sign out"}
        </button>
        <button
          onClick={toggle}
          className="mt-2 flex w-full items-center justify-center rounded-xl p-2 text-emerald-100 hover:bg-white/10"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
