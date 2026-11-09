import type { CapacitorConfig } from "@capacitor/cli";

// اپلیکیشن 100plan — همان وب‌اپ داخل WebView اندروید/iOS
const config: CapacitorConfig = {
  appId: "fund.daric.app",
  appName: "100plan",
  webDir: "dist",
  backgroundColor: "#070b18",
  android: {
    backgroundColor: "#070b18",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: "#070b18",
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#070b18",
      showSpinner: false,
    },
  },
};

export default config;
