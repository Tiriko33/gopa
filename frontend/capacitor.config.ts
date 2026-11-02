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
