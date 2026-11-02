# Gopa auf GitHub hochladen und veröffentlichen

Danach hast du automatisch:

- die **APK** zum Herunterladen (GitHub Actions baut sie bei jedem Push),
- eine **Startseite mit Download-Button** (GitHub Pages),
- ein **Release** mit der APK bei jedem Versions-Tag (`v1.0.0`),
- ein **Wiki** mit Installation und Benutzung.

Ersetze überall `DEIN-NAME` durch deinen GitHub-Benutzernamen.

## 1. Repository anlegen

1. Auf <https://github.com> anmelden, oben rechts **+** → **New repository**.
2. **Repository name:** `gopa`.
3. **Public** wählen. GitHub Pages ist bei kostenlosen Konten nur für öffentliche Repositories möglich. Die APK enthält keine Geheimnisse: Passwort und Rezepte liegen auf deinem PC. Die `.env` wird nicht hochgeladen.
4. **Keine** README, `.gitignore` oder Lizenz hinzufügen (das Projekt hat sie schon).
5. **Create repository.**

## 2. Platzhalter ersetzen

Die Startseite und das Wiki enthalten `DEIN-NAME` als Platzhalter. Im Projektordner (`C:\Temp\gupa`) in Git Bash:

```bash
sed -i 's/DEIN-NAME/dein-github-name/g' docs/site/index.html docs/wiki/*.md
git add -A
git commit -m "docs: GitHub-Adresse eingetragen"
```

## 3. Code hochladen

```bash
git remote add origin https://github.com/dein-github-name/gopa.git
git push -u origin main --tags
```

Beim ersten Push fragt Git nach der Anmeldung. Als Passwort brauchst du ein **Personal Access Token** (GitHub → Profilbild → *Settings* → *Developer settings* → *Personal access tokens* → *Tokens (classic)*, Haken bei `repo` und `workflow`) oder du meldest dich über den Browser an, wenn Git Credential Manager das anbietet.

Prüfe, dass keine Geheimnisse mitgekommen sind: `git ls-files | findstr /i "\.env"` darf nur `.env.example` zeigen.

## 4. GitHub Pages einschalten

Einmalig: im Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Danach **Actions → "Android-APK und Download-Seite" → Run workflow** (oder einfach einen neuen Push machen). Der erste Lauf dauert 8 bis 15 Minuten, spätere sind schneller. Er testet, baut die APK und veröffentlicht die Seite.

- Startseite mit Download: `https://dein-github-name.github.io/gopa/`
- Direkter APK-Link: `https://dein-github-name.github.io/gopa/gopa.apk`

Schick dir den Link aufs Handy und öffne ihn dort.

## 5. Release mit der APK

Der Tag `v1.0.0` ist im Projekt schon gesetzt und wurde mit `--tags` hochgeladen. Er löst bei GitHub ein **Release** mit `gopa.apk` aus (rechts im Repository unter *Releases*). Der stabile Download-Link dazu lautet:

```
https://github.com/dein-github-name/gopa/releases/latest/download/gopa.apk
```

Wurde der Tag schon vor dem ersten Workflow-Lauf hochgeladen, startet das Release erst bei einem neuen Tag: `git tag v1.0.1 && git push origin v1.0.1`.

## 6. Wiki anlegen

Das Wiki ist ein eigenes kleines Git-Repository neben dem Projekt.

1. Im Repository oben auf **Wiki** → **Create the first page**, auf **Save page** klicken (der Inhalt ist egal, GitHub legt damit das Wiki an).
2. Dann im Terminal, **neben** dem Projektordner:

```bash
git clone https://github.com/dein-github-name/gopa.wiki.git
cp gopa/docs/wiki/*.md gopa.wiki/
cd gopa.wiki
git add -A
git commit -m "Wiki"
git push
```

(Unter Windows in PowerShell statt `cp`: `copy gopa\docs\wiki\*.md gopa.wiki\`.)

Die Seiten heißen `Home`, `Installation`, `Gopas-Kueche`, `Benutzung` und `Probleme`. Die Links untereinander funktionieren so.

## 7. App aktualisieren

Ändere etwas, `git push`, den Lauf abwarten, die neue APK von derselben Adresse laden und über die alte installieren. Alle Test-APKs sind mit demselben Zertifikat signiert, deshalb klappt das Update ohne Deinstallation.

## Hinweise

- Die APK ist eine **Test-APK** (Debug-Build) mit festem Test-Zertifikat. Das Zertifikat liegt im Repository und ist **nicht** für den Play Store gedacht.
- Gopas Küche (der PC mit Ollama) wird **nicht** über GitHub gehostet. Siehe Wiki-Seite *Gopas-Kueche*.
- GitHub Actions ist für öffentliche Repositories kostenlos.
- Wenn der Lauf scheitert: **Actions** → den roten Lauf öffnen → den fehlgeschlagenen Schritt aufklappen. Schick mir die Fehlermeldung, dann behebe ich sie.
