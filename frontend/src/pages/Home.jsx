import { Link } from "react-router-dom";
import { useApi } from "../api.js";
import { Status } from "../components/Shell.jsx";

export default function Home() {
  const { loading, error, data } = useApi("/dashboard");

  return (
    <Status loading={loading} error={error}>
      {data && (
        <section className="page">
          <p className="eyebrow">Inicio del turno</p>
          <h1>{data.greeting}</h1>
          <div className="chips">
            <Link to="/id">1. NEXFLOR ID</Link>
            <Link to="/cursos">2. Academy</Link>
            <Link to="/practica/preparacion-segura">3. Práctica</Link>
          </div>
          <p className="lede">{data.subtitle}</p>

          <article className="hero">
            <div>
              <span>{data.banner.kicker}</span>
              <h2>{data.banner.title}</h2>
              <p>{data.banner.text}</p>
              <Link to={data.banner.href}>{data.banner.cta}</Link>
            </div>
            <img src={data.banner.image} alt="Arreglo floral del curso en curso" />
          </article>

          <div className="stats">
            {data.stats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.hint}</small>
              </article>
            ))}
          </div>

          <div className="split">
            <section className="card">
              <header>
                <h3>Lo que sigue en la mesa</h3>
                <Link to="/cursos">Ver cursos</Link>
              </header>
              <ul className="tasks">
                {data.tasks.map((task) => (
                  <li key={task.id}>
                    <div>
                      <strong>{task.title}</strong>
                      <small>{task.meta}</small>
                    </div>
                    <Link to={task.href}>Abrir</Link>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card">
              <header>
                <h3>Recorridos abiertos</h3>
              </header>
              <ul className="tracks">
                {data.tracks.map((track) => (
                  <li key={track.id}>
                    <div>
                      <Link to={`/cursos/${track.id}`}>{track.label}</Link>
                      <b>{track.value}%</b>
                    </div>
                    <i style={{ width: `${track.value}%` }} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      )}
    </Status>
  );
}
