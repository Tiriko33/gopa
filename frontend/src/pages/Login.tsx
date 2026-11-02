import { useState } from "react";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";
import { getServer, isNative, setServer } from "../lib/server";
import { BearSays } from "../components/SpeechBubble";

export function Login() {
  const [pw, setPw] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [server, setSrv] = useState(getServer());

  async function anmelden(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFehler(null);
    if (isNative()) setServer(server);
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
      {isNative() && (
        <>
          <label htmlFor="srv" className="field-label">Adresse von Gopas Küche</label>
          <input id="srv" className="text-in" inputMode="url" placeholder="http://192.168.1.20:8000" value={server}
            onChange={(e) => setSrv(e.target.value)} />
        </>
      )}
      <label htmlFor="pw" className="field-label">Passwort</label>
      <input id="pw" className="text-in" type="password" autoComplete="current-password" value={pw}
        onChange={(e) => setPw(e.target.value)} />
      <button className="btn btn-primary big" type="submit" disabled={busy || !pw || (isNative() && !server.trim())}>Anmelden</button>
    </form>
  );
}
