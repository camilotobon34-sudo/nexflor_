import React, { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { workerToken } from "./api.js";
import Shell from "./components/Shell.jsx";
import AdminShortcut from "./components/AdminShortcut.jsx";

const Home = lazy(() => import("./pages/Home.jsx"));
const CourseCatalog = lazy(() => import("./pages/CourseCatalog.jsx"));
const Course = lazy(() => import("./pages/Course.jsx"));
const Workshop = lazy(() => import("./pages/Workshop.jsx"));
const Game = lazy(() => import("./pages/Game.jsx"));
const Practice = lazy(() => import("./pages/Practice.jsx"));
const Team = lazy(() => import("./pages/Team.jsx"));
const Progress = lazy(() => import("./pages/Progress.jsx"));
const Posture = lazy(() => import("./pages/Posture.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const Enter = lazy(() => import("./pages/Enter.jsx"));
const Face = lazy(() => import("./pages/Face.jsx"));

function Guard() {
  const [hasSession, setHasSession] = useState(() => Boolean(workerToken()));

  useEffect(() => {
    function onSessionExpired() {
      setHasSession(Boolean(workerToken()));
    }
    window.addEventListener("nexflor:session-expired", onSessionExpired);
    return () => window.removeEventListener("nexflor:session-expired", onSessionExpired);
  }, []);

  if (!hasSession) return <Navigate to="/entrar" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <>
      <AdminShortcut />
      <Suspense fallback={<main className="page"><p className="status" role="status">Cargando módulo…</p></main>}>
        <Routes>
          <Route path="/entrar" element={<Enter />} />
          <Route path="/ingreso" element={<Face />} />
          <Route path="/id" element={<Face />} />
          <Route path="/admin" element={<Admin />} />
          <Route element={<Guard />}>
            <Route element={<Shell />}>
              <Route index element={<Home />} />
              <Route path="cursos" element={<CourseCatalog />} />
              <Route path="cursos/:id" element={<Course />} />
              <Route path="cursos/:id/taller" element={<Workshop />} />
              <Route path="cursos/:id/juego" element={<Game />} />
              <Route path="practica/:id" element={<Practice />} />
              <Route path="equipo" element={<Team />} />
              <Route path="progreso" element={<Progress />} />
              <Route path="posture" element={<Posture />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}