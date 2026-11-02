import "@fontsource/baloo-2/600.css";
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./styles.css";
import "./styles-m4.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Layout";
import { Sammlung } from "./pages/Sammlung";
import { Rezeptansicht } from "./pages/Rezeptansicht";
import { NichtGefunden } from "./pages/NichtGefunden";
import { NeuesRezept } from "./pages/NeuesRezept";
import { Kochmodus } from "./pages/Kochmodus";
import { Einkauf } from "./pages/Einkauf";
import { Bearbeiten } from "./pages/Bearbeiten";
import { registerSW } from "virtual:pwa-register";
import { useEffect, useState, type ReactNode } from "react";
import { AUTH_EVENT, getToken } from "./lib/auth";
import { Login } from "./pages/Login";

registerSW({ immediate: true });

/** Zeigt die Anmeldung, solange kein Token da ist. Die Adresse bleibt erhalten (wichtig für Teilen-Links). */
function AuthGate({ children }: { children: ReactNode }) {
  const [token, setTok] = useState(getToken());
  useEffect(() => {
    const h = () => setTok(getToken());
    window.addEventListener(AUTH_EVENT, h);
    return () => window.removeEventListener(AUTH_EVENT, h);
  }, []);
  return token ? <>{children}</> : <Shell nav={false}><Login /></Shell>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthGate>
      <Routes>
        <Route path="/" element={<Shell><Sammlung /></Shell>} />
        <Route path="/rezept/:id" element={<Shell nav={false}><Rezeptansicht /></Shell>} />
        <Route path="/rezept/:id/bearbeiten" element={<Shell nav={false}><Bearbeiten /></Shell>} />
        <Route path="/rezept/:id/kochen" element={<Kochmodus />} />
        <Route path="/neu" element={<Shell nav={false}><NeuesRezept /></Shell>} />
        <Route path="/einkauf" element={<Shell><Einkauf /></Shell>} />
        <Route path="*" element={<Shell><NichtGefunden /></Shell>} />
      </Routes>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
);
