import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell.jsx";
import Home from "./pages/Home.jsx";
import Courses from "./pages/Courses.jsx";
import Course from "./pages/Course.jsx";
import Workshop from "./pages/Workshop.jsx";
import Game from "./pages/Game.jsx";
import Practice from "./pages/Practice.jsx";
import Team from "./pages/Team.jsx";
import Progress from "./pages/Progress.jsx";
import Admin from "./pages/Admin.jsx";
import AdminShortcut from "./components/AdminShortcut.jsx";

export default function App() {
  return (
    <>
    <AdminShortcut />
    <Routes>
      <Route path="admin" element={<Admin />} />
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="cursos" element={<Courses />} />
        <Route path="cursos/:id" element={<Course />} />
        <Route path="cursos/:id/taller" element={<Workshop />} />
        <Route path="cursos/:id/juego" element={<Game />} />
        <Route path="practica/:id" element={<Practice />} />
        <Route path="equipo" element={<Team />} />
        <Route path="progreso" element={<Progress />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  );
}
