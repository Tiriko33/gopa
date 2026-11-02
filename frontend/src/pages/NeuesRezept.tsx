import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type Job } from "../lib/api";
import { FILTER_CHIPS, type Kategorie } from "../lib/types";
import { GopaBear } from "../components/GopaBear";
import { BearSays } from "../components/SpeechBubble";
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
