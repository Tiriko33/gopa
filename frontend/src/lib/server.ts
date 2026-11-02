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
