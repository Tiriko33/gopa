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
