import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // カード面（暖かい白）。以前は #ffffff で、下地 #f8fafc（slate-50）との
        // 明度差がほぼ無く、カードの輪郭が消えて「白ばかりで見にくい」状態だった。
        // 下地は app/globals.css の html/body 側で暖色に落としてある（#f5f0e9）。
        // この値は lib/colors.ts の SURFACE_COLOR と一致させること
        // （パレットのコントラスト検証がこの背景色を前提にしているため。テストで固定している）。
        surface: "#fffdf9",
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
        // 影も寒色（slate-900 系）から暖色（stone-900 系）へ。
        // 暖色の下地に寒色の影が落ちると灰色く濁って見えるため
        soft: "0 24px 80px rgba(28, 25, 23, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
