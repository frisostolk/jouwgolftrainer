import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "nl.jouwgolftrainer.app",
  appName: "JouwGolfTrainer",
  webDir: "dist",
  server: {
    allowNavigation: ["api.jouwgolftrainer.com"],
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#f9fafb",
    scrollEnabled: false,
  },
};

export default config;
