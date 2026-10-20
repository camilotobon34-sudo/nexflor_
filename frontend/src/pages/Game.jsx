import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "../api.js";
import { Status } from "../components/Shell.jsx";

export default function Game() {
  const { id } = useParams();
  const { loading, error, data } = useApi(`/courses/${id}`);

  return (
    <Status loading={loading} error={error}>
      {data && <GameBody key={data.id} data={data} />}
    </Status>
  );
}

function GameBody({ data }) {
  const steps = data.game?.steps || [];
  const ready = data.progress.percent === 100;
  const bank = useMemo(() => shuffle(steps), [steps]);
  const [placed, setPlaced] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState(data.game?.intro || "");
  const [shake, setShake] = useState("");

  if (!data.game) {
    return <p className="status">Este curso todavía no tiene juego.</p>;
  }

  if (!ready) {
    return (
      <section className="page">
        <p className="eyebrow">{data.title}</p>
        <h1>{data.game.title}</h1>
        <p className="lede">El juego se abre al terminar las lecciones. Vas en {data.progress.done} de {data.progress.total}.</p>
        <Link className="button" to={`/cursos/${data.id}`}>Volver a las lecciones</Link>
      </section>
    );
  }

  const done = placed.length === steps.length;
  const next = steps[placed.length];

  function pick(step) {
    if (done) return;
    if (step.id !== next.id) {
      setMistakes((count) => count + 1);
      setShake(step.id);
      setMessage("Ese paso va más adelante. Mira qué ya quedó en la mesa.");
      return;
    }
    setPlaced((current) => [...current, step.id]);
    setShake("");
    setMessage(step.why);
  }

  function again() {
    setPlaced([]);
    setMistakes(0);
    setShake("");
    setMessage(data.game.intro);
  }

  return (
    <section className="page">
      <p className="eyebrow">{data.title}</p>
      <h1>{data.game.title}</h1>
      <p className="lede">{message}</p>
      <div className="bench">
        <ol className="slots">
          {steps.map((step, index) => {
            const filled = placed.includes(step.id);
            return (
              <li key={step.id} className={filled ? "filled" : index === placed.length ? "now" : ""}>
                <span>{index + 1}</span>
                {filled ? step.label : "Esperando el paso"}
              </li>
            );
          })}
        </ol>
        {done ? (
          <div className="card sand result-card">
            <h2>Actividad lista</h2>
            <p>
              {mistakes === 0
                ? "La hiciste en orden, sin equivocarte."
                : `La terminaste con ${mistakes} ${mistakes === 1 ? "intento fuera de orden" : "intentos fuera de orden"}.`}
            </p>
            <button className="button" type="button" onClick={again}>Jugar otra vez</button>
            <Link to={`/cursos/${data.id}`}>Volver al curso</Link>
          </div>
        ) : (
          <div className="choices">
            {bank.filter((step) => !placed.includes(step.id)).map((step) => (
              <button
                key={step.id}
                type="button"
                className={shake === step.id ? "shake" : ""}
                onClick={() => pick(step)}
              >
                {step.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}
