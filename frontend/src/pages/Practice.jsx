import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, useApi } from "../api.js";
import { Status } from "../components/Shell.jsx";

export default function Practice() {
  const { id } = useParams();
  const { loading, error, data } = useApi(`/courses/${id}/quiz`);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    setAnswers({});
    setResult(null);
    setNote("");
  }, [id]);

  const answered = data ? data.questions.filter((question) => answers[question.id]).length : 0;

  async function submit(event) {
    event.preventDefault();
    if (!data || answered < data.questions.length) {
      setNote("Responde todas las preguntas antes de enviar.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      const body = await api(`/courses/${id}/quiz`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setResult(body);
    } catch (err) {
      setNote(err.message);
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswers({});
    setNote("");
  }

  return (
    <Status loading={loading} error={error}>
      {data && (
        <section className="page">
          <p className="eyebrow">{data.courseTitle}</p>
          <h1>{data.title}</h1>
          <p className="lede">{data.summary}</p>
          <form className="practice" onSubmit={submit}>
            <div className="questions">
              <div className="course-progress">
                <span>{answered} de {data.questions.length} respondidas</span>
                <div className="meter"><i style={{ width: `${data.questions.length ? (answered / data.questions.length) * 100 : 0}%` }} /></div>
              </div>
              {data.questions.map((question, index) => {
                const mark = result?.results.find((item) => item.id === question.id);
                return (
                  <fieldset key={question.id} className={mark ? (mark.correct ? "good" : "bad") : ""}>
                    <legend>{index + 1}. {question.prompt}</legend>
                    {question.options.map((option) => {
                      const picked = answers[question.id] === option.id;
                      const right = mark && option.id === mark.correctOptionId;
                      const wrong = mark && picked && !mark.correct;
                      return (
                        <label key={option.id} className={[picked ? "picked" : "", right ? "right" : "", wrong ? "wrong" : ""].filter(Boolean).join(" ")}>
                          <input
                            type="radio"
                            name={question.id}
                            value={option.id}
                            checked={picked}
                            disabled={Boolean(result)}
                            onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                          />
                          {option.text}
                        </label>
                      );
                    })}
                  </fieldset>
                );
              })}
              {note && <p className="status error">{note}</p>}
              {result ? (
                <button className="button ghost" type="button" onClick={retry}>Intentar de nuevo</button>
              ) : (
                <button className="button" type="submit" disabled={busy || answered < data.questions.length}>
                  {busy ? "Guardando…" : "Enviar práctica"}
                </button>
              )}
            </div>
            <aside className="card sand score">
              <h3>Resultado</h3>
              {result ? (
                <>
                  <strong>{result.percent}%</strong>
                  <p>{result.score} de {result.total} bien. Quedó guardado en el taller.</p>
                </>
              ) : (
                <>
                  <strong>{data.lastAttempt ? `${data.lastAttempt.percent}%` : "—"}</strong>
                  <p>
                    {data.lastAttempt
                      ? `Último intento: ${data.lastAttempt.score} de ${data.lastAttempt.total}.`
                      : "Todavía no envías esta práctica."}
                  </p>
                </>
              )}
              <Link to={`/cursos/${id}`}>Volver al curso</Link>
            </aside>
          </form>
        </section>
      )}
    </Status>
  );
}
