import type { Config } from "tailwindcss";

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
        surface: "#fffdf9"
        // Issue #69: mint / accent-blue / accent-purple / accent-amber / soft-rose / soft-sky を削除した。
        // すべて未使用になったうえ、独自カラー名だったため Issue #67 の暖色化（slate→stone の
        // 一括置換）から漏れて寒色が残る原因になっていた。定義を消して再混入を防ぐ。
        //
        // slate / emerald などを再エクスポートしていた行も削除した。
        // theme.extend.colors は Tailwind の既定パレットを保持するため、元々不要だった。
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
