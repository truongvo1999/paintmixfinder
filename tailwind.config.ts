import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      boxShadow: {
        sheet: "0 -12px 24px -12px rgba(0,0,0,0.25)"
      }
    }
  },
  plugins: []
};

export default config;
