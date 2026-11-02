# Installation der App (Android)

Die App ist eine APK-Datei für private Tests. Sie kommt nicht aus dem Play Store, deshalb braucht Android eine Erlaubnis.

1. Öffne auf dem Handy die Seite **https://DEIN-NAME.github.io/gopa/** und tippe auf **Gopa für Android herunterladen**.
2. Öffne die heruntergeladene Datei `gopa.apk` (Benachrichtigung oder App "Dateien", Ordner Downloads).
3. Android fragt: *Aus dieser Quelle installieren?* Tippe auf **Einstellungen** und erlaube es für den Browser (z. B. Chrome). Gehe zurück.
4. Tippe **Installieren**. Warnt Google Play Protect ("Unbekannte App"), tippe **Trotzdem installieren**.
5. Öffne **Gopa**. Du siehst die Anmeldung.

## Erste Anmeldung

Du brauchst zwei Dinge:

- **Adresse von Gopas Küche**, zum Beispiel `http://192.168.1.20:8000`. Das ist die IP-Adresse des PCs im WLAN. Das Startskript auf dem PC zeigt sie dir an ([Gopas Küche einrichten](Gopas-Kueche)).
- **Passwort**, das auf dem PC in der Datei `.env` unter `APP_PASSWORD` steht.

Das Passwort und die Adresse bleiben gespeichert. Später änderst du sie unter **Einstellungen** (Zahnrad oben rechts in der Sammlung).

## Update auf eine neue Version

Lade die neue `gopa.apk` und installiere sie einfach über die alte. Deine Einkaufsliste bleibt erhalten, weil alle Test-Versionen mit demselben Zertifikat signiert sind.

## Mein Handy ist nicht im selben WLAN

Dann erreicht die App den PC nicht. Mit dem kostenlosen Dienst **Tailscale** (auf PC und Handy installieren, dasselbe Konto) bekommt der PC eine feste Adresse (`http://100.x.y.z:8000`), die überall funktioniert. Trage sie als Adresse ein.
