import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.avinash.dailyplanner",
  appName: "Daily Planner",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    // APK WebView loads the live published app so server functions
    // (auth, AI report, cloud sync) work. Once cached, it also opens
    // offline and localforage keeps tasks/journal/water usable.
    url: "https://sanjuplanner.lovable.app",
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
