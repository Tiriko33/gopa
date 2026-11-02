import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatTime } from "../lib/format";
import { FILTER_CHIPS, type Rezept } from "../lib/types";
import { BearSays } from "../components/SpeechBubble";
import { GopaBear } from "../components/GopaBear";
import { LinkIcon, SearchIcon, Paw } from "../components/icons";

export function Sammlung() {
  const [kategorie, setKategorie] = useState<string>("Alle");
  const [suche, setSuche] = useState("");
  const [q, setQ] = useState("");
  const [rezepte, setRezepte] = useState<Rezept[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [versuch, setVersuch] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setQ(suche), 250);
    return () => clearTimeout(t);
  }, [suche]);

  useEffect(() => {
    let aktuell = true;
    setFehler(null);
    api.listRecipes(kategorie, q).then(
      (r) => aktuell && setRezepte(r),
      (e: Error) => aktuell && setFehler(e.message),
    );
    return () => { aktuell = false; };
  }, [kategorie, q, versuch]);

  const leer = rezepte?.length === 0 && kategorie === "Alle" && !q.trim();
  const count = rezepte?.length ?? 0;

  return (
    <>
      <header className="page-head">
        <GopaBear size={72} />
        <div className="head-text">
          <h1>Gopas Rezepte</h1>
          <span className="sub">
            Was kochen wir heute?{rezepte && ` · ${count} ${count === 1 ? "Rezept" : "Rezepte"}`}
          </span>
        </div>
        <Link to="/einstellungen" className="round-btn bordered" aria-label="Einstellungen">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B2A4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>
        </Link>
      </header>

      <div className="search-wrap">
        <label className="search">
          <SearchIcon size={20} stroke="#3F5A7D" />
          <input type="search" aria-label="Rezepte durchsuchen" placeholder="Rezept oder Zutat suchen"
            value={suche} onChange={(e) => setSuche(e.target.value)} />
        </label>
      </div>

      <div className="chips" role="group" aria-label="Kategorie filtern">
        {FILTER_CHIPS.map((k) => (
          <button key={k} className={k === kategorie ? "chip active" : "chip"} aria-pressed={k === kategorie}
            onClick={() => setKategorie(k)}>{k}</button>
        ))}
      </div>

      <main className="list">
        {fehler && (
          <BearSays role="alert" actions={<button className="btn btn-secondary" onClick={() => setVersuch((v) => v + 1)}>Nochmal versuchen</button>}>
            {fehler}
          </BearSays>
        )}
        {!fehler && leer && (
          <BearSays role="status">Noch nichts im Topf. Teile dein erstes Rezept-Video mit mir!</BearSays>
        )}
        {!fehler && rezepte && !leer && rezepte.length === 0 && (
          <BearSays role="status">Dazu finde ich nichts. Probier ein anderes Wort oder eine andere Kategorie.</BearSays>
        )}
        {!fehler && !rezepte && [0, 1, 2].map((i) => <div key={i} className="skeleton" aria-hidden="true" />)}
        {!fehler && rezepte?.map((r, i) => <Karte key={r.id} r={r} i={i} />)}
      </main>
    </>
  );
}

function Karte({ r, i }: { r: Rezept; i: number }) {
  const zeit = formatTime(r);
  return (
    <Link to={`/rezept/${r.id}`} className="card recipe-card" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
      <div className="thumb"><Paw size={40} fill="#B97A4B" /></div>
      <div className="card-text">
        <span className="card-title">{r.titel}</span>
        <span className="card-meta">
          <span className="badge">{r.kategorie}</span>
          {zeit && <span>{zeit}</span>}
        </span>
        <span className="card-source"><LinkIcon size={14} stroke="#1B63CC" width={2.4} /><span>{r.quelle.plattform}</span></span>
      </div>
    </Link>
  );
}
