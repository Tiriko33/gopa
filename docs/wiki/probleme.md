# Probleme lösen

## "Gopa erreicht den Server nicht"

- Läuft Gopas Küche? Starte `scripts\start-gopa.bat` auf dem PC.
- Sind Handy und PC im **selben WLAN**? Sonst nutze Tailscale (siehe [Installation](installation)).
- Stimmt die Adresse unter **Einstellungen**? Sie sieht aus wie `http://192.168.1.20:8000`. Die IP kann sich ändern, das Startskript zeigt die aktuelle.
- Firewall: Beim ersten Start **Private Netzwerke erlauben**.
- Test am Handy: Öffne `http://<PC-IP>:8000/api/health` im Browser. Du solltest `{"ok":true}` sehen.

## "Das Passwort stimmt nicht"

Es ist das `APP_PASSWORD` aus der `.env` auf dem PC. Nach 10 falschen Versuchen sperrt Gopa die Anmeldung für 10 Minuten. Wurde das Passwort geändert, melden sich alle Geräte neu an.

## "Gopa konnte das Video nicht laden"

TikTok und Instagram ändern ihre Seiten oft. Aktualisiere den Video-Lader auf dem PC:

```powershell
backend\.venv\Scripts\python -m pip install -U yt-dlp
```

Bei Instagram hilft oft nur der Fallback: Text aus der Beschreibung einfügen oder Screenshots hochladen.

## "Gopa erreicht das lokale Sprachmodell nicht"

- Läuft Ollama? Das Startskript startet es. Test: `ollama list` im Terminal.
- Ist das Modell geladen? `ollama pull gemma4:12b`.
- Steht in der `.env` `OLLAMA_URL=http://localhost:11434` und der richtige `OLLAMA_MODEL`?

## Das Rezept dauert sehr lange

Ohne starke Grafikkarte läuft das Modell auf der CPU und braucht mehrere Minuten. Nimm ein kleineres Modell (`OLLAMA_MODEL`) oder erhöhe `OLLAMA_TIMEOUT` in der `.env`.

## Mengen oder Schritte sind falsch

Ein lokales Modell macht mehr Fehler als große Cloud-Modelle. Prüfe neue Rezepte kurz gegen das Video und korrigiere sie im Editor. Ein größeres Modell macht in der Regel weniger Fehler, braucht aber mehr Speicher.

## Der PC wird beim Spielen langsam

Gopa gibt das Modell nach jedem Rezept frei (`OLLAMA_KEEP_ALIVE=0`). Erstelle keine Rezepte, während du spielst, und beende Gopas Küche (Strg + C) vor dem Spielen.

## Die App lässt sich nicht installieren

- Erlaube die Installation aus dieser Quelle (Einstellungen → Apps → Spezieller App-Zugriff → Unbekannte Apps installieren → Browser).
- Play Protect: **Trotzdem installieren**.
- Meldung "App nicht installiert": Du hast eine frühere Version mit anderem Zertifikat. Deinstalliere die alte Gopa und installiere die neue (die Einkaufsliste geht dabei verloren).
