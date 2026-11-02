# Kapitel 6: Frontend-Logik ohne Oberfläche

**Ziel:** Alles, was **rechnet und speichert**, kommt in kleine Dateien unter `src/lib/` und wird mit Vitest getestet, bevor es eine einzige Schaltfläche gibt. Portionsrechner, Einkaufsliste, Suche und Server-Zugriff sind Logik, keine Optik. Logik ohne Oberfläche lässt sich leicht testen.

Alle Dateien in diesem Kapitel liegen in `frontend/src/lib/`.

## 6.1 `types.ts`: dieselben Formen wie im Backend

```ts
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
```

Das ist das TypeScript-Gegenstück zu `schema.py`. Ändert sich ein Feld im Backend, musst du es **hier auch** ändern, sonst warnt dich der Editor nicht. `FILTER_CHIPS` sind die Schalter oben in der Sammlung, `KATEGORIEN` die Auswahl beim Bearbeiten (mit "Sonstiges").

## 6.2 `format.ts`: Portionsrechner und deutsche Zahlen

```ts
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
```

- `scaleAmount`: `Menge × Ziel ÷ Basis`. Eine unbekannte Menge (`null`) bleibt `null`, es wird **nie** eine Menge erfunden. Der Schutz `basis <= 0` verhindert eine Division durch null.
- `formatAmount`: Deutsche Schreibweise mit Komma (`1,5 EL`). `Intl.NumberFormat("de-DE")` macht das. Ab 10 ganze Zahlen, darunter zwei Nachkommastellen: `333,333 g` wird `333 g`.
- `groupIngredients`: fasst aufeinanderfolgende Zutaten mit gleicher Gruppe ("Teig", "Soße") zusammen.

## 6.3 `filter.ts`: dieselbe Suche wie im Backend

```ts
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
```

Warum doppelt? Wenn der PC aus ist, kann die App aus dem **Offline-Zwischenspeicher** trotzdem suchen. Dafür braucht sie dieselben Regeln lokal.

## 6.4 `shopping.ts`: die Einkaufsliste

```ts
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
```

Das Prinzip, damit es nicht verwirrend wird:
- Ein **Eintrag** ist eine Zutat (`key` = Name + Einheit, klein geschrieben). `Mehl|g` und `mehl|g` sind **derselbe** Eintrag und werden zusammengelegt.
- Ein Eintrag sammelt **Beiträge** pro Rezept (`beitraege`). Die Gesamtmenge ist die Summe. 50 g Mehl aus Rezept A und 300 g aus Rezept B ergeben **350 g**.
- Fügt man dasselbe Rezept **noch einmal** hinzu, wird sein Beitrag **ersetzt**, nicht verdoppelt (`filter(b => b.rezeptId !== r.id)` am Anfang von `addRecipe`).
- Unterschiedliche Einheiten (`1 EL Öl` und `50 ml Öl`) bleiben getrennt: ohne Dichtetabelle wäre jede Umrechnung geraten.
- Abgehakte Einträge, zu denen eine neue Menge kommt, werden wieder offen.
- Gespeichert wird **auf dem Handy** (`localStorage`), also auch **ohne PC** lesbar, und `try/catch` fängt Fälle ab, in denen der Speicher gesperrt oder voll ist.
- `useShoppingList` ist ein React-**Hook**: er liest die Liste, gibt `list` und `update` zurück und hört auf das `storage`-Ereignis (wenn ein anderer Tab etwas ändert).

## 6.5 Hilfen: `timer.ts`, `useWakeLock.ts`

```ts
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Kurzer Signalton + Vibration, wenn ein Timer abläuft. */
export function alarm() {
  try { navigator.vibrate?.([300, 150, 300, 150, 300]); } catch { /* nicht unterstützt */ }
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.2;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
  } catch { /* kein Audio erlaubt */ }
}
```

`alarm()` ist ein Signalton über die Web-Audio-API (kein Audiodatei nötig) plus Vibration. Beides steckt in `try/catch`, weil Browser es erst nach einer Berührung erlauben.

```ts
import { useEffect } from "react";

/** Hält das Display an (Wake Lock API, braucht HTTPS). Fehlt die API, passiert einfach nichts. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const l = await navigator.wakeLock.request("screen");
        if (cancelled) void l.release(); else lock = l;
      } catch { /* z. B. Energiesparmodus: ignorieren */ }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void acquire(); };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);
}
```

Der Wake Lock hält das Display im Kochmodus an. Er braucht einen **sicheren Kontext** (HTTPS oder `localhost`). In der Android-App gilt `http://localhost` als sicher, deshalb ist `androidScheme: "http"` in Kapitel 9 wichtig. Er wird beim Zurückkehren in die App neu angefordert (Android gibt ihn beim Wegwechseln frei).

## 6.6 Anmeldung und Server-Adresse: `auth.ts`, `server.ts`

```ts
const KEY = "gopa-token";
export const AUTH_EVENT = "gopa-auth";

export function getToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token); else localStorage.removeItem(KEY);
  } catch { /* Speicher gesperrt */ }
  window.dispatchEvent(new Event(AUTH_EVENT));
}
```

Der Token liegt im `localStorage`. `setToken(null)` loggt aus. Das **Ereignis** `gopa-auth` sagt der Oberfläche "der Anmeldestatus hat sich geändert". So reagiert die App sofort, auch wenn der Server `401` meldet.

```ts
import { Capacitor, registerPlugin } from "@capacitor/core";

const KEY = "gopa-server";

/** In der Android-App gibt es keinen eigenen Server: die Adresse trägt man beim Anmelden ein. */
export const isNative = (): boolean => Capacitor.isNativePlatform();

export function normalizeServer(raw: string): string {
  let s = raw.trim().replace(/\/+$/, "");
  if (s && !/^https?:\/\//i.test(s)) s = `http://${s}`;
  return s;
}

export function getServer(): string {
  if (!isNative()) return ""; // Webversion: gleiche Adresse wie die Seite
  try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; }
}

export function setServer(raw: string) {
  try { localStorage.setItem(KEY, normalizeServer(raw)); } catch { /* Speicher gesperrt */ }
}

// ---- Teilen aus TikTok/Instagram (Android-Intent, siehe ShareIntentPlugin.java) ----
interface ShareIntentPlugin { getPending(): Promise<{ text?: string }> }
const ShareIntent = registerPlugin<ShareIntentPlugin>("ShareIntent");

export async function takePendingShare(): Promise<string | null> {
  if (!isNative()) return null;
  try { return (await ShareIntent.getPending()).text ?? null; } catch { return null; }
}
```

- In der **Browser-Version** ist der Server immer derselbe wie die Seite (`""`, also relative Adressen).
- In der **Android-App** gibt es keinen eigenen Server. Die Adresse deines PCs (z. B. `http://192.168.1.20:8000`) trägt man beim Anmelden ein. `normalizeServer` macht aus `192.168.1.20:8000` automatisch `http://192.168.1.20:8000` und entfernt einen Schrägstrich am Ende.
- `registerPlugin("ShareIntent")` meldet das Java-Plugin an, das du in Kapitel 9 baust. Im Browser ist es nie aktiv (`isNative()` ist `false`).

## 6.7 `api.ts`: alle Server-Aufrufe an einer Stelle

```ts
import { getToken, setToken } from "./auth";
import { filterRecipes } from "./filter";
import { getServer } from "./server";
import type { Kategorie, Rezept } from "./types";

export interface Job {
  id: string;
  status: "running" | "done" | "error";
  step: "download" | "transcribe" | "translate";
  result: Omit<Rezept, "id" | "erstellt_am" | "favorit"> | null;
  error: { code: string; message: string; fallback: boolean } | null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    res = await fetch(getServer() + path, { ...init, headers });
  } catch {
    throw new ApiError(0, "Gopa erreicht den Server nicht. Läuft Gopas Küche auf dem PC, und stimmt die Adresse in den Einstellungen?");
  }
  if (res.status === 401 && path !== "/api/login") setToken(null); // Token ungültig: zurück zum Login
  if (!res.ok) {
    let msg = "Das hat nicht geklappt.";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") msg = body.detail;
    } catch { /* keine JSON-Antwort */ }
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// Zuletzt geladene Rezepte merkt sich die App, damit Lesen und Kochen auch ohne den PC klappen.
const CACHE = "gopa-cache";
type Cache = { list?: Rezept[]; byId: Record<string, Rezept> };
function readCache(): Cache {
  try { return { byId: {}, ...(JSON.parse(localStorage.getItem(CACHE) ?? "{}") as Partial<Cache>) }; } catch { return { byId: {} }; }
}
function writeCache(fn: (c: Cache) => void) {
  try { const c = readCache(); fn(c); localStorage.setItem(CACHE, JSON.stringify(c)); } catch { /* voll oder gesperrt */ }
}
const offline = (e: unknown) => e instanceof ApiError && e.status === 0;

export const api = {
  login: (password: string) => request<{ token: string }>("/api/login", json("POST", { password })),
  listRecipes: (kategorie: string, q: string) => {
    const p = new URLSearchParams();
    if (kategorie !== "Alle") p.set("kategorie", kategorie);
    if (q.trim()) p.set("q", q.trim());
    return request<Rezept[]>(`/api/recipes?${p}`).then(
      (list) => {
        if (kategorie === "Alle" && !q.trim()) writeCache((c) => { c.list = list; list.forEach((r) => { c.byId[r.id] = r; }); });
        return list;
      },
      (e) => {
        const cached = readCache().list;
        if (offline(e) && cached) return filterRecipes(cached, kategorie, q);
        throw e;
      },
    );
  },
  getRecipe: (id: string) =>
    request<Rezept>(`/api/recipes/${id}`).then(
      (r) => { writeCache((c) => { c.byId[id] = r; }); return r; },
      (e) => {
        const cached = readCache().byId[id];
        if (offline(e) && cached) return cached;
        throw e;
      },
    ),
  setKategorie: (id: string, kategorie: Kategorie) =>
    request<Rezept>(`/api/recipes/${id}`, json("PATCH", { kategorie })),
  updateRecipe: (id: string, r: Omit<Rezept, "id" | "erstellt_am" | "favorit">) =>
    request<Rezept>(`/api/recipes/${id}`, json("PUT", r)),
  saveRecipe: (r: Omit<Rezept, "id" | "erstellt_am" | "favorit">) => request<Rezept>("/api/recipes", json("POST", r)),
  startJob: (link: string, text: string, files: File[]) => {
    const f = new FormData();
    f.set("link", link);
    f.set("text", text);
    files.forEach((x) => f.append("files", x));
    return request<{ id: string }>("/api/jobs", { method: "POST", body: f });
  },
  getJob: (id: string) => request<Job>(`/api/jobs/${id}`),
  deleteRecipe: (id: string) => request<void>(`/api/recipes/${id}`, { method: "DELETE" }),
};
```

Das Wichtigste:
- **Eine** Funktion `request` macht jeden Aufruf: sie hängt den Token an, verwandelt Netzwerkfehler in **verständliche deutsche Meldungen** und wirft bei `401` den Token weg (zurück zum Login).
- `ApiError.status === 0` bedeutet "Server nicht erreichbar" (PC aus, falsche Adresse).
- **Offline-Zwischenspeicher:** Jede erfolgreich geladene Sammlung und jedes Rezept wird gespeichert. Ist der Server nicht erreichbar, liefert die App den Zwischenspeicher: **Lesen und Kochen gehen auch ohne PC.** Nur Neues erstellen und Ändern braucht ihn.
- `startJob` schickt Formulardaten (`FormData`), weil Dateien dabei sein können. Bewusst **kein** `Content-Type`-Header: der Browser setzt ihn selbst samt `boundary`. Setzt du ihn von Hand, schlägt der Upload fehl.

## 6.8 Tests

Lege die Tests neben die Dateien. Sie sind kurz und lesenswert: Sie dokumentieren, wie die Funktionen gemeint sind.

`frontend/src/lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatAmount, formatTime, groupIngredients, scaleAmount, wasConverted } from "./format";

describe("Portionsrechner", () => {
  it("skaliert Mengen", () => {
    expect(scaleAmount(250, 2, 4)).toBe(500);
    expect(scaleAmount(1, 2, 3)).toBe(1.5);
  });
  it("lässt unbekannte Mengen unbekannt", () => {
    expect(scaleAmount(null, 2, 4)).toBeNull();
  });
});

describe("formatAmount", () => {
  it("nutzt deutsches Komma und Einheit", () => {
    expect(formatAmount(1.5, "EL")).toBe("1,5 EL");
    expect(formatAmount(250, "g")).toBe("250 g");
    expect(formatAmount(2, null)).toBe("2");
  });
  it("zeigt bei unbekannter Menge nur die Einheit oder nichts", () => {
    expect(formatAmount(null, null)).toBe("");
  });
  it("rundet Krümel weg", () => {
    expect(formatAmount(333.333, "g")).toBe("333 g");
    expect(formatAmount(0.3333, "TL")).toBe("0,33 TL");
  });
});

describe("formatTime", () => {
  it("addiert Vorbereitung und Kochen", () => {
    expect(formatTime({ zeit_vorbereitung_min: 10, zeit_kochen_min: 15 })).toBe("25 Min");
    expect(formatTime({ zeit_vorbereitung_min: 30, zeit_kochen_min: 45 })).toBe("1 Std 15 Min");
    expect(formatTime({ zeit_vorbereitung_min: null, zeit_kochen_min: null })).toBeNull();
  });
});

describe("Zutaten", () => {
  const z = (name: string, gruppe: string | null, original: string | null = null) => ({
    gruppe, name, menge: 1, einheit: null, original,
  });
  it("gruppiert aufeinanderfolgende Zutaten", () => {
    const g = groupIngredients([z("a", "Teig"), z("b", "Teig"), z("c", "Soße")]);
    expect(g.map((x) => [x.gruppe, x.items.length])).toEqual([["Teig", 2], ["Soße", 1]]);
  });
  it("erkennt Umrechnung", () => {
    expect(wasConverted([z("a", null), z("b", null, "1 cup")])).toBe(true);
    expect(wasConverted([z("a", null)])).toBe(false);
  });
});
```

`frontend/src/lib/filter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterRecipes } from "./filter";
import type { Rezept } from "./types";

const r = (titel: string, kategorie: Rezept["kategorie"], zutat: string, tags: string[] = []) =>
  ({ titel, kategorie, tags, zutaten: [{ name: zutat }] }) as unknown as Rezept;
const list = [r("Pfannkuchen", "Frühstück", "Milch", ["süß"]), r("Bolognese", "Abendessen", "Hackfleisch", ["Pasta"]),
  r("Tiramisu", "Dessert", "Mascarpone"), r("Käsekuchen", "Dessert", "Quark")];
const t = (l: Rezept[]) => l.map((x) => x.titel).sort();

describe("Filter nach Kategorie und Suche", () => {
  it("filtert nach Kategorie, Alle zeigt alles", () => {
    expect(t(filterRecipes(list, "Dessert", ""))).toEqual(["Käsekuchen", "Tiramisu"]);
    expect(filterRecipes(list, "Alle", "")).toHaveLength(4);
    expect(filterRecipes(list, "Snacks", "")).toEqual([]);
  });
  it("sucht in Titel, Zutaten und Tags, ohne Groß/Klein und mit Umlauten", () => {
    expect(t(filterRecipes(list, "Alle", "hackfleisch"))).toEqual(["Bolognese"]);
    expect(t(filterRecipes(list, "Alle", "PASTA"))).toEqual(["Bolognese"]);
    expect(t(filterRecipes(list, "Alle", "KÄSE"))).toEqual(["Käsekuchen"]);
  });
  it("kombiniert Kategorie und Suche", () => {
    expect(t(filterRecipes(list, "Dessert", "quark"))).toEqual(["Käsekuchen"]);
    expect(filterRecipes(list, "Frühstück", "quark")).toEqual([]);
  });
});
```

`frontend/src/lib/shopping.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GEMISCHT, addRecipe, clearDone, groupByRecipe, openCount, toggle, totalAmount } from "./shopping";

const z = (name: string, menge: number | null, einheit: string | null = "g") => ({
  gruppe: null, name, menge, einheit, original: null,
});
const rezept = (id: string, titel: string, zutaten: ReturnType<typeof z>[], portionen = 2) =>
  ({ id, titel, portionen, zutaten });

describe("Einkaufsliste: Zusammenfassen", () => {
  it("addiert Mengen gleicher Zutaten aus mehreren Rezepten", () => {
    let l = addRecipe([], rezept("a", "Pasta", [z("Mehl", 200), z("Salz", 5)]), 2);
    l = addRecipe(l, rezept("b", "Kuchen", [z("mehl", 300)]), 2);
    expect(l).toHaveLength(2);
    expect(totalAmount(l.find((e) => e.key.startsWith("mehl"))!)).toBe(500);
  });

  it("trennt unterschiedliche Einheiten", () => {
    const l = addRecipe([], rezept("a", "A", [z("Milch", 200, "ml"), z("Milch", 1, "Tasse")]), 2);
    expect(l).toHaveLength(2);
  });

  it("skaliert nach gewählter Portionszahl", () => {
    const l = addRecipe([], rezept("a", "A", [z("Mehl", 200)], 2), 4);
    expect(totalAmount(l[0])).toBe(400);
  });

  it("verdoppelt nichts, wenn dasselbe Rezept erneut hinzugefügt wird", () => {
    let l = addRecipe([], rezept("a", "A", [z("Mehl", 200)]), 2);
    l = addRecipe(l, rezept("a", "A", [z("Mehl", 200)]), 2);
    expect(totalAmount(l[0])).toBe(200);
  });

  it("ersetzt beim erneuten Hinzufügen die Menge mit der neuen Portionszahl", () => {
    let l = addRecipe([], rezept("a", "A", [z("Mehl", 200)]), 2);
    l = addRecipe(l, rezept("a", "A", [z("Mehl", 200)]), 4);
    expect(totalAmount(l[0])).toBe(400);
  });

  it("behandelt unbekannte Mengen: nichts erfinden", () => {
    const l = addRecipe([], rezept("a", "A", [z("Salz", null, null)]), 2);
    expect(totalAmount(l[0])).toBeNull();
    const l2 = addRecipe(l, rezept("b", "B", [z("Salz", null, null)]), 2);
    expect(l2).toHaveLength(1);
    expect(totalAmount(l2[0])).toBeNull();
  });

  it("öffnet einen abgehakten Eintrag wieder, wenn Menge dazukommt", () => {
    let l = addRecipe([], rezept("a", "A", [z("Mehl", 200)]), 2);
    l = toggle(l, l[0].key);
    l = addRecipe(l, rezept("b", "B", [z("Mehl", 100)]), 2);
    expect(l[0].erledigt).toBe(false);
  });
});

describe("Einkaufsliste: Abhaken, Löschen, Gruppen", () => {
  it("hakt ab, zählt offene und löscht Erledigte", () => {
    let l = addRecipe([], rezept("a", "A", [z("Mehl", 1), z("Zucker", 1)]), 2);
    l = toggle(l, l[0].key);
    expect(openCount(l)).toBe(1);
    l = clearDone(l);
    expect(l.map((e) => e.name)).toEqual(["Zucker"]);
  });

  it("gruppiert nach Rezept, gemeinsame Zutaten in einer eigenen Gruppe", () => {
    let l = addRecipe([], rezept("a", "Pasta", [z("Mehl", 1), z("Ei", 1)]), 2);
    l = addRecipe(l, rezept("b", "Kuchen", [z("Mehl", 1), z("Zucker", 1)]), 2);
    const g = groupByRecipe(l);
    expect(g.map((x) => x.titel).sort()).toEqual([GEMISCHT, "Kuchen", "Pasta"].sort());
    expect(g.find((x) => x.titel === GEMISCHT)!.items[0].name).toBe("Mehl");
  });
});
```

`frontend/src/lib/timer.test.ts`:

```ts
import { expect, it } from "vitest";
import { formatTimer } from "./timer";

it("formatiert Sekunden als MM:SS", () => {
  expect(formatTimer(120)).toBe("02:00");
  expect(formatTimer(59.2)).toBe("01:00");
  expect(formatTimer(-3)).toBe("00:00");
  expect(formatTimer(3600)).toBe("60:00");
});
```

## Test für dieses Kapitel

```powershell
cd C:\Temp\gopa-nachbau\frontend
npm test
npx tsc --noEmit
```

**Erwartet:** `Test Files 4 passed`, `Tests 21 passed`, und `tsc` gibt **nichts** aus (kein Ausgabe = keine Typfehler).

```powershell
cd ..
git add -A
git commit -m "feat: Frontend-Logik (Portionen, Einkaufsliste, Suche, API)"
```

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| `Cannot find module './types'` | Dateiname/Ordner falsch geschrieben (Groß/Klein) | Dateiname exakt wie oben, alles unter `src/lib/` |
| `Cannot find module '@capacitor/core'` | Paket nicht installiert | `npm install` im Ordner `frontend` |
| TypeScript: `Property 'x' does not exist on type` | Tippfehler im Feldnamen oder `types.ts` weicht vom Backend ab | Feldnamen mit `schema.py` abgleichen |
| Vitest: `expected '1,5 EL' to be ...` (Zahl falsch formatiert) | `formatAmount` weicht ab | Funktion mit der Vorlage vergleichen; die Fehlermeldung zeigt "erwartet" und "erhalten" nebeneinander |
| `ReferenceError: localStorage is not defined` im Test | Test ruft Code auf, der Browser-Speicher nutzt | nur reine Funktionen testen (wie hier). Der Hook wird nicht im Test aufgerufen |
| Test `addRecipe` wirft `Cannot read properties of undefined` | `beitraege` vergessen | `beitraege: []` / Beitrag anlegen wie im Code |
| `Intl`-Zahlen zeigen Punkt statt Komma | Locale falsch geschrieben | `"de-DE"` mit Bindestrich |
| Upload scheitert mit 422 "field required" | `Content-Type` von Hand gesetzt oder Feldname falsch | bei `FormData` **keinen** Header setzen; Feld heißt `link` / `files` |
| `localStorage` wirft `SecurityError` | privater Modus / gesperrte Cookies | genau dafür gibt es die `try/catch`-Blöcke |
