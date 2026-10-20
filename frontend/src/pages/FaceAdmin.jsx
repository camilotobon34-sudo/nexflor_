import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

function adminApi(path, token, options = {}) {
  return api(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
}

function when(time) {
  if (!time) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(time));
}

const labels = {
  autorizado: "Autorizado",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
  suspendido: "Suspendido",
  permitido: "Permitido",
  denegado: "Denegado",
};

export default function FaceAdmin({ token }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const [date, setDate] = useState(today);
  const [query, setQuery] = useState("");
  const [board, setBoard] = useState(null);
  const [people, setPeople] = useState([]);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState("");
  const [pinNote, setPinNote] = useState("");
  const [staff, setStaff] = useState([]);
  const [account, setAccount] = useState({ username: "", name: "", password: "" });
  const [updatedAt, setUpdatedAt] = useState(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  async function load(nextQuery = queryRef.current) {
    try {
      const [nextBoard, nextPeople, nextHistory, nextAlerts, nextAudit, nextStaff] = await Promise.all([
        adminApi(`/admin/face/attendance?date=${date}`, token),
        adminApi("/admin/face/people", token),
        adminApi(`/admin/face/history?date=${date}&q=${encodeURIComponent(nextQuery)}`, token),
        adminApi("/admin/face/alerts", token),
        adminApi("/admin/face/audit", token),
        adminApi("/admin/staff", token),
      ]);
      setBoard(nextBoard);
      setPeople(nextPeople);
      setHistory(nextHistory);
      setAlerts(nextAlerts);
      setAudit(nextAudit);
      setStaff(nextStaff);
      setUpdatedAt(Date.now());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load(query);
    const timer = setInterval(() => load(queryRef.current), 8000);
    return () => clearInterval(timer);
  }, [token, date]);

  async function act(path) {
    setPinNote("");
    try {
      const body = await adminApi(path, token, { method: path.includes("/code") ? "POST" : path.startsWith("/admin/face/people/") && path.endsWith("/face") ? "DELETE" : "POST" });
      if (body.pin) setPinNote(`Código de un solo vistazo: ${body.pin}. Entrégalo a la persona y no lo dejes escrito aquí.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removePerson(id) {
    try {
      await adminApi(`/admin/face/people/${id}`, token, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveStaff(event) {
    event.preventDefault();
    setError("");
    try {
      await adminApi("/admin/staff", token, { method: "POST", body: JSON.stringify(account) });
      setAccount({ username: "", name: "", password: "" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleStaff(person) {
    try {
      await adminApi(`/admin/staff/${person.id}/active`, token, {
        method: "POST",
        body: JSON.stringify({ active: !person.active }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="face-admin">
      {error && <p className="status error">{error}</p>}
      {pinNote && <p className="face-result ok">{pinNote}</p>}
      <p className="muted">Este reporte se actualiza solo cada pocos segundos{updatedAt ? ` · última lectura ${when(updatedAt)}` : ""}.</p>
      <div className="stats">
        <article className="card stat"><span>Entraron hoy</span><strong>{board?.counts.entered ?? "–"}</strong></article>
        <article className="card stat"><span>No se han presentado</span><strong>{board?.counts.absent ?? "–"}</strong></article>
        <article className="card stat"><span>Rechazados</span><strong>{board?.counts.denied ?? "–"}</strong></article>
        <article className="card stat"><span>Pendientes</span><strong>{board?.counts.pending ?? "–"}</strong></article>
      </div>

      <section className="card">
        <header><h2>Registro de entradas</h2></header>
        <div className="toolbar">
          <label>Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>Persona<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o identificación" /></label>
          <button type="button" onClick={load}>Consultar</button>
        </div>
        <div className="split-lists">
          <div>
            <h3>Ingresaron</h3>
            <ul>{board?.entered.map((person) => <li key={person.id}><strong>{person.fullName}</strong><span>{when(person.at)}</span></li>)}</ul>
            {!board?.entered.length && <p className="muted">Nadie autorizado ha ingresado en esta fecha.</p>}
          </div>
          <div>
            <h3>No han ingresado</h3>
            <ul>{board?.absent.map((person) => <li key={person.id}><strong>{person.fullName}</strong><span>{person.documentId}</span></li>)}</ul>
            {!board?.absent.length && <p className="muted">No hay ausencias entre las personas autorizadas.</p>}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Alertas</h2>
        <ul className="admin-list">
          {alerts.filter((alert) => !alert.reviewed).map((alert) => (
            <li key={alert.id}>
              <div>
                <strong>{alert.name}</strong>
                <span>{when(alert.at)} · {alert.kind === "suplantacion" ? "Intento sospechoso" : "Varios intentos fallidos"} · {alert.attempts} intentos</span>
              </div>
              <button type="button" onClick={() => act(`/admin/face/alerts/${alert.id}/review`)}>Marcar revisada</button>
            </li>
          ))}
        </ul>
        {!alerts.some((alert) => !alert.reviewed) && <p className="muted">No hay alertas pendientes.</p>}
      </section>

      <section className="card">
        <h2>Personas registradas</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Identificación</th><th>Cargo</th><th>Registro</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td>{person.fullName}</td>
                  <td>{person.documentId}</td>
                  <td>{person.role || "—"}</td>
                  <td>{when(person.createdAt)}</td>
                  <td><span className={`pill ${person.status}`}>{labels[person.status] || person.status}</span></td>
                  <td className="row-actions">
                    {person.status !== "autorizado" && <button type="button" onClick={() => act(`/admin/face/people/${person.id}/approve`)}>Aprobar</button>}
                    {person.status === "pendiente" && <button type="button" onClick={() => act(`/admin/face/people/${person.id}/reject`)}>Rechazar</button>}
                    {person.status === "autorizado" && <button type="button" onClick={() => act(`/admin/face/people/${person.id}/suspend`)}>Suspender</button>}
                    {person.status === "suspendido" && <button type="button" onClick={() => act(`/admin/face/people/${person.id}/reactivate`)}>Reactivar</button>}
                    <button type="button" onClick={() => act(`/admin/face/people/${person.id}/code`)}>Código</button>
                    <button type="button" onClick={() => act(`/admin/face/people/${person.id}/face`)}>Borrar rostro</button>
                    <button type="button" onClick={() => removePerson(person.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!people.length && <p className="muted">Todavía no hay personas registradas con rostro.</p>}
      </section>

      <section className="card">
        <h2>Historial</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Hora</th><th>Persona</th><th>Resultado</th><th>Acceso</th><th>Motivo</th><th>Intentos</th><th>Registró</th></tr>
            </thead>
            <tbody>
              {history.map((event) => (
                <tr key={event.id}>
                  <td>{when(event.at)}</td>
                  <td>{event.name}</td>
                  <td>{labels[event.result] || event.result}</td>
                  <td><span className={`pill ${event.access}`}>{labels[event.access] || event.access}</span></td>
                  <td>{event.reason || "—"}</td>
                  <td>{event.attempts || 0}</td>
                  <td>{event.by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Personal que escanea</h2>
        <p className="muted">Estas cuentas entran a Reconocimiento facial. No ven reportes ni pueden aprobar a nadie.</p>
        <ul className="admin-list">
          {staff.map((person) => (
            <li key={person.id}>
              <div>
                <strong>{person.name}</strong>
                <span>{person.username} · {person.active ? "Activa" : "Suspendida"}</span>
              </div>
              <button type="button" onClick={() => toggleStaff(person)}>{person.active ? "Suspender" : "Reactivar"}</button>
            </li>
          ))}
        </ul>
        <form className="face-form" onSubmit={saveStaff}>
          <label>Nombre<input value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} /></label>
          <label>Usuario<input value={account.username} onChange={(event) => setAccount({ ...account, username: event.target.value })} autoComplete="off" /></label>
          <label>Contraseña<input type="password" value={account.password} onChange={(event) => setAccount({ ...account, password: event.target.value })} autoComplete="new-password" /></label>
          <button className="button" type="submit">Crear cuenta de escaneo</button>
        </form>
      </section>

      <section className="card">
        <h2>Acciones del administrador</h2>
        <ul>{audit.slice(0, 8).map((entry) => <li key={entry.id}>{when(entry.at)} · {entry.detail}</li>)}</ul>
      </section>
    </div>
  );
}
