export const COOKIE_TRANSPORT_HEADER = "x-auth-transport";

const common = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge,
});

export function readCookie(req, name) {
  const header = req.get("cookie") || "";
  for (const item of header.split(";")) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function useCookieTransport(req) {
  return req.get(COOKIE_TRANSPORT_HEADER)?.toLowerCase() === "cookie";
}

export function setAuthCookies(res, session) {
  res.cookie("blumark_access", session.accessToken, common(session.expiresIn * 1000));
  res.cookie("blumark_refresh", session.refreshToken, common(7 * 24 * 60 * 60 * 1000));
}

export function clearAuthCookies(res) {
  for (const name of ["blumark_access", "blumark_refresh"]) {
    res.clearCookie(name, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });
  }
}

