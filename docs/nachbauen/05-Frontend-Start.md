# Kapitel 5: Frontend-Start

**Ziel:** Ein React-Projekt mit Vite und TypeScript, das im Browser "Hallo Gopa" zeigt und sich fehlerfrei bauen lässt.

Kurz, was die Werkzeuge sind:
- **React**: baut die Oberfläche aus kleinen Bausteinen (Komponenten).
- **TypeScript**: JavaScript mit Typen. Der Editor warnt dich, bevor du etwas Falsches tust (z. B. `rezept.titl` statt `rezept.titel`).
- **Vite**: der Entwicklungsserver (sofortige Vorschau beim Speichern) und der "Bauer", der aus allem die fertige Web-App macht (`dist/`).
- **react-router-dom**: mehrere "Seiten" in einer App (`/`, `/einkauf`, ...).
- **Vitest**: Tests für TypeScript.
- **Capacitor** (Kapitel 9): packt die fertige Web-App in eine Android-App.

## 5.1 Projektdateien anlegen

Im Projektordner:

```powershell
cd C:\Temp\gopa-nachbau
mkdir frontend, frontend\src, frontend\src\lib, frontend\src\components, frontend\src\pages, frontend\public
cd frontend
```

`frontend/package.json`: die Liste der Pakete und Befehle.

```json
{
  "name": "gopa-frontend",
  "private": true,
  "version": "0.3.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@capacitor/android": "^8.6.0",
    "@capacitor/core": "^8.6.0",
    "@fontsource/baloo-2": "^5.3.0",
    "@fontsource/nunito": "^5.3.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "react-router-dom": "^7.18.5"
  },
  "devDependencies": {
    "@capacitor/assets": "^4.0.0",
    "@capacitor/cli": "^8.6.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "typescript": "^7.0.2",
    "vite": "^8.3.5",
    "vite-plugin-pwa": "^2.0.0",
    "vitest": "^5.0.5"
  }
}
```

Die Skripte: `npm run dev` (Entwicklung), `npm run build` (erst `tsc` als Typprüfung, dann Vite), `npm test`.

> Die Versionen sind die der Musterlösung und dort getestet. Lass sie so, auch wenn es neuere gibt: Eine neue Hauptversion kann eine Konfiguration brechen.

```powershell
npm install
```

Das lädt ein paar hundert MB in `node_modules` (Ordner **nie** committieren, steht in der `.gitignore`) und erzeugt `package-lock.json` (die **schon**: sie legt exakte Versionen fest, damit GitHub später dasselbe baut wie du).

## 5.2 TypeScript, HTML, Vite

`frontend/tsconfig.json`: `strict: true` schaltet die strengen Prüfungen ein (das ist gewollt).

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client", "vite-plugin-pwa/client"]
  },
  "include": ["src"]
}
```

`frontend/index.html`: die einzige HTML-Datei. React hängt sich an `<div id="root">`. `viewport-fit=cover` und `100dvh` im CSS sorgen dafür, dass die App auf Handys mit Kamera-Aussparung und wandernder Adressleiste richtig sitzt.

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#1B63CC" />
    <link rel="icon" type="image/png" href="/favicon-32.png" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <title>Gopa</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Gopa",
        short_name: "Gopa",
        description: "Gopas Rezepte",
        lang: "de",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#E6F0FF",
        theme_color: "#1B63CC",
        // Web Share Target: "Teilen" in Instagram/TikTok -> Gopa auswählen -> /neu?url=...&text=...
        share_target: {
          action: "/neu",
          method: "GET",
          params: { title: "title", text: "text", url: "url" },
        },
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Rezepte und Einkaufsdaten offline lesbar: zuerst Netz, sonst Cache
            urlPattern: ({ url }) => url.pathname.startsWith("/api/recipes"),
            handler: "NetworkFirst",
            options: { cacheName: "gopa-api", networkTimeoutSeconds: 4 },
          },
        ],
      },
    }),
  ],
  server: { proxy: { "/api": process.env.GOPA_API ?? "http://localhost:8000" } },
});
```

Was steht hier?
- `react()`: React-Unterstützung.
- `VitePWA(...)`: macht aus der Seite eine installierbare Web-App mit Offline-Cache. Das ist für den **Browser-Betrieb** gedacht. In der Android-App wird der Service Worker bewusst nicht gestartet (siehe Kapitel 8, `main.tsx`).
- `share_target`: Wer die Web-App auf dem Handy installiert hat, sieht Gopa in der Teilen-Liste. Für die APK macht das später das Java-Plugin (Kapitel 9).
- `server.proxy`: Im Entwicklungsmodus leitet Vite alle Aufrufe an `/api` an dein Python-Backend (Port 8000) weiter. Für den Browser sieht es aus, als käme alles von **einer** Adresse. Dadurch gibt es beim Entwickeln **keine CORS-Probleme**.

## 5.3 Bilder, Schriften, Design

Kopiere die Design-Dateien in deinen Nachbau (die ZIP hast du ursprünglich als `gopa-design.zip` bekommen):

```powershell
cd C:\Temp\gopa-nachbau
mkdir docs
Copy-Item C:\Temp\gupa\docs\design docs\design -Recurse
Copy-Item docs\design\assets\favicon-32.png, docs\design\assets\icon-192.png, docs\design\assets\icon-512.png, docs\design\assets\icon-maskable-512.png frontend\public\
```

Schriften (Baloo 2 für Überschriften, Nunito für Text) kommen über die npm-Pakete `@fontsource/...` direkt in die App. So braucht die App **kein Internet** für Schriften, und es werden keine Daten an Google gesendet.

## 5.4 Der erste Bildschirm

`frontend/src/main.tsx` (Stufe 1; wächst mit jedem Kapitel):

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <h1>Hallo Gopa</h1>
  </StrictMode>,
);
```

## Test für dieses Kapitel

```powershell
cd C:\Temp\gopa-nachbau\frontend
npm run dev
```

Öffne <http://localhost:5173>. **Erwartet:** "Hallo Gopa". Ändere den Text, speichere: die Seite aktualisiert sich **sofort** (das ist Vite).

Beenden mit `Strg+C`, dann:

```powershell
npm run build
```

**Erwartet:** am Ende `✓ built in ...`, ein Ordner `dist`, und die Zeilen `PWA v...` / `precache`.

```powershell
cd ..
git add -A
git commit -m "feat: Frontend-Grundgerüst (React, Vite, TypeScript, PWA)"
```

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| `npm : ... nicht erkannt` | Node nicht im PATH | neues Terminal; sonst Kapitel 0 |
| `npm install` meldet `ERESOLVE unable to resolve dependency tree` | Versionskonflikt (andere Versionen als die Vorlage) | exakt die `package.json` oben verwenden; zur Not `npm install --legacy-peer-deps` |
| `EPERM` / `EBUSY` beim Installieren | Virenscanner oder offener Editor sperrt Dateien | `node_modules` löschen, Terminal als normaler Nutzer, Ordner aus dem Virenscanner ausnehmen, nicht in OneDrive-Ordner bauen |
| `npm ERR! code ETIMEDOUT` / `ECONNRESET` | Netz/Proxy | Verbindung wechseln, nochmal versuchen |
| `Port 5173 is in use` | alter Vite läuft noch | anderes Fenster beenden oder `npm run dev -- --port 5180 --strictPort` |
| Weiße Seite | JavaScript-Fehler | `F12` → Reiter *Konsole*: die erste rote Zeile lesen |
| `Cannot find module 'virtual:pwa-register'` (TypeScript) | `"types"` in `tsconfig.json` fehlt | Zeile `"types": ["vite/client", "vite-plugin-pwa/client"]` prüfen |
| `tsc`: `Cannot find name 'document'` | `lib: DOM` fehlt | `tsconfig.json` wie oben |
| Beim Build: Fehler in `vite.config.ts` | Tippfehler, fehlendes Komma | Datei mit der Musterlösung vergleichen |
| Dev-Server zeigt alte Seite | Service Worker hat gecacht | `F12` → *Application* → *Service Workers* → *Unregister*, dann Strg+F5 |
| `/api/...` im Browser liefert 500 oder `ECONNREFUSED` im Terminal | Backend läuft nicht | im Backend-Ordner `python -m uvicorn app.main:app --port 8000` starten |
