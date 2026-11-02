import type { Rezept, Zutat } from "./types";

/** Mengen für den Portionsrechner skalieren; null (Menge unbekannt) bleibt null. */
export function scaleAmount(menge: number | null, basis: number, ziel: number): number | null {
  if (menge === null || basis <= 0) return menge;
  return (menge * ziel) / basis;
}

/** Deutsche Darstellung: 1,5 statt 1.5, sinnvoll gerundet (Gramm ganz, kleine Mengen eine Stelle). */
export function formatAmount(menge: number | null, einheit: string | null): string {
  if (menge === null) return einheit ?? "";
  const nachkomma = menge >= 10 ? 0 : 2;
  const rounded = Number(menge.toFixed(nachkomma));
  const zahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: nachkomma }).format(rounded);
  return einheit ? `${zahl} ${einheit}` : zahl;
}

export function formatTime(r: Pick<Rezept, "zeit_vorbereitung_min" | "zeit_kochen_min">): string | null {
  const total = (r.zeit_vorbereitung_min ?? 0) + (r.zeit_kochen_min ?? 0);
  if (total <= 0) return null;
  if (total < 60) return `${total} Min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} Std ${m} Min` : `${h} Std`;
}

export function wasConverted(zutaten: Zutat[]): boolean {
  return zutaten.some((z) => !!z.original);
}

export function groupIngredients(zutaten: Zutat[]): { gruppe: string | null; items: Zutat[] }[] {
  const out: { gruppe: string | null; items: Zutat[] }[] = [];
  for (const z of zutaten) {
    const last = out[out.length - 1];
    if (last && last.gruppe === z.gruppe) last.items.push(z);
    else out.push({ gruppe: z.gruppe, items: [z] });
  }
  return out;
}
