import "@fontsource/baloo-2/600.css";
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./styles.css";
import "./styles-m4.css";
import "./styles-anim.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Shell } from "./components/Layout";
import { Sammlung } from "./pages/Sammlung";
import { Rezeptansicht } from "./pages/Rezeptansicht";
import { NichtGefunden } from "./pages/NichtGefunden";
import { NeuesRezept } from "./pages/NeuesRezept";
import { Kochmodus } from "./pages/Kochmodus";
import { Einkauf } from "./pages/Einkauf";
import { Bearbeiten } from "./pages/Bearbeiten";
import { registerSW } from "virtual:pwa-register";
import { isNative, takePendingShare } from "./lib/server";
import { Einstellungen } from "./pages/Einstellungen";
import { useEffect, useState, type ReactNode } from "react";
import { AUTH_EVENT, getToken } from "./lib/auth";
import { Login } from "./pages/Login";

// Im Browser: Service Worker für Installation und Offline. In der Android-App nicht nötig.
if (!isNative()) registerSW({ immediate: true });

/** Zeigt die Anmeldung, solange kein Token da ist. Die Adresse bleibt erhalten (wichtig für Teilen-Links). */
/** Android: Teilen in TikTok/Instagram → Gopa öffnet "Neues Rezept" mit dem Link. */
function ShareListener() {
  const nav = useNavigate();
  useEffect(() => {
    const go = async () => {
      const text = await takePendingShare();
      if (text) nav(`/neu?text=${encodeURIComponent(text)}`);
    };
    void go();
    window.addEventListener("gopashare", go);
    return () => window.removeEventListener("gopashare", go);
  }, [nav]);
  return null;
}

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
      <ShareListener />
      <Routes>
        <Route path="/" element={<Shell><Sammlung /></Shell>} />
        <Route path="/rezept/:id" element={<Shell nav={false}><Rezeptansicht /></Shell>} />
        <Route path="/rezept/:id/bearbeiten" element={<Shell nav={false}><Bearbeiten /></Shell>} />
        <Route path="/rezept/:id/kochen" element={<Kochmodus />} />
        <Route path="/neu" element={<Shell nav={false}><NeuesRezept /></Shell>} />
        <Route path="/einkauf" element={<Shell><Einkauf /></Shell>} />
        <Route path="/einstellungen" element={<Shell nav={false}><Einstellungen /></Shell>} />
        <Route path="*" element={<Shell><NichtGefunden /></Shell>} />
      </Routes>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
);
