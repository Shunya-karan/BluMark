import { createContext, useCallback, useEffect, useState } from "react";
import { authService } from "../services/authService";

export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const clear = useCallback(() => {
    sessionStorage.removeItem("bluemark_access_token");
    sessionStorage.removeItem("bluemark_refresh_token");
    setUser(null);
  }, []);
  const signIn = async (credentials) => {
    const r = await authService.login(credentials);
    const session = r.data;
    const profile = session.profile;
    if (profile?.role !== "INSTITUTION_ADMIN")
      throw new Error("This account is not authorized for the BluMark Admin portal.");
    sessionStorage.setItem("bluemark_access_token", session.accessToken);
    if (session.refreshToken)
      sessionStorage.setItem("bluemark_refresh_token", session.refreshToken);
    setUser(profile);
    return profile;
  };
  const signOut = async () => {
    try {
      await authService.logout();
    } catch {}
    clear();
  };
  useEffect(() => {
    const restore = async () => {
      if (!sessionStorage.getItem("bluemark_access_token")) return setLoading(false);
      try {
        const r = await authService.me();
        const current = r.data;
        if (current.role !== "INSTITUTION_ADMIN") throw new Error();
        setUser(current);
      } catch {
        clear();
      } finally {
        setLoading(false);
      }
    };
    restore();
    window.addEventListener("bluemark:unauthorized", clear);
    return () => window.removeEventListener("bluemark:unauthorized", clear);
  }, [clear]);
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
