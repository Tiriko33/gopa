# Kapitel 8: Oberfläche, Teil 2: Rezeptansicht, Neues Rezept, Kochmodus, Bearbeiten

**Ziel:** Der komplette Weg im Browser: Link einfügen → Gopa kocht das Rezept → ansehen, Portionen ändern, auf die Einkaufsliste setzen, Schritt für Schritt kochen mit Timer, bearbeiten, löschen.

Alle Dateien in `frontend/src/pages/`.

## 8.1 Rezeptansicht

```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addRecipe, useShoppingList } from "../lib/shopping";
import { api } from "../lib/api";
import { formatAmount, formatTime, groupIngredients, scaleAmount, wasConverted } from "../lib/format";
import { KATEGORIEN, type Kategorie, type Rezept } from "../lib/types";
import { GopaBear } from "../components/GopaBear";
import { BearSays } from "../components/SpeechBubble";
import { BackIcon, ChevronDownIcon, LinkIcon } from "../components/icons";

export function Rezeptansicht() {
  const { id = "" } = useParams();
  const [r, setR] = useState<Rezept | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [portionen, setPortionen] = useState(2);
  const [versuch, setVersuch] = useState(0);
  const nav = useNavigate();
  const { update } = useShoppingList();

  useEffect(() => {
    let aktuell = true;
    setFehler(null);
    api.getRecipe(id).then(
      (x) => { if (aktuell) { setR(x); setPortionen(x.portionen); } },
      (e: Error) => aktuell && setFehler(e.message),
    );
    return () => { aktuell = false; };
  }, [id, versuch]);

  if (fehler) {
    return (
      <div className="page-pad">
        <BearSays role="alert" actions={
          <>
            <button className="btn btn-secondary" onClick={() => setVersuch((v) => v + 1)}>Nochmal versuchen</button>
            <Link to="/" className="btn btn-primary">Zur Sammlung</Link>
          </>
        }>{fehler}</BearSays>
      </div>
    );
  }
  if (!r) return <div className="page-pad" aria-busy="true"><p className="loading">Gopa schaut im Topf nach…</p></div>;

  const zeit = formatTime(r);
  const gruppen = groupIngredients(r.zutaten);

  async function aendereKategorie(k: Kategorie) {
    if (!r) return;
    try { setR(await api.setKategorie(r.id, k)); } catch (e) { setFehler((e as Error).message); }
  }

  return (
    <>
      <header className="hero">
        <div className="hero-top">
          <Link to="/" className="round-btn" aria-label="Zurück zur Rezeptsammlung"><BackIcon size={22} stroke="#0B2A4A" width={2.4} /></Link>
          <Link to={`/rezept/${r.id}/bearbeiten`} className="round-btn" aria-label="Rezept bearbeiten">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B2A4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /></svg>
          </Link>
        </div>
        <div className="hero-row">
          <div className="hero-main">
            <h1>{r.titel}</h1>
            <div className="hero-meta">
              <label className="cat-select">
                <span>{r.kategorie}</span>
                <ChevronDownIcon size={16} stroke="#12448F" width={2.6} />
                <select aria-label="Kategorie ändern" value={r.kategorie} onChange={(e) => aendereKategorie(e.target.value as Kategorie)}>
                  {KATEGORIEN.map((k) => <option key={k}>{k}</option>)}
                </select>
              </label>
              {zeit && <span className="hero-time">{zeit}</span>}
            </div>
          </div>
          <div style={{ marginBottom: -8 }}><GopaBear size={96} bandColor="#F6B74A" outlinePuffs={false} /></div>
        </div>
      </header>

      <section className="source-card">
        <div className="source-icon"><LinkIcon size={22} stroke="#3B2412" width={2.4} /></div>
        <div className="source-text">
          <span>Quelle · {r.quelle.plattform}{r.quelle.creator && ` · @${r.quelle.creator.replace(/^@/, "")}`}</span>
          <a href={r.quelle.url} target="_blank" rel="noopener noreferrer">Original-Video öffnen</a>
        </div>
      </section>

      <main className="recipe-body">
        {r.beschreibung && <p className="desc">{r.beschreibung}</p>}

        <div className="section-head">
          <h2>Zutaten</h2>
          <div className="stepper">
            <button className="step-minus" aria-label="Eine Portion weniger" disabled={portionen <= 1}
              onClick={() => setPortionen((p) => Math.max(1, p - 1))}>−</button>
            <span aria-live="polite">{portionen} {portionen === 1 ? "Portion" : "Portionen"}</span>
            <button className="step-plus" aria-label="Eine Portion mehr" onClick={() => setPortionen((p) => p + 1)}>+</button>
          </div>
        </div>

        {gruppen.map((g, i) => (
          <div key={i}>
            {g.gruppe && <h3 className="group-title">{g.gruppe}</h3>}
            <ul className="ingredients">
              {g.items.map((z, j) => (
                <li key={j} style={{ "--i": j } as React.CSSProperties}>
                  <span className="ing-name">{z.name}</span>
                  <span key={portionen} className="ing-amount bump">{formatAmount(scaleAmount(z.menge, r.portionen, portionen), z.einheit)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {wasConverted(r.zutaten) && (
          <p className="note">Gopa hat Cups und Unzen für dich in Gramm und Milliliter umgerechnet.</p>
        )}

        <h2 className="steps-title">Zubereitung</h2>
        <ol className="steps">
          {r.schritte.map((s) => (
            <li key={s.nr} style={{ "--i": s.nr } as React.CSSProperties}>
              <span className="step-nr" aria-hidden="true">{s.nr}</span>
              <span>{s.text}{s.timer_min ? <em className="step-timer"> · {s.timer_min} Min</em> : null}</span>
            </li>
          ))}
        </ol>

        {r.hinweise.length > 0 && (
          <div className="hinweise">
            <h3>Hinweise von Gopa</h3>
            <ul>{r.hinweise.map((h, i) => <li key={i}>{h}</li>)}</ul>
          </div>
        )}
      </main>

      <div className="action-bar">
        <button className="btn btn-secondary" onClick={() => { update((l) => addRecipe(l, r, portionen)); nav("/einkauf"); }}>Zur Einkaufsliste</button>
        <Link to={`/rezept/${r.id}/kochen`} className="btn btn-primary">Los geht's!</Link>
      </div>
    </>
  );
}
```

Was du daran lernst:
- `useParams()` liest die `id` aus der Adresse `/rezept/:id`.
- **Portionsrechner:** Der Zustand `portionen` startet mit den Portionen des Rezepts. Angezeigt wird `scaleAmount(z.menge, r.portionen, portionen)`. Das **Rezept selbst bleibt unverändert**, nur die Anzeige rechnet. `key={portionen}` an der Mengen-Anzeige lässt React das Element neu erzeugen, und die kleine "Bump"-Animation läuft bei jeder Änderung.
- `aria-live="polite"` an der Portionszahl: Screenreader sagen die neue Zahl an.
- **Der Hinweis** "Gopa hat Cups und Unzen umgerechnet" erscheint nur, wenn mindestens eine Zutat ein `original` hat (`wasConverted`). Darum ist es wichtig, dass das Backend `original` sonst leer lässt (Kapitel 4, `postprocess`).
- Der Link zum Video öffnet mit `rel="noopener noreferrer"` in einem neuen Tab (Sicherheitsstandard für externe Links).
- Die Kategorie lässt sich per unsichtbarem `<select>` ändern, das über der schönen Schaltfläche liegt (bedienbar mit Tastatur, aber im Design-Look).

## 8.2 Neues Rezept

```tsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type Job } from "../lib/api";
import { FILTER_CHIPS, type Kategorie } from "../lib/types";
import { GopaBear } from "../components/GopaBear";
import { BearSays } from "../components/SpeechBubble";
import { CookingLoader } from "../components/CookingLoader";
import { BackIcon, Paw } from "../components/icons";

const STEPS: Job["step"][] = ["download", "transcribe", "translate"];
const LABELS = ["Video und Beschreibung geladen", "Gesprochenen Text erkennen", "Auf Deutsch übersetzen und umrechnen"];

function Check() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
  );
}

/** Teilen-Texte enthalten oft Text + Link: den ersten Link herausziehen. */
export function extractLink(text: string): string {
  return text.match(/https?:\/\/\S+/)?.[0] ?? text.trim();
}

export function NeuesRezept() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  // Share Target liefert url/text/title als Query-Parameter
  const geteilt = extractLink(`${params.get("url") ?? ""} ${params.get("text") ?? ""}`.trim());
  const [link, setLink] = useState(geteilt.startsWith("http") ? geteilt : "");
  const [kategorie, setKategorie] = useState<Kategorie | null>(null);
  const [fallback, setFallback] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [starting, setStarting] = useState(false);
  const [fehler, setFehler] = useState<{ message: string; fallback: boolean } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; // StrictMode mountet zweimal: Flag beim Mounten wieder setzen
    return () => { alive.current = false; };
  }, []);

  async function einfuegen() {
    try { setLink(extractLink(await navigator.clipboard.readText())); }
    catch { setFehler({ message: "Gopa darf die Zwischenablage nicht lesen. Halte im Feld gedrückt und wähle Einfügen.", fallback: false }); }
  }

  async function erstellen() {
    setFehler(null);
    setStarting(true);
    try {
      const { id } = await api.startJob(link.trim(), text, files);
      let j: Job;
      do {
        await new Promise((r) => setTimeout(r, 1500));
        if (!alive.current) return;
        j = await api.getJob(id);
        setJob(j);
      } while (j.status === "running");
      if (j.status === "error" || !j.result) {
        setFehler({ message: j.error?.message ?? "Das hat nicht geklappt.", fallback: j.error?.fallback ?? true });
        if (j.error?.fallback) setFallback(true);
        setJob(null);
        return;
      }
      const gespeichert = await api.saveRecipe({ ...j.result, kategorie: kategorie ?? j.result.kategorie });
      nav(`/rezept/${gespeichert.id}`, { replace: true });
    } catch (e) {
      setFehler({ message: (e as Error).message, fallback: false });
      setJob(null);
    } finally {
      if (alive.current) setStarting(false);
    }
  }

  const stepIdx = job ? STEPS.indexOf(job.step) : -1;
  const percent = job ? Math.round(((stepIdx + 0.5) / STEPS.length) * 100) : 0;
  const kannStarten = !starting && link.trim().length > 0;

  return (
    <>
      <Paw style={{ position: "absolute", right: 20, top: 120, transform: "rotate(18deg)" }} />
      <div className="neu-head">
        <Link to="/" className="round-btn bordered" aria-label="Zurück zur Rezeptsammlung"><BackIcon size={22} stroke="#0B2A4A" width={2.4} /></Link>
        <h1>Neues Rezept</h1>
      </div>

      <div className="neu-bear">
        <GopaBear size={84} label="Gopa wartet auf einen Link" />
        <div className="bubble-left">Zeig mir das Video, ich schreibe das Rezept auf Deutsch auf!</div>
      </div>

      <form className="neu-form" onSubmit={(e) => { e.preventDefault(); if (kannStarten) void erstellen(); }}>
        <label htmlFor="link" className="field-label">Link aus Instagram oder TikTok</label>
        <div className="link-row">
          <input id="link" type="url" inputMode="url" placeholder="Link hier einfügen" value={link}
            onChange={(e) => setLink(e.target.value)} disabled={starting} />
          <button type="button" className="paste-btn" onClick={einfuegen} disabled={starting}>Einfügen</button>
        </div>
        <p className="tip">Tipp: Im Video auf Teilen tippen und Gopa auswählen, dann geht es ganz ohne Kopieren.</p>

        <span className="field-label" id="kat-label">Kategorie</span>
        <div className="chips tight" role="group" aria-labelledby="kat-label">
          {FILTER_CHIPS.filter((k) => k !== "Alle").map((k) => (
            <button type="button" key={k} aria-pressed={kategorie === k} disabled={starting}
              className={kategorie === k ? "chip active" : "chip"}
              onClick={() => setKategorie(kategorie === k ? null : (k as Kategorie))}>{k}</button>
          ))}
        </div>
        <p className="tip">{kategorie ? "" : "Ohne Auswahl schlägt Gopa die Kategorie selbst vor."}</p>

        {fallback && (
          <div className="fallback">
            <label htmlFor="rtext" className="field-label">Rezepttext (z. B. aus der Beschreibung)</label>
            <textarea id="rtext" rows={5} value={text} onChange={(e) => setText(e.target.value)} disabled={starting} />
            <label htmlFor="rfiles" className="field-label">Screenshots oder Video hochladen</label>
            <input id="rfiles" type="file" accept="image/*,video/*" multiple disabled={starting}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            {files.length > 0 && <p className="tip">{files.length} Datei(en) ausgewählt</p>}
          </div>
        )}

        {fehler && (
          <BearSays role="alert" size={84}>{fehler.message}</BearSays>
        )}

        {starting && (
          <div className="progress-card" role="status" aria-live="polite">
            <CookingLoader />
            <span className="progress-title">Gopa kocht das Rezept…</span>
            {LABELS.map((label, i) => {
              const done = i < stepIdx, active = i === Math.max(stepIdx, 0);
              return (
                <div className="progress-step" key={label}>
                  <div className={done ? "dot done" : active ? "dot active" : "dot"}>{done && <Check />}</div>
                  <span className={active ? "step-active" : done ? "step-done" : "step-todo"}>{label}</span>
                </div>
              );
            })}
            <div className="bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${percent || 8}%` }} />
            </div>
          </div>
        )}

        <div className="neu-actions">
          <button type="submit" className="btn btn-primary big" disabled={!kannStarten}>Rezept erstellen</button>
          {!fallback && (
            <button type="button" className="btn-text" onClick={() => setFallback(true)} disabled={starting}>
              Klappt nicht? Text oder Screenshot hinzufügen
            </button>
          )}
        </div>
      </form>
    </>
  );
}
```

Wichtig zu verstehen:
- `extractLink` fischt aus einem Share-Text den ersten Link heraus. TikTok teilt Texte wie "Schau dir das an https://vm.tiktok.com/...".
- `useSearchParams` liest `?url=...&text=...`. So landet ein geteilter Link direkt im Feld (Web-Share-Target und Android-Plugin).
- **Der Ablauf in `erstellen`:** Job starten → alle 1,5 s `getJob` fragen → bei `running` weiter, bei `error` Fehlermeldung zeigen (und bei `fallback: true` automatisch das Feld für Text/Screenshots öffnen), bei `done` das Rezept speichern und zur Rezeptansicht wechseln.
- **Fortschritt:** Die drei Punkte und der Balken ergeben sich aus `job.step`. Die Animation ist `CookingLoader`.
- `alive` (ein `useRef`): Verlässt der Nutzer die Seite während des Wartens, bricht die Schleife ab, statt auf einer toten Seite weiterzulaufen. Beachte den Kommentar: React im Entwicklungsmodus (`StrictMode`) hängt Komponenten zweimal ein, deshalb muss das Flag beim Einhängen **wieder auf `true`** gesetzt werden. Das war ein echter Fehler im Bau (die Seite blieb sonst "stehen").
- Die Zwischenablage (`navigator.clipboard.readText`) braucht Erlaubnis. Wird sie verweigert, erklärt Gopa in der Sprechblase, wie es auch geht (Feld lange drücken → Einfügen).

## 8.3 Kochmodus

```tsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Rezept } from "../lib/types";
import { alarm, formatTimer } from "../lib/timer";
import { useWakeLock } from "../lib/useWakeLock";
import { GopaBear } from "../components/GopaBear";
import { BearSays } from "../components/SpeechBubble";
import { Paw } from "../components/icons";

/** Timerzustand pro Schritt: läuft (Endzeit), pausiert (Restsekunden) oder abgelaufen. */
interface TimerState { endAt?: number; rest: number; done?: boolean }

export function Kochmodus() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [r, setR] = useState<Rezept | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [timers, setTimers] = useState<Record<number, TimerState>>({});
  const [now, setNow] = useState(Date.now());
  const alarmed = useRef(new Set<number>());

  useWakeLock(r !== null);

  useEffect(() => {
    api.getRecipe(id).then(setR, (e: Error) => setFehler(e.message));
  }, [id]);

  const laeuft = Object.values(timers).some((t) => t.endAt);
  useEffect(() => {
    if (!laeuft) return;
    const h = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(h);
  }, [laeuft]);

  // Timer abgelaufen?
  useEffect(() => {
    for (const [k, t] of Object.entries(timers)) {
      const idx = Number(k);
      if (t.endAt && now >= t.endAt && !alarmed.current.has(idx)) {
        alarmed.current.add(idx);
        alarm();
        setTimers((x) => ({ ...x, [idx]: { rest: 0, done: true } }));
      }
    }
  }, [now, timers]);

  if (fehler) {
    return <div className="cook cook-pad"><BearSays role="alert" actions={<Link to="/" className="btn btn-primary">Zur Sammlung</Link>}>{fehler}</BearSays></div>;
  }
  if (!r) return <div className="cook cook-pad" aria-busy="true"><p>Gopa heizt den Herd vor…</p></div>;

  const schritt = r.schritte[i];
  const total = r.schritte.length;
  const letzter = i === total - 1;
  const t = timers[i];
  const gesamt = (schritt.timer_min ?? 0) * 60;
  const restSek = t?.endAt ? (t.endAt - now) / 1000 : t ? t.rest : gesamt;

  function toggleTimer() {
    setTimers((x) => {
      const cur = x[i];
      if (cur?.endAt) return { ...x, [i]: { rest: Math.max(0, (cur.endAt - Date.now()) / 1000) } }; // pausieren
      alarmed.current.delete(i);
      const start = cur && !cur.done ? cur.rest : gesamt;
      return { ...x, [i]: { rest: start, endAt: Date.now() + start * 1000 } };
    });
    setNow(Date.now());
  }

  const timerLabel = t?.done ? "Fertig! Nochmal starten" : t?.endAt ? "Pausieren" : t ? "Weiter laufen lassen" : "Timer starten";

  return (
    <div className="cook">
      <Paw fill="#1B4585" style={{ position: "absolute", right: 50, top: 150, transform: "rotate(16deg)" }} />
      <Paw fill="#1B4585" style={{ position: "absolute", left: 24, top: 330, transform: "rotate(-16deg)" }} />

      <div className="cook-top">
        <Link to={`/rezept/${r.id}`} className="cook-round" aria-label="Kochmodus beenden">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </Link>
        <span className="cook-title">{r.titel}</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="cook-progress">
        <span>Schritt {i + 1} von {total}</span>
        <div className="segments" aria-hidden="true">
          {r.schritte.map((_, k) => <div key={k} className={k <= i ? "seg on" : "seg"} />)}
        </div>
      </div>

      <div className="cook-main">
        <p key={i} className="cook-text step-in" aria-live="polite">{schritt.text}</p>
        {schritt.timer_min ? (
          <button className={t?.done ? "timer-pill done" : t?.endAt ? "timer-pill running" : "timer-pill"} onClick={toggleTimer} aria-label={`${timerLabel}, ${formatTimer(restSek)}`}>
            <span className="timer-icon">
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B2412" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 3h6" /></svg>
            </span>
            <span className="timer-text"><b>{formatTimer(restSek)}</b><small>{timerLabel}</small></span>
          </button>
        ) : null}
      </div>

      <div className="cook-bear">
        <GopaBear size={92} outlinePuffs={false} />
        {schritt.tipp && <div key={i} className="cook-bubble">{schritt.tipp}</div>}
      </div>

      <div className="cook-nav">
        <button className="cook-back" aria-label="Voriger Schritt" disabled={i === 0} onClick={() => setI(i - 1)}>
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button className="cook-next" onClick={() => (letzter ? nav(`/rezept/${r.id}`) : setI(i + 1))}>
          <span>{letzter ? "Fertig!" : "Weiter"}</span>
          {!letzter && <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B2412" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>}
        </button>
      </div>
    </div>
  );
}
```

Die interessanteste Datei. Das Prinzip:
- Ein Schritt pro Bildschirm, große Schrift, "Weiter" und "Zurück".
- `useWakeLock(r !== null)`: Das Display bleibt an, solange das Rezept geladen ist.
- **Timer ohne Drift:** Statt jede Sekunde "minus eins" zu rechnen (das läuft bei Hintergrund-Tabs und Lastspitzen falsch), speichert der Timer die **Endzeit** (`endAt = Date.now() + Sekunden × 1000`). Die Restzeit ist immer `endAt − jetzt`. Ein Intervall alle 250 ms aktualisiert nur die Anzeige (`now`).
- Pro Schritt ein eigener Timer (`timers[i]`): läuft (`endAt`), pausiert (`rest`) oder abgelaufen (`done`). Beim Pausieren wird die Restzeit gemerkt.
- `alarmed` verhindert, dass der Alarm mehrfach ausgelöst wird.
- Ablauf-Signal: `alarm()` (Ton + Vibration) und der Knopf wackelt (`timer-pill done`).
- `key={i}` am Text: Wechselt der Schritt, wird das Element neu erzeugt, und die Gleit-Animation (`step-in`) läuft.

## 8.4 Bearbeiten

```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { KATEGORIEN, type Kategorie, type Rezept } from "../lib/types";
import { BearSays } from "../components/SpeechBubble";
import { BackIcon } from "../components/icons";

const num = (v: string): number | null => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function Bearbeiten() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [r, setR] = useState<Rezept | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.getRecipe(id).then(setR, (e: Error) => setFehler(e.message)); }, [id]);

  if (fehler && !r) return <div className="page-pad"><BearSays role="alert" actions={<Link to="/" className="btn btn-primary">Zur Sammlung</Link>}>{fehler}</BearSays></div>;
  if (!r) return <div className="page-pad" aria-busy="true"><p className="loading">Gopa sucht das Rezept…</p></div>;

  const set = (patch: Partial<Rezept>) => setR({ ...r, ...patch });

  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    if (!r) return;
    setSaving(true);
    setFehler(null);
    const { id: _i, erstellt_am: _e, favorit: _f, ...rest } = r;
    try {
      await api.updateRecipe(r.id, {
        ...rest,
        zutaten: r.zutaten.filter((z) => z.name.trim()),
        schritte: r.schritte.filter((s) => s.text.trim()).map((s, k) => ({ ...s, nr: k + 1 })),
      });
      nav(`/rezept/${r.id}`, { replace: true });
    } catch (err) { setFehler((err as Error).message); setSaving(false); }
  }

  async function loeschen() {
    if (!r || !window.confirm(`„${r.titel}“ wirklich löschen?`)) return;
    try { await api.deleteRecipe(r.id); nav("/", { replace: true }); } catch (err) { setFehler((err as Error).message); }
  }

  return (
    <form className="edit" onSubmit={speichern}>
      <div className="neu-head">
        <Link to={`/rezept/${r.id}`} className="round-btn bordered" aria-label="Abbrechen und zurück"><BackIcon size={22} stroke="#0B2A4A" width={2.4} /></Link>
        <h1>Rezept bearbeiten</h1>
      </div>

      <label className="field-label" htmlFor="titel">Titel</label>
      <input id="titel" className="text-in" required value={r.titel} onChange={(e) => set({ titel: e.target.value })} />

      <label className="field-label" htmlFor="besch">Beschreibung</label>
      <textarea id="besch" className="text-in area" rows={2} value={r.beschreibung} onChange={(e) => set({ beschreibung: e.target.value })} />

      <div className="grid2">
        <div><label className="field-label" htmlFor="kat">Kategorie</label>
          <select id="kat" className="text-in" value={r.kategorie} onChange={(e) => set({ kategorie: e.target.value as Kategorie })}>
            {KATEGORIEN.map((k) => <option key={k}>{k}</option>)}
          </select></div>
        <div><label className="field-label" htmlFor="port">Portionen</label>
          <input id="port" className="text-in" type="number" min={1} value={r.portionen} onChange={(e) => set({ portionen: Math.max(1, parseInt(e.target.value) || 1) })} /></div>
        <div><label className="field-label" htmlFor="zv">Vorbereiten (Min)</label>
          <input id="zv" className="text-in" type="number" min={0} value={r.zeit_vorbereitung_min ?? ""} onChange={(e) => set({ zeit_vorbereitung_min: num(e.target.value) })} /></div>
        <div><label className="field-label" htmlFor="zk">Kochen (Min)</label>
          <input id="zk" className="text-in" type="number" min={0} value={r.zeit_kochen_min ?? ""} onChange={(e) => set({ zeit_kochen_min: num(e.target.value) })} /></div>
      </div>

      <h2 className="edit-h">Zutaten</h2>
      {r.zutaten.map((z, k) => (
        <div className="ing-edit" key={k}>
          <input aria-label={`Menge ${k + 1}`} className="text-in sm" inputMode="decimal" placeholder="Menge" value={z.menge ?? ""}
            onChange={(e) => set({ zutaten: r.zutaten.map((x, j) => j === k ? { ...x, menge: num(e.target.value) } : x) })} />
          <input aria-label={`Einheit ${k + 1}`} className="text-in sm" placeholder="Einheit" value={z.einheit ?? ""}
            onChange={(e) => set({ zutaten: r.zutaten.map((x, j) => j === k ? { ...x, einheit: e.target.value || null } : x) })} />
          <input aria-label={`Zutat ${k + 1}`} className="text-in grow" placeholder="Zutat" value={z.name}
            onChange={(e) => set({ zutaten: r.zutaten.map((x, j) => j === k ? { ...x, name: e.target.value } : x) })} />
          <button type="button" className="icon-del" aria-label={`Zutat ${k + 1} entfernen`}
            onClick={() => set({ zutaten: r.zutaten.filter((_, j) => j !== k) })}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" onClick={() => set({ zutaten: [...r.zutaten, { gruppe: null, name: "", menge: null, einheit: null, original: null }] })}>Zutat hinzufügen</button>

      <h2 className="edit-h">Schritte</h2>
      {r.schritte.map((s, k) => (
        <div className="step-edit" key={k}>
          <label className="field-label" htmlFor={`s${k}`}>Schritt {k + 1}</label>
          <textarea id={`s${k}`} className="text-in area" rows={2} value={s.text}
            onChange={(e) => set({ schritte: r.schritte.map((x, j) => j === k ? { ...x, text: e.target.value } : x) })} />
          <div className="grid2">
            <input aria-label={`Timer Minuten Schritt ${k + 1}`} className="text-in" type="number" min={0} placeholder="Timer (Min)" value={s.timer_min ?? ""}
              onChange={(e) => set({ schritte: r.schritte.map((x, j) => j === k ? { ...x, timer_min: num(e.target.value) } : x) })} />
            <input aria-label={`Tipp Schritt ${k + 1}`} className="text-in" placeholder="Tipp (optional)" value={s.tipp ?? ""}
              onChange={(e) => set({ schritte: r.schritte.map((x, j) => j === k ? { ...x, tipp: e.target.value || null } : x) })} />
          </div>
          <button type="button" className="btn-text left" onClick={() => set({ schritte: r.schritte.filter((_, j) => j !== k) })}>Schritt {k + 1} entfernen</button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" onClick={() => set({ schritte: [...r.schritte, { nr: r.schritte.length + 1, text: "", timer_min: null, tipp: null }] })}>Schritt hinzufügen</button>

      <label className="field-label" htmlFor="tags">Tags (mit Komma getrennt)</label>
      <input id="tags" className="text-in" value={r.tags.join(", ")} onChange={(e) => set({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />

      {fehler && <BearSays role="alert" size={72}>{fehler}</BearSays>}

      <div className="edit-actions">
        <button type="submit" className="btn btn-primary big" disabled={saving}>Speichern</button>
        <button type="button" className="btn-text danger" onClick={loeschen}>Rezept löschen</button>
      </div>
    </form>
  );
}
```

- Alles Bearbeitbare steckt in **einem** `Rezept`-Zustand. `set({ titel: ... })` ändert immer nur ein Feld und lässt den Rest unberührt (`{ ...r, ...patch }`).
- Listen (Zutaten, Schritte) werden **nie verändert**, sondern immer durch eine **neue Liste** ersetzt (`map`, `filter`, `[...r.zutaten, neu]`). React erkennt Änderungen nur so zuverlässig.
- Beim Speichern fliegen leere Zutaten/Schritte raus, und die Schritte werden neu durchnummeriert.
- `window.confirm` vor dem Löschen: ein Löschen soll nie aus Versehen passieren.
- `{ id: _i, erstellt_am: _e, favorit: _f, ...rest } = r`: Diese drei Felder gehören dem Server und werden **nicht** mitgeschickt.

## 8.5 `main.tsx` (endgültig)

Ersetze `frontend/src/main.tsx` durch die Endfassung:

```tsx
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
```

Neu gegenüber Stufe 2:
- `registerSW(...)` nur **im Browser**, nicht in der Android-App. Im Browser sorgt der Service Worker für Installierbarkeit und Offline-Betrieb, in der App ist er nicht nötig und könnte stören.
- `ShareListener`: Fragt beim Start und bei jedem Ereignis `gopashare`, ob per "Teilen" ein Text angekommen ist (Java-Plugin aus Kapitel 9) und öffnet dann `/neu?text=...`.
- Der Kochmodus liegt **ohne** `Shell`, damit er den ganzen Bildschirm bekommt.

## Test für dieses Kapitel

Beide Server laufen (wie in Kapitel 7). Zusätzlich muss **Ollama laufen** und die Umgebung für das Backend gesetzt sein:

```powershell
$env:APP_PASSWORD = "geheim"
$env:LLM_PROVIDER = "ollama"
$env:OLLAMA_MODEL = "gemma4:12b"
$env:ENABLE_OCR = "false"
python -m uvicorn app.main:app --reload --port 8000
```

**Prüfliste im Browser (390 px breit):**

1. **Plus-Knopf** → "Neues Rezept". Füge `https://www.tiktok.com/@su_ice_/video/7455733863982107926` ein → *Rezept erstellen*. Du siehst die Ladeanimation (Bär rührt im Topf), die drei Schritte füllen sich. Nach etwa 1 bis 3 Minuten springt die App zur Rezeptansicht.
2. **Rezeptansicht:** Titel, Kategorie, Zutaten, Schritte, Quelle ("Original-Video öffnen"). Tippe **+** bei den Portionen: die Mengen wachsen mit Komma-Schreibweise. Dein Rezept bleibt in der Liste mit der **originalen** Portionszahl.
3. **Zur Einkaufsliste** → die Seite wechselt zu *Einkauf*, Zutaten sind aufgelistet. Wiederhole mit einem **zweiten** Rezept, das dieselbe Zutat hat (z. B. Mehl): sie wird zusammengelegt, die Gruppe heißt "Aus mehreren Rezepten". Haken setzen → durchgestrichen. "Erledigte löschen" entfernt sie.
4. **Los geht's!** → Kochmodus: ein Schritt pro Bildschirm, Fortschrittsbalken oben, **Timer** bei Schritten mit Zeitangabe (starten, pausieren, ablaufen lassen: Ton und Wackeln). Der Bär sagt Tipps.
5. **Bearbeiten** (Stift): Titel ändern, Zutat hinzufügen, Schritt entfernen, speichern: Änderung sichtbar. Dann **Rezept löschen** → Rückfrage → weg.
6. **Fehlerfälle:** Gib `hallo` als Link ein → der **Browser selbst** hält das Formular an und zeigt "Geben Sie eine URL ein" (das Feld hat `type="url"`). Gib `https://youtube.com/watch?v=1` ein → Gopas Sprechblase "Gopa kann nur Links von TikTok und Instagram lesen.". Gib `https://www.tiktok.com/@x/video/1` (gibt es nicht) ein → eine verständliche Meldung und das Feld für Text/Screenshots öffnet sich.
7. **Fallback-Weg:** Klicke "Klappt nicht? Text oder Screenshot hinzufügen", füge einen Rezepttext ein und erstelle: Das Rezept entsteht aus **deinem** Text.
8. `npm test`, `npx tsc --noEmit` und zum Schluss `npm run build` laufen ohne Fehler.

```powershell
cd ..
git add -A
git commit -m "feat: Rezeptansicht, Neues Rezept, Kochmodus, Bearbeiten"
```

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| Nach dem Absenden bleibt der Fortschritt bei 8 % stehen | `alive`-Flag bleibt `false` (StrictMode) | in `useEffect` am Anfang `alive.current = true` setzen |
| "Gopa erreicht das lokale Sprachmodell nicht" | Ollama aus oder Modellname falsch | Kapitel 4, Fehlertabelle |
| "Das hat nicht geklappt." direkt nach dem Absenden | Backend-Fehler (Terminal des Servers lesen) | der Traceback im Server-Terminal nennt die Ursache |
| Rezept-Ansicht zeigt `NaN` bei Mengen | Menge als Text statt Zahl | `scaleAmount` bekommt `number \| null`; im Backend `menge: float` |
| Portionen stehen auf 2, obwohl 4 im Rezept | `setPortionen(x.portionen)` fehlt nach dem Laden | wie in `Rezeptansicht.tsx` |
| Doppelte Zutat in der Einkaufsliste | `itemKey` vergleicht nicht klein/getrimmt | `toLowerCase().trim()` wie in `shopping.ts` |
| Kochmodus: Timer springt oder geht nach | Sekunden-Zähler statt Endzeit | Endzeit speichern (`endAt`) |
| Kein Ton beim Timer | Browser blockt Audio ohne Berührung | einmal auf die Seite tippen; im Handy auch Lautstärke prüfen |
| Display geht im Kochmodus aus | Wake Lock nicht verfügbar (kein HTTPS) | im Browser auf `localhost` testen; in der APK geht es dank `androidScheme: "http"` |
| Links im Kochmodus/Teilen öffnen nichts | `rel`-/Adressfehler | `href={r.quelle.url}` prüfen |
| Seite `/rezept/abc` zeigt Gopa mit Fehler | Rezept nicht gefunden (404) | erwartet: zeigt "Rezept nicht gefunden" mit Weg zur Sammlung |
| Beim Reload auf `/rezept/...` im Dev-Server leere Seite | Service Worker alt | *Application* → *Unregister* |
