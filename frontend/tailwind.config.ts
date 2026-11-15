import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
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
      },
    },
  },
  plugins: [],
};
export default config;
