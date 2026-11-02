import { useState } from "react";
import { Link } from "react-router-dom";
import { setToken } from "../lib/auth";
import { getServer, isNative, normalizeServer, setServer } from "../lib/server";
import { BackIcon } from "../components/icons";

export function Einstellungen() {
  const [server, setSrv] = useState(getServer());
  const [saved, setSaved] = useState(false);

  return (
    <div className="edit">
      <div className="neu-head">
        <Link to="/" className="round-btn bordered" aria-label="Zurück zur Rezeptsammlung"><BackIcon size={22} stroke="#0B2A4A" width={2.4} /></Link>
        <h1>Einstellungen</h1>
      </div>

      {isNative() && (
        <>
          <label className="field-label" htmlFor="srv">Adresse von Gopas Küche (dein PC)</label>
          <input id="srv" className="text-in" inputMode="url" placeholder="http://192.168.1.20:8000" value={server}
            onChange={(e) => { setSrv(e.target.value); setSaved(false); }} />
          <button className="btn btn-secondary" onClick={() => { setServer(server); setSrv(normalizeServer(server)); setSaved(true); }}>Adresse speichern</button>
          {saved && <p className="tip" role="status">Gespeichert.</p>}
        </>
      )}

      <button className="btn btn-primary big" onClick={() => setToken(null)}>Abmelden</button>
      <p className="tip">Gopa 1.0 · Rezepte liegen auf deinem PC, die Einkaufsliste auf diesem Handy.</p>
    </div>
  );
}
