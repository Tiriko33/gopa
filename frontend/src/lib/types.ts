export type Kategorie = "Frühstück" | "Mittagessen" | "Abendessen" | "Dessert" | "Snacks" | "Sonstiges";

export const FILTER_CHIPS = ["Alle", "Frühstück", "Mittagessen", "Abendessen", "Dessert", "Snacks"] as const;
export const KATEGORIEN: Kategorie[] = ["Frühstück", "Mittagessen", "Abendessen", "Dessert", "Snacks", "Sonstiges"];

export interface Zutat {
  gruppe: string | null;
  name: string;
  menge: number | null;
  einheit: string | null;
  original: string | null;
}

export interface Schritt {
  nr: number;
  text: string;
  timer_min: number | null;
  tipp: string | null;
}

export interface Rezept {
  id: string;
  erstellt_am: string;
  favorit: boolean;
  titel: string;
  beschreibung: string;
  portionen: number;
  kategorie: Kategorie;
  zeit_vorbereitung_min: number | null;
  zeit_kochen_min: number | null;
  zutaten: Zutat[];
  schritte: Schritt[];
  tags: string[];
  hinweise: string[];
  quelle: { url: string; plattform: "TikTok" | "Instagram"; creator: string | null };
}
