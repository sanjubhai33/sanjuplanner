import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.avinash.dailyplanner",
  appName: "Daily Planner",
  webDir: "dist/client",
  bundledWebRuntime: false,
  // The APK loads the bundled web files so the planner opens without internet.
  // Online-only features still call the hosted backend when a connection exists.
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
