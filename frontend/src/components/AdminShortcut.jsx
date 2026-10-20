import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TOKEN_KEY } from "../pages/Admin.jsx";

const STEPS = ["F2", "e", "Control"];

export default function AdminShortcut() {
  const navigate = useNavigate();

  useEffect(() => {
    let step = 0;
    let timer = 0;
    const held = new Set();

    function resetLater() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        step = 0;
      }, 2000);
    }

    function openLogin() {
      step = 0;
      held.clear();
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("serrania-admin-lock"));
      navigate("/admin");
    }

    function named(event) {
      if (event.key === "Control" || event.key === "F2") return event.key;
      return event.key.toLowerCase();
    }

    function onKeyDown(event) {
      if (event.repeat) return;
      const key = named(event);
      held.add(key);
      if (held.has("Control") && held.has("F2") && held.has("e")) {
        event.preventDefault();
        openLogin();
        return;
      }
      if (key === "F2") event.preventDefault();
      if (key !== STEPS[step]) {
        step = key === "F2" ? 1 : 0;
        if (step === 1) resetLater();
        return;
      }
      step += 1;
      resetLater();
      if (step === STEPS.length) openLogin();
    }

    function onKeyUp(event) {
      held.delete(named(event));
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.clearTimeout(timer);
    };
  }, [navigate]);

  return null;
}
