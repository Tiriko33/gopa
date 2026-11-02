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
