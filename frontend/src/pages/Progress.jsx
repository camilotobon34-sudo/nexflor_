import { Link } from "react-router-dom";
import { useApi } from "../api.js";
import { Status } from "../components/Shell.jsx";

export default function Progress() {
  const { loading, error, data } = useApi("/progress");

  return (
    <Status loading={loading} error={error}>
      {data && (
        <section className="page">
          <div className="page-head">
            <div>
              <p className="eyebrow">Cómo va el aprendizaje</p>
              <h1>{data.title}</h1>
              <p className="lede">{data.summary}</p>
            </div>
            <Link className="button" to="/cursos">Seguir un curso</Link>
          </div>
          <div className="stats">
            {data.stats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </div>
          <div className="split">
            <section className="card">
              <h3>Cursos de Laura</h3>
              <div className="bars">
                {data.courses.map((course) => (
                  <Link key={course.id} to={`/cursos/${course.id}`} title={`${course.title}: ${course.percent}%`}>
                    <b style={{ height: `${Math.max(course.percent, 6)}%` }} />
                    <span>{short(course.title)}</span>
                  </Link>
                ))}
              </div>
            </section>
            <section className="card">
              <h3>Equipo</h3>
              <ul className="tracks">
                {data.people.map((person) => (
                  <li key={person.id}>
                    <div>
                      <span>{person.name}</span>
                      <b>{person.progress}%</b>
                    </div>
                    <i style={{ width: `${person.progress}%` }} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <section className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Tipo</th>
                  <th>Lecciones</th>
                  <th>Minutos</th>
                  <th>Avance</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((course) => (
                  <tr key={course.id}>
                    <td><Link to={`/cursos/${course.id}`}>{course.title}</Link></td>
                    <td>{course.category}</td>
                    <td>{course.done}/{course.total}</td>
                    <td>{course.minutes}</td>
                    <td>{course.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </section>
      )}
    </Status>
  );
}

function short(title) {
  return title.split(" ").slice(0, 2).join(" ");
}
