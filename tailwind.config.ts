import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        base: "#f4f7fb",
        panel: "#ffffffd9",
        ink: "#0f1c2e",
        accent: "#1f7a8c",
        warm: "#f59e0b"
      },
      boxShadow: {
        glass: "0 10px 30px rgba(15, 28, 46, 0.08)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
