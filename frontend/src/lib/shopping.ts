import { useCallback, useEffect, useState } from "react";
import { scaleAmount } from "./format";
import type { Rezept } from "./types";

/** Ein Beitrag eines Rezepts zu einem Listeneintrag. Pro Rezept nur einer: erneutes Hinzufügen ersetzt ihn. */
export interface Beitrag { rezeptId: string; titel: string; menge: number | null }

export interface Eintrag {
  key: string;            // normalisierter Name + Einheit
  name: string;
  einheit: string | null;
  beitraege: Beitrag[];
  erledigt: boolean;
}

export const GEMISCHT = "Aus mehreren Rezepten";

export const itemKey = (name: string, einheit: string | null) =>
  `${name.trim().toLowerCase()}|${(einheit ?? "").trim().toLowerCase()}`;

/** Gesamtmenge: Summe aller bekannten Mengen; null, wenn keine Menge bekannt ist. */
export function totalAmount(e: Eintrag): number | null {
  const bekannt = e.beitraege.filter((b) => b.menge !== null);
  return bekannt.length ? bekannt.reduce((s, b) => s + (b.menge as number), 0) : null;
}

/** Zutaten eines Rezepts hinzufügen. Gleiche Zutat (Name + Einheit) wird zusammengefasst, Mengen werden addiert. */
export function addRecipe(list: Eintrag[], r: Pick<Rezept, "id" | "titel" | "portionen" | "zutaten">, portionen: number): Eintrag[] {
  const next = list.map((e) => ({ ...e, beitraege: e.beitraege.filter((b) => b.rezeptId !== r.id) }));
  for (const z of r.zutaten) {
    const key = itemKey(z.name, z.einheit);
    const beitrag: Beitrag = { rezeptId: r.id, titel: r.titel, menge: scaleAmount(z.menge, r.portionen, portionen) };
    const vorhanden = next.find((e) => e.key === key);
    if (vorhanden) {
      vorhanden.beitraege.push(beitrag);
      vorhanden.erledigt = false; // neue Menge dazugekommen: wieder offen
    } else {
      next.push({ key, name: z.name.trim(), einheit: z.einheit, beitraege: [beitrag], erledigt: false });
    }
  }
  return next.filter((e) => e.beitraege.length > 0);
}

export const toggle = (list: Eintrag[], key: string): Eintrag[] =>
  list.map((e) => (e.key === key ? { ...e, erledigt: !e.erledigt } : e));

export const clearDone = (list: Eintrag[]): Eintrag[] => list.filter((e) => !e.erledigt);

export const openCount = (list: Eintrag[]): number => list.filter((e) => !e.erledigt).length;

/** Gruppierung für die Anzeige: nach Rezept, Zutaten aus mehreren Rezepten in einer gemeinsamen Gruppe. */
export function groupByRecipe(list: Eintrag[]): { titel: string; items: Eintrag[] }[] {
  const groups = new Map<string, Eintrag[]>();
  for (const e of list) {
    const titel = new Set(e.beitraege.map((b) => b.rezeptId)).size > 1 ? GEMISCHT : e.beitraege[0].titel;
    groups.set(titel, [...(groups.get(titel) ?? []), e]);
  }
  return [...groups].map(([titel, items]) => ({ titel, items }));
}

// ---- Speicherung (lokal auf dem Handy, offline lesbar) ----
const STORAGE_KEY = "gopa-einkauf";

export function loadList(): Eintrag[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Eintrag[]) : [];
  } catch {
    return [];
  }
}

function saveList(list: Eintrag[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* Speicher voll oder gesperrt */ }
}

export function useShoppingList() {
  const [list, setList] = useState<Eintrag[]>(loadList);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setList(loadList()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const update = useCallback((fn: (l: Eintrag[]) => Eintrag[]) => {
    const next = fn(loadList());
    saveList(next);
    setList(next);
  }, []);
  return { list, update };
}
