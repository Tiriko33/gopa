# Gopas Küche auf dem PC einrichten

Gopas Küche ist das Programm, das aus dem Link ein Rezept macht. Es läuft auf deinem PC und muss nur beim Erstellen eines Rezepts an sein.

## Was du brauchst

- Windows-PC mit **mindestens 16 GB RAM**. Empfohlen: eine Grafikkarte mit 8 GB oder mehr (sonst läuft das Modell auf der CPU und ist langsamer).
- **Python 3.12 oder neuer**, **ffmpeg** und **Ollama** ([ollama.com](https://ollama.com)).
- Das Projekt (`git clone` oder ZIP von GitHub).

## Einmalige Einrichtung

```powershell
# 1. ffmpeg installieren
winget install --id Gyan.FFmpeg -e

# 2. KI-Modell laden (ca. 8 GB)
ollama pull gemma4:12b

# 3. Python-Umgebung anlegen
cd gopa\backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
cd ..

# 4. Einstellungen anlegen
copy .env.example .env
notepad .env
```

In der `.env` setzt du mindestens:

```
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:12b
OLLAMA_KEEP_ALIVE=0
APP_PASSWORD=ein-langes-passwort-das-nur-du-kennst
```

Der Teil `OLLAMA_KEEP_ALIVE=0` sorgt dafür, dass das Modell **sofort nach jedem Rezept** aus Grafikkarte und RAM verschwindet. So verlangsamt Gopa dein Spiel nicht, solange kein Rezept erstellt wird.

## Starten

Doppelklick auf **`scripts\start-gopa.bat`**. Das Skript:

1. startet Ollama (falls nicht schon an),
2. startet Gopas Küche,
3. zeigt dir die Adressen, die du in der App eintragen kannst, zum Beispiel `http://192.168.1.20:8000`.

Beim ersten Start fragt die Windows-Firewall, ob Gopa im Netzwerk erreichbar sein darf: **Private Netzwerke erlauben**.

Beenden mit **Strg + C** im Fenster oder Fenster schließen. Dann ist Gopas Küche aus, und Ollama wird mitbeendet, wenn das Skript es gestartet hat.

## Was es verbraucht

| Zustand | Last |
|---|---|
| Aus | nichts |
| An, kein Rezept in Arbeit | gering: ein paar hundert MB RAM für Gopa, das Modell ist entladen |
| Rezept wird erstellt (1 bis 3 Minuten) | GPU und CPU stark belegt, ca. 7 GB Grafikspeicher |

Zocke also nicht gleichzeitig mit dem Erstellen. Zum Lesen und Kochen muss der PC nicht laufen, wenn du die Rezepte vorher in der App geöffnet hast: Die App merkt sich zuletzt geladene Rezepte. Die Einkaufsliste liegt ohnehin nur auf dem Handy. Neue Rezepte, Bearbeiten und Löschen brauchen den PC.

## Kleineres Modell

Ist dir das Modell zu schwer, probiere ein kleineres (z. B. mit 3 bis 4 Milliarden Parametern). Es braucht weniger Speicher und ist schneller, macht aber mehr Fehler bei Deutsch und Mengen. Ändere `OLLAMA_MODEL` in der `.env` und lade es mit `ollama pull <name>`.
