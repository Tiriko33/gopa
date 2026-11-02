import type { Rezept } from "./types";

/** Gleiche Regeln wie im Backend: Kategorie, Suche in Titel, Zutaten und Tags (alle Wörter müssen passen). */
export function filterRecipes(list: Rezept[], kategorie: string, q: string): Rezept[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((r) => {
    if (kategorie !== "Alle" && r.kategorie !== kategorie) return false;
    const text = [r.titel, ...r.zutaten.map((z) => z.name), ...r.tags].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
