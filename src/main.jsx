import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

/* ---- diagnostic overlay: any crash prints on screen instead of a white page ---- */
function showFatal(title, detail) {
  let el = document.getElementById("sw-fatal");
  if (!el) {
    el = document.createElement("div");
    el.id = "sw-fatal";
    el.style.cssText = "position:fixed;inset:0;z-index:99999;background:#1F3A5F;color:#fff;" +
      "font-family:ui-monospace,Menlo,monospace;padding:22px;overflow:auto;font-size:13px;line-height:1.5";
    document.body.appendChild(el);
  }
  el.innerHTML = "<div style='font-size:16px;font-weight:800;color:#E3B341;margin-bottom:10px'>" +
    "shopWORKS — startup error</div><div style='font-weight:700;margin-bottom:8px'>" + title +
    "</div><pre style='white-space:pre-wrap;font-size:11px;color:#C9D6E8'>" + (detail || "") +
    "</pre><div style='margin-top:14px;font-size:11px;color:#9FB2CC'>Screenshot this and send it over. " +
    "If this appeared right after a deploy, try a private/incognito tab first — it may be a cached page " +
    "referencing an old asset.</div>";
}
window.addEventListener("error", (e) => showFatal(e.message || "Script error", (e.error && e.error.stack) || (e.filename + ":" + e.lineno)));
window.addEventListener("unhandledrejection", (e) => showFatal("Unhandled promise rejection", (e.reason && (e.reason.stack || e.reason.message)) || String(e.reason)));

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { showFatal(err.message, (err.stack || "") + "\n\ncomponent stack:" + (info && info.componentStack || "")); }
  render() { return this.state.err ? null : this.props.children; }
}

try {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (err) {
  showFatal("Render failed at boot", err && err.stack);
}
