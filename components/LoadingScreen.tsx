/**
 * LoadingScreen: 全画面ローディング表示。
 * 紙とペンの SVG イラストが「文字を書いている」演出を見せ、その下に「Loading…」テキストを出す。
 * 認証確認中・ログイン処理中・初回データ読み込み中など、待ち時間の共通表示として使う。
 *
 * アニメーション本体（keyframes）は app/globals.css の .loading-* クラスに定義している。
 * prefers-reduced-motion: reduce のときは globals.css 側で全アニメーションを止め、静止画+テキストになる。
 *
 * message: テキスト行の文言。既定は "Loading"（末尾の明滅ドット3つは常に付く）。
 */
/**
 * PenAndPaper: 紙とペンが「文字を書いている」演出の SVG イラスト本体。
 *
 * LoadingScreen と SplashScreen (Issue #59) の両方から使うため、
 * 60行ほどある SVG を二重管理しないようここに切り出して共有している。
 * サイズだけ呼び出し側から変えられるようにしてある（起動画面では大きめに出す）。
 */
export function PenAndPaper({ width = 140, height = 120 }: { width?: number; height?: number }) {
  return (
    // viewBox 120x100 の中に紙・手書き線・ペンを配置する
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
        {/* 紙: 白の角丸長方形 + 薄い影。少しだけ傾けて可愛らしく見せる */}
        <g transform="rotate(-4 60 52)">
          {/* 影（紙の少し下に薄く敷く） */}
          <rect x="28" y="20" width="64" height="72" rx="8" fill="#0f172a" opacity="0.06" />
          {/* 紙本体 */}
          <rect x="26" y="16" width="64" height="72" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />

          {/* 手書きの3本線。stroke-dasharray/dashoffset で順番に左→右へ伸びる */}
          <line
            className="loading-line loading-line-1"
            x1="36"
            y1="34"
            x2="80"
            y2="34"
            stroke="#cbd5e1"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            className="loading-line loading-line-2"
            x1="36"
            y1="50"
            x2="80"
            y2="50"
            stroke="#cbd5e1"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            className="loading-line loading-line-3"
            x1="36"
            y1="66"
            x2="68"
            y2="66"
            stroke="#cbd5e1"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* ペン: 45度で紙に当たるコンパクトな鉛筆。ペン先の頂点は (63,56) で、
            globals.css の loading-pen keyframes がこの点を手書き線の上へ移動させる。
            紙 (64x72) に対して大きくなりすぎないよう全長 26px 程度に抑えている */}
        <g className="loading-pen" style={{ transformOrigin: "63px 56px" }}>
          {/* ペン先（木の削り部分: 薄いベージュ） */}
          <path d="M63 56 L66.2 49.6 L69.4 52.8 Z" fill="#d6c6a8" />
          {/* 芯（先端の小さな三角） */}
          <path d="M63 56 L64.2 53.6 L65.4 54.8 Z" fill="#1e293b" />
          {/* 軸（emerald の平行四辺形。45度で上右方向へ） */}
          <path d="M66.2 49.6 L69.4 52.8 L80.7 41.5 L77.5 38.3 Z" fill="#059669" />
          {/* 尻のキャップ（濃い緑） */}
          <path d="M77.5 38.3 L80.7 41.5 L83.3 38.9 L80.1 35.7 Z" fill="#047857" />
        </g>
    </svg>
  );
}

export function LoadingScreen({ message = "Loading" }: { message?: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6"
      role="status"
      aria-live="polite"
      aria-label={`${message}…`}
    >
      <PenAndPaper />

      {/* テキスト行。message + 明滅するドット3つ */}
      <p className="flex items-center text-sm font-medium text-slate-500">
        <span>{message}</span>
        {/* ドットは専用ラッパ内に置く（nth-child で delay をずらして順に明滅させるため） */}
        <span className="loading-dots" aria-hidden="true">
          <span className="loading-dot">.</span>
          <span className="loading-dot">.</span>
          <span className="loading-dot">.</span>
        </span>
      </p>
    </div>
  );
}
