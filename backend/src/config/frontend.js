export function getFrontendOrigins() {
  const configured = process.env.FRONTEND_URL;
  if (!configured)
    throw new Error(
      "Missing FRONTEND_URL; configure at least one permitted client origin.",
    );
  return configured.split(",").map((value) => {
    const raw = value.trim();
    let url;
    try {
      url = new URL(raw);
    } catch {
      throw new Error(
        "FRONTEND_URL must contain comma-separated http(s) origins.",
      );
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error(
        "FRONTEND_URL must contain only http(s) origins, without credentials, paths, queries, or fragments.",
      );
    return url.origin;
  });
}
export function getPasswordRedirect(path) {
  return new URL(path, getFrontendOrigins()[0]).toString();
}
