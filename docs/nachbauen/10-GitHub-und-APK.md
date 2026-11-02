# Kapitel 10: GitHub, automatischer APK-Bau, Download-Seite

**Ziel:** Dein Code liegt auf GitHub. Bei jedem Push testet GitHub alles, baut die APK und stellt sie auf einer Download-Seite bereit. Du brauchst dafür **keine** lokale Android-Installation.

> **Stand der Musterlösung (ehrlich):** Der Workflow `android.yml` ist bei mir **noch nicht grün bestätigt**. Er scheiterte zuerst im Schritt "Android SDK einrichten" (die fertige Action `android-actions/setup-android` brach nach "Accepting Android SDK licenses" ab). Ich habe den Schritt durch eine eigene SDK-Installation ersetzt, aber das Ergebnis eines neuen Laufs steht aus. Rechne damit, dass du hier einmal nachbessern musst. Wie du den Fehler findest und was er meist bedeutet, steht unten bei *Wenn etwas schiefgeht*.

## 10.1 Repository anlegen und hochladen

1. <https://github.com> → **+** → *New repository* → Name `gopa` → **Public** (GitHub Pages ist bei kostenlosen Konten nur für öffentliche Repositories möglich) → **keine** README/.gitignore/Lizenz hinzufügen → *Create*.
2. Prüfe **vor dem Hochladen**, dass keine Geheimnisse mitgehen:

```powershell
cd C:\Temp\gopa-nachbau
git ls-files | Select-String -Pattern "\.env|\.db|node_modules|\.venv"
```

**Erwartet:** höchstens `.env.example`. Alles andere ist ein Alarmzeichen: Datei mit `git rm --cached <datei>` aus Git nehmen und in die `.gitignore` schreiben.

3. Hochladen:

```powershell
git remote add origin https://github.com/DEIN-NAME/gopa.git
git push -u origin main
```

Beim ersten Mal öffnet sich ein Anmeldefenster (Git Credential Manager). Klappt das nicht: GitHub → Profilbild → *Settings* → *Developer settings* → *Personal access tokens* → *Tokens (classic)* → Haken bei `repo` und `workflow` → Token als Passwort benutzen.

## 10.2 Der Test-Workflow (`ci.yml`)

Ein **Workflow** ist eine Anleitung für einen Roboter-Rechner bei GitHub. Er liegt in `.github/workflows/`. Dieser hier führt bei jedem Push alle Tests aus (Backend und Frontend):

```yaml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install pydantic pytest fastapi python-multipart httpx anthropic yt-dlp
        working-directory: backend
      - run: python -m pytest -q
        working-directory: backend
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
        working-directory: frontend
      - run: npm test
        working-directory: frontend
      - run: npm run build
        working-directory: frontend
```

Lies ihn von oben: `on: [push, pull_request]` = wann; `runs-on: ubuntu-latest` = auf welchem Rechner; `steps` = die Schritte (`uses` = fertiger Baustein, `run` = Befehl).

## 10.3 Der APK-Workflow (`android.yml`)

```yaml
# Baut die Android-APK und veröffentlicht die Download-Seite (GitHub Pages).
# Läuft bei jedem Push auf main. Bei einem Tag (z. B. v1.0.0) entsteht zusätzlich ein Release mit der APK.
#
# Einmalig einrichten: Repository → Settings → Pages → Source: "GitHub Actions".
#   Startseite:  https://<dein-name>.github.io/gopa/
#   Direkt-APK:  https://<dein-name>.github.io/gopa/gopa.apk
name: Android-APK und Download-Seite

on:
  push:
    branches: [main]
    tags: ["v*"]
  workflow_dispatch:

permissions:
  contents: write      # für das Release bei Tags
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - uses: actions/setup-java@v5
        with:
          distribution: temurin
          java-version: 21
      - name: Android SDK einrichten
        run: |
          export ANDROID_HOME="$HOME/android-sdk"
          mkdir -p "$ANDROID_HOME/cmdline-tools"
          curl -fsSL -o /tmp/cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-12266719_latest.zip
          unzip -q /tmp/cmdline-tools.zip -d "$ANDROID_HOME/cmdline-tools"
          mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
          SDKM="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
          (yes || true) | "$SDKM" --licenses > /dev/null
          "$SDKM" "platforms;android-36" "build-tools;36.0.0" > /dev/null
          echo "ANDROID_HOME=$ANDROID_HOME" >> "$GITHUB_ENV"
          echo "ANDROID_SDK_ROOT=$ANDROID_HOME" >> "$GITHUB_ENV"
      - name: Oberfläche bauen und in das Android-Projekt kopieren
        working-directory: frontend
        run: |
          npm ci
          npm test
          npm run build
          npx cap sync android
      - name: APK bauen (Debug mit festem Test-Zertifikat)
        working-directory: frontend/android
        run: |
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon
      - name: APK und Seite zusammenstellen
        run: |
          mkdir -p site
          cp docs/site/index.html site/index.html
          cp docs/design/assets/gopa-bear.svg docs/design/assets/icon-192.png site/
          cp frontend/android/app/build/outputs/apk/debug/app-debug.apk site/gopa.apk
      - uses: actions/upload-artifact@v4
        with:
          name: gopa-apk
          path: site/gopa.apk
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - name: Release mit APK (nur bei Tags)
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: site/gopa.apk

  deploy:
    needs: apk
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Schritt für Schritt:
1. `checkout`: lädt deinen Code.
2. `setup-node` (22): installiert Node und merkt sich `npm`-Downloads (schneller beim nächsten Mal).
3. `setup-java` (21): Capacitor 8 braucht **JDK 21**.
4. **Android SDK einrichten**: lädt die Kommandozeilen-Werkzeuge von Google, akzeptiert die Lizenzen und installiert die Plattform 36 samt Build-Tools. Das `(yes || true)` verhindert, dass `yes` beim Schließen der Pipe mit Fehlercode 141 die ganze Zeile scheitern lässt.
5. **Oberfläche bauen**: `npm ci` (genau die Versionen aus `package-lock.json`), Tests, Build, `cap sync`.
6. **APK bauen**: `gradlew assembleDebug`. `chmod +x gradlew` ist nötig, weil Windows die Ausführbarkeit nicht kennt.
7. **Seite zusammenstellen**: `site/` bekommt die Download-Seite und `gopa.apk`.
8. Upload und **GitHub Pages**-Veröffentlichung; bei einem Tag `v...` zusätzlich ein **Release** mit der APK.
9. Der Job `deploy` veröffentlicht die Seite.

`permissions` am Anfang gibt dem Workflow nur die Rechte, die er braucht (Pages schreiben, Release erstellen).

### Die Download-Seite

Der Workflow kopiert `docs/site/index.html` und zwei Bilder. Lege sie an, mit dem Gopa-Design und einem **Download-Knopf**, der auf `gopa.apk` zeigt:

```powershell
mkdir docs\site
```

`docs/site/index.html` kannst du aus der Musterlösung (`C:\Temp\gupa\docs\site\index.html`) übernehmen und anpassen. Wichtig ist nur dieser Link darin: `<a href="gopa.apk" download>`. Ersetze in der Datei alle `DEIN-NAME` durch deinen GitHub-Namen.

## 10.4 GitHub Pages einschalten (einmalig)

Repository → **Settings** → **Pages** → *Build and deployment* → **Source: GitHub Actions**. Ohne diese Einstellung scheitert der Veröffentlichungsschritt.

## 10.5 Laufen lassen und beobachten

```powershell
git add -A
git commit -m "ci: Workflows und Download-Seite"
git push
```

Dann im Repository den Reiter **Actions**. Du siehst zwei Läufe: **CI** (Tests, ca. 2 Minuten) und **Android-APK und Download-Seite** (8 bis 15 Minuten beim ersten Mal). Grüner Haken = fertig.

Danach:
- Seite: `https://DEIN-NAME.github.io/gopa/`
- Direkter APK-Link: `https://DEIN-NAME.github.io/gopa/gopa.apk`

## 10.6 Release (stabiler Download-Link)

```powershell
git tag v1.0.0
git push origin v1.0.0
```

Der Tag löst im Workflow den Release-Schritt aus. Du findest die APK rechts im Repository unter **Releases**, mit dem dauerhaften Link:
`https://github.com/DEIN-NAME/gopa/releases/latest/download/gopa.apk`

Ein Tag wird nur **einmal** ausgewertet. Wenn der Lauf zu dem Tag fehlgeschlagen ist, **verschiebe den Tag nicht**, sondern vergib den nächsten (`v1.0.1`).

## 10.7 So liest du einen roten Lauf

1. Actions → den roten Lauf anklicken → links den roten **Job** (`apk`).
2. Den roten **Schritt** aufklappen. Die Fehlermeldung steht **ganz unten** im Schritt, nicht am Anfang. Scrolle ans Ende, die letzten 15 Zeilen sind die wichtigen.
3. Hinweise mit gelbem Dreieck ("Node.js 20 is deprecated") sind nur Warnungen und nicht die Ursache.
4. Fehler lokal nachstellen: Bei Fehlern in `npm test` / `npm run build` ruf dieselben Befehle auf deinem PC auf.

## 10.8 Wiki

Ein Wiki ist ein zweites, kleines Git-Repository neben deinem Projekt.

1. Im Repository → **Wiki** → *Create the first page* → *Save page* (der Inhalt ist egal, das legt das Wiki an).
2. Seiten schreiben (`Home.md`, `Installation.md`, `Benutzung.md`, ...) und hochladen:

```powershell
cd C:\Temp
git clone https://github.com/DEIN-NAME/gopa.wiki.git
# deine .md-Dateien in den Ordner gopa.wiki kopieren
cd gopa.wiki
git add -A
git commit -m "Wiki"
git push
```

Eine Vorlage für die Seiten liegt in der Musterlösung unter `docs/wiki/`.

## Test für dieses Kapitel

1. Actions: beide Läufe grün.
2. Öffne `https://DEIN-NAME.github.io/gopa/` auf dem **Handy**. Der Download-Knopf lädt `gopa.apk`.
3. Android fragt beim ersten Öffnen: *"Aus dieser Quelle installieren?"* → in den Einstellungen für den **Browser** erlauben. Dann installieren. Android meldet bei Apps außerhalb des Play Stores eventuell eine Warnung ("Unbekannte App") oder Google Play Protect fragt nach einem Scan: bei deiner **eigenen** App ist beides erwartbar.
4. Die App öffnet sich mit der Anmeldung.

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| `git push`: `Authentication failed` / `403` | Passwort statt Token / Token ohne `workflow`-Recht | neues Token mit `repo` + `workflow` |
| `git push`: `remote origin already exists` | `origin` ist schon gesetzt | nicht nochmal `remote add`; Adresse prüfen: `git remote -v`, ändern mit `git remote set-url origin <url>` |
| `git push`: `Could not resolve host` / `Failed to connect` / `could not connect to server` | Netzwerk (VPN, Proxy, WLAN) | Verbindung wechseln, VPN aus; `git -c http.version=HTTP/1.1 push` probieren |
| `git push` abgelehnt: `refusing to allow ... without workflow scope` | Token ohne `workflow` | Token-Rechte ergänzen |
| Push akzeptiert, aber unter Actions läuft nichts | Workflow-Datei im falschen Ordner/mit Tippfehler | genau `.github/workflows/android.yml`; Einrückung (YAML ist empfindlich: nur Leerzeichen, keine Tabs) |
| Lauf rot im Schritt "Android SDK einrichten" | Download oder Lizenz-Schritt scheitert | letzte Zeilen des Schritts lesen (10.7). Häufig: Download-Fehler (`curl: (22)`), dann Zip-Adresse prüfen. Der Zip-Name `commandlinetools-linux-<Zahl>_latest.zip` kommt von <https://developer.android.com/studio#command-line-tools-only>, dort steht die aktuelle Zahl |
| `sdkmanager`: `Warning: Could not create settings` | harmlos | ignorieren |
| `sdkmanager`: Lizenz nicht akzeptiert | `yes`-Pipe fehlt | Zeile `(yes \|\| true) \| "$SDKM" --licenses` |
| Schritt "Oberfläche bauen": `npm ci` meldet `package-lock.json` passt nicht | `package.json` geändert, Lock nicht | lokal `npm install`, **beide** Dateien committen |
| Schritt "Oberfläche bauen": Tests oder `tsc` rot | echter Code-Fehler | denselben Befehl lokal ausführen |
| Gradle: `Permission denied` bei `./gradlew` | Ausführrecht fehlt | `chmod +x gradlew` (steht im Workflow) |
| Gradle: `Could not resolve ...` / Zeitüberschreitung | Maven-Server kurz nicht erreichbar | Lauf mit *Re-run failed jobs* wiederholen |
| Gradle: `compileSdk ... platform not found` | `platforms;android-36` nicht installiert | SDK-Schritt prüfen (Version = `compileSdkVersion` in `android/variables.gradle`) |
| Gradle: `Keystore file ... not found` | `*.keystore` ist in `.gitignore` | aus `.gitignore` nehmen, `git add -f android/gopa-test.keystore` |
| Gradle: `Unsupported class file major version 65` | falsches JDK | `java-version: 21` |
| Schritt `configure-pages`: `Get Pages site failed` / 404 | Pages nicht aktiviert | 10.4 |
| Schritt Release: `Resource not accessible by integration` | `contents: write` fehlt | `permissions` im Workflow prüfen; Repository → Settings → Actions → *Workflow permissions* → *Read and write* |
| Seite zeigt 404 | erster Pages-Lauf noch nicht fertig | 1 bis 2 Minuten warten; Actions → `deploy` grün? |
| Download startet, Handy sagt "Datei beschädigt" | Download unterbrochen / Browser lädt als `.zip` | erneut laden; Dateiname muss auf `.apk` enden |
| "App nicht installiert" | alte Version mit anderer Signatur oder zu wenig Speicher | alte Gopa deinstallieren und neu installieren |
| Play Protect warnt | App ist nicht im Store | "Trotzdem installieren" (deine eigene App) |
