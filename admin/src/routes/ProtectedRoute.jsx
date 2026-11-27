import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-emerald-700">Loading BluMark…</div>
    );
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
