import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

/**
 * OGカード用の画像を動的生成する (Issue #62)。
 *
 * Slack / X / LINE などに craftcal.me を貼ったとき、
 * 裸のリンクではなくブランドとして見えるようにするためのもの。
 * app/layout.tsx の openGraph / twitter に自動で差し込まれる。
 *
 * 日本語を入れていない理由:
 *   ImageResponse (Satori) の既定フォントは日本語グリフを持たないため、
 *   フォントファイルを同梱して読み込ませない限り豆腐（□）になる。
 *   タグラインのためだけに数MBのフォントを積むのは割に合わないので、
 *   ワードマークと紙のモチーフだけで構成している。
 *   日本語を入れたくなったら、サブセット化したフォントを fonts オプションで渡す。
 */

export const alt = `${SITE_NAME} — 個人開発を短期集中で進めるためのスプリント管理ツール`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// アプリのアクセント色（Issue #67 でエメラルドから暖色のオリーブへ変更）。
// 起動画面のペン (components/LoadingScreen.tsx) と同じ値にしてブランドを揃える
const ACCENT = "#4d7c0f";
const ACCENT_DEEP = "#3f6212";
const INK = "#1c1917";
const MUTED = "#78716c";
const PAPER_LINE = "#d6d3d1";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#fffdf9",
          fontFamily: "sans-serif"
        }}
      >
        {/* 左端のブランドバー。起動画面のペンと同じオリーブ */}
        <div style={{ display: "flex", width: 24, background: ACCENT }} />

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 88px"
          }}
        >
          {/* ワードマーク。サイドバーのロゴと同じ字面（太字・字間つめ） */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 128,
                fontWeight: 700,
                letterSpacing: "-0.045em",
                color: INK,
                lineHeight: 1.1
              }}
            >
              {SITE_NAME}
            </div>
            {/* アクセント色の下線。ワードマークの幅より短くして「線を引いた」印象にする */}
            <div
              style={{
                display: "flex",
                width: 180,
                height: 8,
                background: ACCENT,
                marginTop: 28,
                borderRadius: 4
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 32,
                color: MUTED,
                marginTop: 28,
                letterSpacing: "0.02em"
              }}
            >
              craftcal.me
            </div>
          </div>

          {/* 紙のモチーフ。起動画面のイラストを簡略化したもの
              （Satori は複雑なSVGを扱いにくいので div の重ね合わせで表現する） */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 240,
              height: 300,
              background: "#fffdf9",
              border: `3px solid ${PAPER_LINE}`,
              borderRadius: 20,
              padding: 32,
              transform: "rotate(-4deg)"
            }}
          >
            {/* 手書きの線に見立てた3本。3本目だけ短くして書きかけを表す */}
            <div
              style={{ display: "flex", height: 12, width: "100%", background: PAPER_LINE, borderRadius: 6 }}
            />
            <div
              style={{
                display: "flex",
                height: 12,
                width: "100%",
                background: PAPER_LINE,
                borderRadius: 6,
                marginTop: 32
              }}
            />
            <div
              style={{
                display: "flex",
                height: 12,
                width: "60%",
                background: ACCENT_DEEP,
                borderRadius: 6,
                marginTop: 32
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
