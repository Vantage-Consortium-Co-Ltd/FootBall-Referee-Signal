import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pitch: {
          DEFAULT: "#0F172A",
          dark: "#090D16",
          card: "#1E293B",
          border: "#334155",
        },
        referee: {
          yellow: "#FBBF24",
          red: "#EF4444",
          neon: "#22C55E",
          cyan: "#06B6D4",
        },
        apple: {
          "bg-dark": "#000000",
          "surface-dark": "#1C1C1E",
          "elevated-dark": "#2C2C2E",
          "bg-light": "#F5F5F7",
          "surface-light": "#FFFFFF",
          "surface2-light": "#F2F2F7",
          blue: "#007AFF",
          "blue-dark": "#0A84FF",
          green: "#34C759",
          "green-dark": "#30D158",
          orange: "#FF9500",
          "orange-dark": "#FF9F0A",
          red: "#FF3B30",
          "red-dark": "#FF453A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
