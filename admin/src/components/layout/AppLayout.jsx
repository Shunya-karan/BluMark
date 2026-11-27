import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  return (
    <div>
      <Sidebar collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
      <main className={`min-h-screen transition-all ${collapsed ? "lg:ml-[76px]" : "lg:ml-64"}`}>
        <Topbar onMenu={() => setMobile(!mobile)} />
        <div className="mx-auto max-w-[1600px] p-5 sm:p-7">{children}</div>
      </main>
    </div>
  );
}
