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
                <li key={j}>
                  <span className="ing-name">{z.name}</span>
                  <span className="ing-amount">{formatAmount(scaleAmount(z.menge, r.portionen, portionen), z.einheit)}</span>
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
            <li key={s.nr}>
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
