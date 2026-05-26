import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ash: "#070907",
        ink: "#101510",
        moss: "#8EE38C",
        fern: "#2FAE66",
        signal: "#FFB020",
        danger: "#FF5D5D"
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.38)"
      },
      opacity: {
        7: "0.07",
        8: "0.08",
        12: "0.12",
        14: "0.14",
        15: "0.15",
        35: "0.35",
        45: "0.45",
        55: "0.55",
        65: "0.65",
        92: "0.92",
        94: "0.94"
      }
    }
  },
  plugins: []
} satisfies Config;
