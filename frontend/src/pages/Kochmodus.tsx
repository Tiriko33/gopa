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
        <p className="cook-text" aria-live="polite">{schritt.text}</p>
        {schritt.timer_min ? (
          <button className="timer-pill" onClick={toggleTimer} aria-label={`${timerLabel}, ${formatTimer(restSek)}`}>
            <span className="timer-icon">
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B2412" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 3h6" /></svg>
            </span>
            <span className="timer-text"><b>{formatTimer(restSek)}</b><small>{timerLabel}</small></span>
          </button>
        ) : null}
      </div>

      <div className="cook-bear">
        <GopaBear size={92} outlinePuffs={false} />
        {schritt.tipp && <div className="cook-bubble">{schritt.tipp}</div>}
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
