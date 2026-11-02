# Kapitel 9: Die Android-App mit Capacitor

**Ziel:** Aus deiner Web-App wird ein echtes Android-Projekt. Es nimmt per "Teilen" einen Link aus TikTok/Instagram an und lässt sich zu einer APK bauen.

> **Ehrlicher Hinweis:** Die Java-Dateien und die Android-Konfiguration in diesem Kapitel habe ich **nie auf einem Handy getestet** (mein Rechner hat weder JDK noch Android SDK, die APK baut GitHub). Die Syntax entspricht Capacitor 8, aber du bist der Erste, der sie ausprobiert. Lies deshalb die Fehlertabelle am Ende.

## 9.1 Wie Capacitor funktioniert

Capacitor steckt deine fertige Web-App (`dist/`) in eine Android-App mit eingebautem Browser (WebView). Die App **ist** also deine Seite, nur mit App-Symbol, Installation und Zugriff auf Handy-Funktionen. Dein Code muss dafür nicht neu geschrieben werden.

```
npm run build ──▶ dist/  ──(npx cap sync)──▶ android/app/src/main/assets/public ──(Gradle)──▶ app-debug.apk
```

Nach **jeder** Änderung am Frontend: `npm run build` und `npx cap sync android`. Sonst enthält die App den alten Stand.

## 9.2 Android-Projekt erzeugen

Die Pakete stehen schon in der `package.json` aus Kapitel 5 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`).

`frontend/capacitor.config.ts`:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "de.gopa.app",
  appName: "Gopa",
  webDir: "dist",
  server: {
    // "http" statt "https": die App darf dann den Gopa-Server im Heimnetz (http://192.168.x.x:8000) ohne
    // Mixed-Content-Sperre aufrufen. http://localhost gilt für WebView-Funktionen (Zwischenablage, Wake Lock)
    // trotzdem als sicherer Kontext.
    androidScheme: "http",
    cleartext: true,
  },
  android: { backgroundColor: "#E6F0FF" },
};

export default config;
```

Erklärung der Einstellungen:
- `appId: "de.gopa.app"`: die eindeutige Kennung. **Nie ändern**, wenn die App schon installiert ist: Android sieht sonst eine **andere** App.
- `webDir: "dist"`: von dort nimmt Capacitor die Web-App.
- `androidScheme: "http"`: Die App läuft unter `http://localhost`. Würde sie unter `https://localhost` laufen, dürfte sie keine Anfragen an deinen `http://192.168...`-Server stellen (Mixed Content: "unsicherer Inhalt auf sicherer Seite" wird geblockt). `http://localhost` zählt trotzdem als sicher, deshalb funktionieren Zwischenablage und Wake Lock.
- `cleartext: true` und im Manifest `usesCleartextTraffic="true"`: erlauben unverschlüsseltes `http` im Heimnetz. Das ist hier vertretbar, weil dein Server im privaten WLAN läuft und kein Internet-Dienst ist. Im öffentlichen WLAN solltest du Gopas Küche nicht benutzen.

Dann:

```powershell
cd C:\Temp\gopa-nachbau\frontend
npm run build
npx cap add android
npx cap sync android
```

Es entsteht der Ordner `frontend/android/` (ein vollständiges Android-Studio-Projekt). `npx cap add android` braucht den Ordner `dist`, also **zuerst** bauen.

## 9.3 Das Teilen-Plugin (Java)

Wenn jemand in TikTok auf "Teilen" tippt und **Gopa** wählt, startet Android deine App mit einem *Intent* (Absicht) vom Typ `ACTION_SEND` und dem Link als Text. Zwei Java-Dateien fangen das ab und reichen es an die Web-Oberfläche weiter.

Ordner: `frontend/android/app/src/main/java/de/gopa/app/`

`ShareIntentPlugin.java`: speichert den Text und gibt ihn der Web-Oberfläche, **genau einmal** (danach `null`):

```java
package de.gopa.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Reicht den Text, der per "Teilen" (TikTok/Instagram) ankommt, an die Web-Oberfläche weiter. */
@CapacitorPlugin(name = "ShareIntent")
public class ShareIntentPlugin extends Plugin {
    static String pending = null;

    @PluginMethod
    public void getPending(PluginCall call) {
        JSObject result = new JSObject();
        if (pending != null) {
            result.put("text", pending);
            pending = null;
        }
        call.resolve(result);
    }
}
```

`MainActivity.java` (ersetzt die erzeugte Datei): registriert das Plugin und liest den Intent, beim Start **und** wenn die App schon läuft (`onNewIntent`). Im zweiten Fall löst sie in der Web-Oberfläche das Ereignis `gopashare` aus, auf das `ShareListener` (Kapitel 8) hört:

```java
package de.gopa.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ShareIntentPlugin.class);
        super.onCreate(savedInstanceState);
        handleShare(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleShare(intent);
        // App läuft schon: die Oberfläche holt sich den neuen Link über dieses Ereignis ab
        if (getBridge() != null) {
            getBridge().triggerWindowJSEvent("gopashare");
        }
    }

    private void handleShare(Intent intent) {
        if (intent != null && Intent.ACTION_SEND.equals(intent.getAction()) && "text/plain".equals(intent.getType())) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null && !text.isEmpty()) {
                ShareIntentPlugin.pending = text;
            }
        }
    }
}
```

Die Kette: **Teilen → Intent → `MainActivity.handleShare` → `pending` → JS fragt `getPending` → `/neu?text=...`**.

Wichtig: `registerPlugin(ShareIntentPlugin.class)` **vor** `super.onCreate`. Sonst kennt Capacitor das Plugin nicht, und `ShareIntent.getPending()` in JavaScript wirft einen Fehler, den `server.ts` still abfängt (die App läuft dann, aber Teilen tut nichts).

## 9.4 Manifest: Teilen-Liste und http erlauben

Datei `frontend/android/app/src/main/AndroidManifest.xml`. Zwei Änderungen:

**a)** Im Tag `<application ...>` das Attribut ergänzen:

```xml
android:usesCleartextTraffic="true"
```

**b)** In der `<activity>` neben dem bestehenden `MAIN`-Filter einen zweiten `intent-filter` einfügen. Er macht Gopa zum Teilen-Ziel für normalen Text:

```xml
            <!-- "Teilen" in TikTok/Instagram: Gopa erscheint in der Teilen-Liste -->
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/plain" />
            </intent-filter>
```

Beachte auch `android:launchMode="singleTask"` an der Activity (das hat Capacitor schon gesetzt): Es sorgt dafür, dass beim Teilen **keine zweite** App-Instanz startet, sondern `onNewIntent` an die laufende geht.

## 9.5 Festes Test-Zertifikat

Jede APK muss **signiert** sein. Baut Gradle mit dem automatisch erzeugten Debug-Schlüssel, ist der auf **jedem Build-Rechner anders**. GitHub baut jedes Mal auf einer frischen Maschine, die APKs hätten also jedes Mal eine andere Signatur, und Android verweigert die Aktualisierung über die alte Version ("App nicht installiert, Paket steht in Konflikt"). Deshalb liegt ein **festes** Test-Zertifikat im Projekt.

Erzeugen (braucht `keytool` aus einem JDK, z. B. `winget install EclipseAdoptium.Temurin.21.JDK`; oder du kopierst `frontend/android/gopa-test.keystore` aus der Musterlösung):

```powershell
cd C:\Temp\gopa-nachbau\frontend\android
keytool -genkeypair -v -keystore gopa-test.keystore -alias gopa -keyalg RSA -keysize 2048 -validity 10000 -storepass gopa-test -keypass gopa-test -dname "CN=Gopa Test"
```

In `frontend/android/app/build.gradle` zwischen `defaultConfig {...}` und dem Ende von `android { ... }` einfügen (`signingConfigs` steht auf derselben Ebene wie `buildTypes`), und im `debug`-Block die Signatur setzen:

```groovy
    signingConfigs {
        gopatest {
            storeFile file('../gopa-test.keystore')
            storePassword 'gopa-test'
            keyAlias 'gopa'
            keyPassword 'gopa-test'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.gopatest
        }
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
```

> **Dieses Zertifikat ist nur für private Tests** (das Passwort steht bewusst im Code). Für den Play Store brauchst du einen eigenen, geheimen Schlüssel. Eine App für eine Person braucht den Store nicht.

Und in `frontend/android/.gitignore` darf `*.keystore` **nicht** stehen, sonst fehlt die Datei auf GitHub, und der Build bricht ab. Prüfe mit `git check-ignore -v frontend/android/gopa-test.keystore`: keine Ausgabe heißt "wird nicht ignoriert".

## 9.6 App-Symbol

Capacitor legt ein Standard-Symbol an. Die Gopa-Symbole findest du in `docs/design/assets` (`icon-512.png`, `gopa-icon.svg`). Der einfachste Weg: die fertigen Ordner `mipmap-*` aus der Musterlösung (`frontend/android/app/src/main/res/`) in dein Projekt kopieren. Alternativ erzeugt das Werkzeug `@capacitor/assets` aus zwei Bildern `assets/icon-only.png` und `assets/icon-foreground.png` alle Größen:

```powershell
npx capacitor-assets generate --android --iconBackgroundColor "#E6F0FF"
```

(Dieser Befehl ist von mir für den Nachbau **nicht erneut getestet**. Klappt er nicht, nimm den Kopierweg.)

## Test für dieses Kapitel

Ohne JDK/SDK kannst du die APK nicht lokal bauen (GitHub macht das in Kapitel 10), aber du kannst prüfen, dass alles **vorbereitet** ist:

```powershell
cd C:\Temp\gopa-nachbau\frontend
npm run build
npx cap sync android
```

**Erwartet:** `✔ Copying web assets ...` und `✔ Sync finished`, ohne rote Zeilen. Gelbe Hinweise (`[warn]`) sind meist harmlos, rote `[error]`-Zeilen nicht.

Und prüfe, dass die Dateien da sind:

```powershell
Test-Path android\gradlew
Test-Path android\gopa-test.keystore
Test-Path android\app\src\main\java\de\gopa\app\ShareIntentPlugin.java
Test-Path android\app\src\main\assets\public\index.html
```

Alle vier müssen `True` sein.

**Optional, mit Android Studio** (nur wenn du die APK lieber lokal bauen willst): Android Studio installieren, `npx cap open android`, warten bis Gradle fertig ist, *Build → Build APK(s)*. Die APK liegt dann in `android/app/build/outputs/apk/debug/`.

```powershell
cd ..
git add -A
git commit -m "feat: Android-App (Capacitor, Teilen-Plugin, Test-Zertifikat)"
```

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| `npx cap add android`: `Could not find the web assets directory: .\dist` | `npm run build` fehlt | zuerst bauen |
| `[error] ... capacitor.config.ts ... ` Typfehler | Datei weicht ab | wie oben, `import type { CapacitorConfig } from "@capacitor/cli"` |
| `npx cap sync`: `Cannot find module '@capacitor/android'` | Pakete nicht installiert | `npm install` |
| Gradle: `Unsupported class file major version` / `Java 21 required` | falsches JDK | Capacitor 8 braucht **JDK 21** |
| Gradle: `SDK location not found` | kein Android SDK (`ANDROID_HOME`) | Android Studio installieren, oder GitHub bauen lassen |
| Gradle: `Keystore file ... not found` | `gopa-test.keystore` fehlt oder falscher Pfad | `file('../gopa-test.keystore')` ist relativ zu `android/app` |
| Gradle: `Keystore was tampered with, or password was incorrect` | Passwort stimmt nicht | beim Erzeugen und in `build.gradle` dasselbe: `gopa-test` |
| Java: `cannot find symbol PluginMethod` | falscher Import | wie oben: `com.getcapacitor.PluginMethod` (Capacitor 8) |
| Teilen: Gopa fehlt in der Teilen-Liste | `intent-filter` fehlt oder liegt außerhalb `<activity>` | Manifest prüfen, App neu installieren |
| Teilen öffnet Gopa, aber das Feld bleibt leer | Plugin nicht registriert oder Reihenfolge falsch | `registerPlugin` vor `super.onCreate`; `adb logcat` nach `ShareIntent` durchsuchen |
| Nach dem Teilen startet eine zweite App-Instanz | `launchMode` nicht `singleTask` | Manifest prüfen |
| App öffnet sich, bleibt aber weiß | altes `dist` / `sync` vergessen | `npm run build && npx cap sync android` |
| App zeigt "Gopa erreicht den Server nicht" | falsche Adresse, PC aus, Firewall | Kapitel 11 |
| Update-Installation: "Paket steht in Konflikt" | andere Signatur | Test-Zertifikat verwenden (9.5), alte App einmal deinstallieren |
| Cleartext-Fehler `net::ERR_CLEARTEXT_NOT_PERMITTED` | `usesCleartextTraffic` fehlt | Manifest-Attribut setzen, **und** `cleartext: true` in der Capacitor-Konfiguration |
