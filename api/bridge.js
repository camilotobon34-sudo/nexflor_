import app from "../backend/src/server.js";

export default function handleApi(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const route = url.searchParams.get("__nexflor_route");
  if (!route || !/^[\w-]+(?:\/[\w-]+)*$/.test(route)) {
    return res.status(400).json({ message: "Ruta API inválida." });
  }

  url.searchParams.delete("__nexflor_route");
  req.url = `/api/${route}${url.search}`;
  return app(req, res);
}
