import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

const CHUNK_RELOAD_KEY = "syndeocare-chunk-reload-at";
const CHUNK_RELOAD_THROTTLE_MS = 30_000;

const reloadOnChunkError = () => {
  const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? "0");
  if (Date.now() - lastReloadAt < CHUNK_RELOAD_THROTTLE_MS) return;

  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  window.location.reload();
};

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadOnChunkError();
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = String((event as PromiseRejectionEvent).reason ?? "");
  if (reason.includes("Failed to fetch dynamically imported module")) {
    event.preventDefault();
    reloadOnChunkError();
  }
});

// Initialize theme before render to prevent flash
const initializeTheme = () => {
  const stored = localStorage.getItem("syndeocare-theme");
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  let theme: "light" | "dark";
  if (stored === "light" || stored === "dark") {
    theme = stored;
  } else {
    theme = systemPrefersDark ? "dark" : "light";
  }

  document.documentElement.classList.add(theme);
};

initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
