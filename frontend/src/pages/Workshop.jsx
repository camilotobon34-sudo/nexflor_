import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "../api.js";
import { Status } from "../components/Shell.jsx";

export default function Workshop() {
  const { id } = useParams();
  const { loading, error, data } = useApi(`/courses/${id}`);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Status loading={loading} error={error}>
      {data && (
        <section className="page">
          <p className="eyebrow">Así se ve el puesto</p>
          <h1>En el taller</h1>
          <p className="lede">{data.title}. Dos fotos del mismo trabajo: la mesa antes y el ramo ya armado.</p>
          <div className="gallery">
            {(data.gallery?.length ? data.gallery : [{ image: data.image, caption: data.title }]).map((shot) => (
              <figure key={shot.caption}>
                <button type="button" onClick={() => setOpen(shot)}>
                  <img src={shot.image} alt={shot.caption} />
                </button>
                <figcaption>{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
          {open && (
            <button className="lightbox" type="button" onClick={() => setOpen(null)} aria-label="Cerrar foto">
              <img src={open.image} alt={open.caption} />
              <span>{open.caption}. Clic o Escape para cerrar.</span>
            </button>
          )}
          <section className="card">
            <h3>Antes de dar la lección por hecha</h3>
            <ul className="plain">
              {data.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <span className={lesson.done ? "dot on" : "dot"} />
                  {lesson.title}
                </li>
              ))}
            </ul>
            <Link className="button" to={`/cursos/${data.id}`}>Volver a la lección</Link>
          </section>
        </section>
      )}
    </Status>
  );
}
