import { Bell, Menu, Search, UserRoundCog } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
export default function Topbar({ onMenu }) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-100 bg-white/90 px-5 backdrop-blur">
      <button
        onClick={onMenu}
        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      >
        <Menu />
      </button>
      <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-slate-400 md:flex">
        <Search size={17} />
        <span className="text-sm">Search records from each module</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Link
          to="/notifications"
          className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100"
        >
          <Bell size={20} />
        </Link>
        <Link to="/profile" className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <UserRoundCog size={17} />
          </div>
          <div className="hidden text-left sm:block">
            <p className="max-w-36 truncate text-sm font-semibold text-slate-700">
              {user?.fullName}
            </p>
            <p className="text-xs text-slate-400">Administrator</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
