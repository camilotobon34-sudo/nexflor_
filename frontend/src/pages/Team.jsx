import { useState } from "react";
import { useApi } from "../api.js";
import { Status } from "../components/Shell.jsx";

export default function Team() {
  const { loading, error, data } = useApi("/team");
  const [selected, setSelected] = useState("laura");

  return (
    <Status loading={loading} error={error}>
      {data && (
        <TeamBody data={data} selected={selected} setSelected={setSelected} />
      )}
    </Status>
  );
}

function TeamBody({ data, selected, setSelected }) {
  const [shift, setShift] = useState("Todos");
  const people = data.people.filter((item) => shift === "Todos" || item.shift === shift);
  const person = data.people.find((item) => item.id === selected) || people[0];

  function chooseShift(next) {
    setShift(next);
    const pool = data.people.filter((item) => next === "Todos" || item.shift === next);
    if (!pool.some((item) => item.id === selected) && pool[0]) setSelected(pool[0].id);
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Personas del local</p>
          <h1>{data.title}</h1>
          <p className="lede">{data.summary}</p>
        </div>
      </div>
      <div className="stats">
        {data.stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
      <div className="chips">
        {["Todos", "Mañana", "Tarde"].map((item) => (
          <button key={item} type="button" className={item === shift ? "on" : ""} onClick={() => chooseShift(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="team-layout">
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Rol</th>
                <th>Turno</th>
                <th>Avance</th>
              </tr>
            </thead>
            <tbody>
              {people.map((item) => (
                <tr key={item.id} className={item.id === person.id ? "picked" : ""} onClick={() => setSelected(item.id)}>
                  <td>{item.name}</td>
                  <td>{item.role}</td>
                  <td>{item.shift}</td>
                  <td>{item.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="card profile">
          <span className="avatar">{initials(person.name)}</span>
          <h2>{person.name}</h2>
          <p>{person.role} · turno de {person.shift.toLowerCase()}</p>
          <div className="meter"><i style={{ width: `${person.progress}%` }} /></div>
          <small>Va en {person.focus}</small>
          <b>{person.progress}% del recorrido</b>
        </aside>
      </div>
    </section>
  );
}

function initials(name) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("");
}
