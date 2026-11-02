import { useState } from "react";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";
import { BearSays } from "../components/SpeechBubble";

export function Login() {
  const [pw, setPw] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function anmelden(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFehler(null);
    try {
      const { token } = await api.login(pw);
      setToken(token); // bleibt auf dem Handy gespeichert
    } catch (err) {
      setFehler((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="neu-form login" onSubmit={anmelden}>
      <BearSays size={110}>{fehler ?? "Hallo! Wie lautet das Geheimwort für Gopas Küche?"}</BearSays>
      <label htmlFor="pw" className="field-label">Passwort</label>
      <input id="pw" className="text-in" type="password" autoComplete="current-password" value={pw}
        onChange={(e) => setPw(e.target.value)} />
      <button className="btn btn-primary big" type="submit" disabled={busy || !pw}>Anmelden</button>
    </form>
  );
}
