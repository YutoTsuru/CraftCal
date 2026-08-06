/**
 * SplashScreen: アプリ起動時の全画面表示 (Issue #59)。
 *
 * 役割:
 *   起動してからアプリ本体が出るまでの数秒に、アプリ名とタグラインを見せる。
 *   従来は LoadingScreen（紙とペン + 「Loading…」）だけで、ブランド表現が一切なく
 *   「何のアプリを開いたのか分からないまま待たされる」状態だった。
 *
 * LoadingScreen との使い分け:
 *   - SplashScreen … 起動の瞬間。セッション判定中・初回データ読み込み中
 *     (components/AuthGate.tsx / components/AppProvider.tsx)
 *   - LoadingScreen … アプリ内の待ち時間。ページ遷移中・ログイン処理中
 *     (app/loading.tsx / app/auth/callback/page.tsx)
 *   ページ遷移のたびに大きなブランド演出が出ると邪魔なので、そちらは従来のまま。
 *
 * イラストは LoadingScreen.tsx の PenAndPaper を共有して使う（SVGを複製しない）。
 * フェードインの keyframes は app/globals.css の .splash-* に定義していて、
 * prefers-reduced-motion: reduce のときは globals.css 側で止まる。
 */

import { PenAndPaper } from "@/components/LoadingScreen";

// タグライン。app/layout.tsx の metadata.description と同じ文言にして表記を揃える
const TAGLINE = "個人開発を短期集中で進めるためのスプリント管理ツール";

export function SplashScreen() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-5 px-6"
      role="status"
      aria-live="polite"
      aria-label="起動中…"
    >
      {/* イラスト。起動画面では待ち時間表示より少し大きめに出す */}
      <div className="splash-fade">
        <PenAndPaper width={168} height={144} />
      </div>

      {/* ワードマーク。サイドバー (components/LayoutShell.tsx) のロゴと同じ字面に揃える */}
      <h1 className="splash-fade splash-fade-delay-1 text-4xl font-bold tracking-tight text-stone-900">
        CraftCal
      </h1>

      {/* タグライン。スマホで2行に折れても中央で揃うようにする */}
      <p className="splash-fade splash-fade-delay-2 max-w-xs text-center text-sm text-stone-500">
        {TAGLINE}
      </p>
    </div>
  );
}

export default SplashScreen;
