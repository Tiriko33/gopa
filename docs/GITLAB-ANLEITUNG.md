# Gopa auf GitLab hochladen und veröffentlichen

Danach hast du automatisch:

- die **APK** zum Herunterladen,
- eine **Startseite mit Download-Button** (GitLab Pages),
- ein **Wiki** mit Installation und Benutzung.

Ersetze überall `DEIN-NAME` durch deinen GitLab-Benutzernamen (oder den Namen deiner Gruppe).

## 1. Projekt auf GitLab anlegen

1. Auf <https://gitlab.com> anmelden, oben **+** → **New project/repository** → **Create blank project**.
2. **Project name:** `gopa`. **Visibility:** *Public*, sonst kann das Handy die APK nicht ohne Anmeldung laden. (Die APK enthält keine Geheimnisse: Passwort und Rezepte liegen auf deinem PC.)
3. **Haken bei "Initialize repository with a README" wegmachen.**
4. **Create project.**

## 2. Code hochladen

Im Projektordner (`C:\Temp\gupa`) in PowerShell oder Git Bash:

```bash
git remote add origin https://gitlab.com/DEIN-NAME/gopa.git
git push -u origin main --tags
```

GitLab fragt nach Benutzername und Passwort. Als Passwort brauchst du ein **Personal Access Token** (GitLab → Profilbild → *Preferences* → *Access tokens* → Scope `write_repository`).

Die Datei `.env` ist ausgeschlossen (`.gitignore`) und wird nicht hochgeladen. Prüfe das trotzdem einmal: `git ls-files | findstr /i "\.env"` darf nur `.env.example` zeigen.

## 3. Platzhalter ersetzen und die Pipeline starten

Die Seite und das Wiki enthalten `DEIN-NAME` als Platzhalter für deine Adresse:

```bash
# Git Bash (ersetzt in Startseite und Wiki-Seiten)
sed -i 's/DEIN-NAME/dein-gitlab-name/g' docs/site/index.html docs/wiki/*.md
git add -A
git commit -m "docs: GitLab-Adresse eingetragen"
git push
```

Der Push startet die Pipeline (**Build → Pipelines**). Sie hat vier Aufgaben: Backend-Tests, Frontend-Tests, **APK bauen** (dauert beim ersten Mal 8 bis 15 Minuten) und die Seite veröffentlichen.

## 4. GitLab Pages freischalten

Nach dem ersten erfolgreichen Lauf: **Deploy → Pages**. Dort steht die Adresse, normalerweise

```
https://dein-gitlab-name.gitlab.io/gopa/
```

Falls dort *Access control* steht: unter **Settings → General → Visibility** bei *Pages* auf **Everyone** stellen.

- Startseite mit Download: `https://dein-gitlab-name.gitlab.io/gopa/`
- Direkter APK-Link: `https://dein-gitlab-name.gitlab.io/gopa/gopa.apk`

Den Link schickst du dir aufs Handy (oder scannst einen QR-Code davon) und öffnest ihn dort.

## 5. Wiki anlegen

Das Wiki ist ein eigenes kleines Git-Repository neben dem Projekt.

**Variante A: per Hand**

1. Im Projekt links **Plan → Wiki** → **Create your first page**.
2. Titel `home`, Inhalt aus `docs/wiki/home.md` einfügen, speichern.
3. Genauso `installation`, `gopas-kueche`, `benutzung`, `probleme` anlegen. Die Seitentitel müssen so heißen, sonst funktionieren die Links untereinander nicht.

**Variante B: per Git (schneller)**

```bash
cd ..
git clone https://gitlab.com/DEIN-NAME/gopa.wiki.git
copy gopa\docs\wiki\*.md gopa.wiki\
cd gopa.wiki
git add -A
git commit -m "Wiki"
git push
```

(Falls `gopa.wiki.git` noch nicht existiert, lege vorher in der Weboberfläche die erste Seite an.)

## 6. App aktualisieren

Ändere etwas, `git push`, Pipeline abwarten, neue APK von derselben Adresse herunterladen und über die alte installieren. Alle Test-APKs sind mit demselben Zertifikat signiert, deshalb klappt das Update ohne Deinstallation.

## Hinweise

- Die APK ist eine **Test-APK** (Debug-Build) mit festem Test-Zertifikat. Das Zertifikat liegt im Repository und ist **nicht** für den Play Store gedacht. Für eine echte Veröffentlichung würdest du ein eigenes, geheimes Zertifikat erzeugen.
- Gopas Küche (der PC mit Ollama) wird **nicht** über GitLab gehostet. Siehe Wiki-Seite *gopas-kueche*.
- Kostenlose GitLab-Konten brauchen für die Shared Runner evtl. eine einmalige **Bestätigung per Telefonnummer oder Karte** (Anti-Missbrauch). Meldet die Pipeline sowas, folge den Hinweisen von GitLab. Es entstehen keine Kosten.
