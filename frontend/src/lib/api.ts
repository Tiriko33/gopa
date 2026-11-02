import type { Kategorie, Rezept } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError(0, "Gopa erreicht den Server nicht. Prüfe deine Internetverbindung.");
  }
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

export const api = {
  listRecipes: (kategorie: string, q: string) => {
    const p = new URLSearchParams();
    if (kategorie !== "Alle") p.set("kategorie", kategorie);
    if (q.trim()) p.set("q", q.trim());
    return request<Rezept[]>(`/api/recipes?${p}`);
  },
  getRecipe: (id: string) => request<Rezept>(`/api/recipes/${id}`),
  setKategorie: (id: string, kategorie: Kategorie) =>
    request<Rezept>(`/api/recipes/${id}`, json("PATCH", { kategorie })),
  deleteRecipe: (id: string) => request<void>(`/api/recipes/${id}`, { method: "DELETE" }),
};
