import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        mint: {
          DEFAULT: "#34D399",
          50: "#ECFDF6",
          100: "#D1FAE5",
          600: "#059669"
        },
        "accent-blue": {
          DEFAULT: "#60A5FA",
          50: "#EFF6FF"
        },
        "accent-purple": {
          DEFAULT: "#A78BFA",
          50: "#F5F3FF"
        },
        "accent-amber": {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB"
        },
        "soft-rose": {
          DEFAULT: "#FB7185",
          50: "#FFF1F2"
        },
        "soft-sky": {
          DEFAULT: "#7DD3FC",
          50: "#F0F9FF"
        },
        // keep tailwind's default useful colors available
        slate: colors.slate,
        emerald: colors.emerald,
        violet: colors.violet,
        amber: colors.amber,
        sky: colors.sky,
        rose: colors.rose
      },
      boxShadow: {
        soft: "0 24px 80px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
