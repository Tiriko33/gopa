import "@fontsource/baloo-2/600.css";
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Layout";
import { Sammlung } from "./pages/Sammlung";
import { Rezeptansicht } from "./pages/Rezeptansicht";
import { Bald } from "./pages/Bald";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Shell><Sammlung /></Shell>} />
        <Route path="/rezept/:id" element={<Shell nav={false}><Rezeptansicht /></Shell>} />
        <Route path="*" element={<Shell><Bald /></Shell>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
