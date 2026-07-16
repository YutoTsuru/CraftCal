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
export function LoadingScreen({ message = "Loading" }: { message?: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6"
      role="status"
      aria-live="polite"
      aria-label={`${message}…`}
    >
      {/* 紙とペンのイラスト。viewBox 120x100 の中に紙・手書き線・ペンを配置する */}
      <svg
        width="140"
        height="120"
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

        {/* ペン: emerald-600 の軸 + 濃いペン先。keyframes で行をなぞるように translate/rotate する。
            transform-origin をペン先付近にして、書いている手の動きに近づける */}
        <g className="loading-pen" style={{ transformOrigin: "70px 60px" }}>
          {/* 軸（斜めのカプセル形） */}
          <rect x="66" y="24" width="8" height="34" rx="4" fill="#059669" transform="rotate(35 70 41)" />
          {/* 持ち手側の端（濃い緑のキャップ） */}
          <rect x="66" y="20" width="8" height="8" rx="3" fill="#047857" transform="rotate(35 70 24)" />
          {/* ペン先（濃い三角形） */}
          <path d="M60 58 L64 53 L67 57 Z" fill="#1e293b" transform="rotate(35 63 56)" />
        </g>
      </svg>

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
