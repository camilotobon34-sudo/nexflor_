import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

function adminApi(path, token, options = {}) {
  return api(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
}

function dateTime(value) {
  return value ? new Date(value).toLocaleString("es-CO") : "—";
}

export default function FaceAdmin({ token }) {
  const [people, setPeople] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newCode, setNewCode] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextPeople, nextAttendance, nextStaff] = await Promise.all([
        adminApi("/admin/face/people", token),
        adminApi("/admin/face/attendance", token),
        adminApi("/admin/staff", token),
      ]);
      setPeople(nextPeople);
      setAttendance(nextAttendance);
      setStaff(nextStaff);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { reload(); }, [reload]);

  async function submitStaff(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminApi("/admin/staff", token, { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", username: "", password: "" });
      setNotice("Cuenta de escaneo creada.");
      await reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function action(path, options = {}, success = "Cambios guardados.") {
    setBusy(true);
    setError("");
    setNotice("");
    setNewCode("");
    try {
      const result = await adminApi(path, token, options);
      if (result.pin) setNewCode(`Código alternativo para ${result.person.fullName}: ${result.pin}`);
      else setNotice(success);
      await reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="status error" role="alert">{error}</p>}
      {notice && <p className="status" role="status">{notice}</p>}
      {newCode && <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-950" role="status">{newCode}. Cópialo ahora; no se volverá a mostrar.</p>}

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2>Asistencia de hoy</h2>
            <p className="lede">{attendance?.date || "Cargando fecha…"}</p>
          </div>
          <button type="button" onClick={reload} disabled={loading} className="button">Actualizar</button>
        </div>
        <div className="grid gap-3 mt-4 sm:grid-cols-4">
          {[["Ingresos", attendance?.counts.entered], ["Ausentes", attendance?.counts.absent], ["Rechazados", attendance?.counts.denied], ["Pendientes", attendance?.counts.pending]].map(([label, count]) => (
            <div key={label} className="rounded-lg bg-slate-100 p-4">
              <p className="text-xs text-slate-600">{label}</p>
              <strong className="text-2xl">{count ?? "—"}</strong>
            </div>
          ))}
        </div>
        <h3 className="mt-6 font-semibold">Movimientos recientes</h3>
        {attendance?.history.length ? (
          <ul className="mt-2 divide-y">
            {attendance.history.slice(0, 20).map((event) => (
              <li key={event.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span><strong>{event.name}</strong> · {event.documentId || "Sin identificación"} · {event.method}</span>
                <span className={event.access === "permitido" ? "text-emerald-700" : "text-red-700"}>
                  {event.access === "permitido" ? "Permitido" : `Denegado · ${event.reason}`} · {dateTime(event.at)}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="status">No hay movimientos hoy.</p>}
      </section>

      <section className="card">
        <h2>Registros de Nexflor ID</h2>
        <p className="lede">Los nuevos registros se guardan en el servidor y aparecen aquí como pendientes de aprobación.</p>
        {loading && <p className="status">Cargando registros…</p>}
        {!loading && people.length === 0 && <p className="status">Todavía no hay personas registradas.</p>}
        <ul className="mt-3 divide-y">
          {people.map((person) => (
            <li key={person.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong>{person.fullName}</strong>
                  <p className="text-sm text-slate-600">{person.documentId} · {person.role || "Sin cargo"}</p>
                  <p className="text-xs text-slate-500">Estado: {person.status} · Registro: {dateTime(person.createdAt)}</p>
                  <p className="text-xs text-slate-500">Plantilla facial: {person.hasFace ? "sí" : "no"} · Código alternativo: {person.hasPin ? "sí" : "no"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {person.status === "pendiente" && <>
                    <button type="button" disabled={busy} className="button" onClick={() => action(`/admin/face/people/${person.id}/approve`, { method: "POST" }, "Persona aprobada.")}>Aprobar</button>
                    <button type="button" disabled={busy} className="danger" onClick={() => action(`/admin/face/people/${person.id}/reject`, { method: "POST" }, "Registro rechazado.")}>Rechazar</button>
                  </>}
                  {person.status === "autorizado" && <button type="button" disabled={busy} className="danger" onClick={() => action(`/admin/face/people/${person.id}/suspend`, { method: "POST" }, "Acceso suspendido.")}>Suspender</button>}
                  {["rechazado", "suspendido"].includes(person.status) && <button type="button" disabled={busy} className="button" onClick={() => action(`/admin/face/people/${person.id}/reactivate`, { method: "POST" }, "Acceso reactivado.")}>Reactivar</button>}
                  {!person.hasPin && <button type="button" disabled={busy} onClick={() => action(`/admin/face/people/${person.id}/code`, { method: "POST" })}>Crear código alternativo</button>}
                  <button type="button" disabled={busy} className="danger" onClick={() => {
                    if (window.confirm(`¿Eliminar el registro de ${person.fullName}?`)) {
                      action(`/admin/face/people/${person.id}`, { method: "DELETE" }, "Registro eliminado.");
                    }
                  }}>Eliminar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-grid">
        <div className="card">
          <h2>Cuentas de escaneo</h2>
          <p className="lede">Estas cuentas pueden registrar personas y verificar ingresos, no administrar reportes.</p>
          {staff.length === 0 && <p className="status">No hay cuentas de escaneo.</p>}
          <ul className="admin-list">
            {staff.map((person) => (
              <li key={person.id}>
                <span>{person.name}<small>{person.username} · {person.active ? "Activa" : "Suspendida"}</small></span>
                <button type="button" disabled={busy} onClick={() => action(`/admin/staff/${person.id}/active`, {
                  method: "POST",
                  body: JSON.stringify({ active: !person.active }),
                }, person.active ? "Cuenta suspendida." : "Cuenta activada.")}>
                  {person.active ? "Suspender" : "Activar"}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <form className="card stack" onSubmit={submitStaff}>
          <h2>Nueva cuenta de escaneo</h2>
          <label>Nombre<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength={3} required /></label>
          <label>Usuario<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} minLength={3} required /></label>
          <label>Contraseña (mínimo 12 caracteres)<input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={12} required /></label>
          <button className="button" type="submit" disabled={busy}>{busy ? "Guardando…" : "Crear cuenta"}</button>
        </form>
      </section>
    </div>
  );
}
