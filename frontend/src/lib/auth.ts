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
