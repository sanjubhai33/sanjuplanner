import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.dailyplanner",
  appName: "Daily Planner",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
