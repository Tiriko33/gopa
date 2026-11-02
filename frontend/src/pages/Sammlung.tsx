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
        {!fehler && rezepte?.map((r) => <Karte key={r.id} r={r} />)}
      </main>
    </>
  );
}

function Karte({ r }: { r: Rezept }) {
  const zeit = formatTime(r);
  return (
    <Link to={`/rezept/${r.id}`} className="card recipe-card">
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
