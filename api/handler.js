import app from "../backend/src/server.js";

export default function handler(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const nested = url.searchParams.get("__path");
  if (nested && !nested.includes("..") && !nested.includes("://") && !nested.startsWith("/")) {
    url.searchParams.delete("__path");
    const rest = url.searchParams.toString();
    req.url = `/api/${nested}${rest ? `?${rest}` : ""}`;
  }
  return app(req, res);
}
