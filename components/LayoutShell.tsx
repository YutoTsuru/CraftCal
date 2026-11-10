"use client";

/**
 * LayoutShell: 全ページ共通の「枠」を作るコンポーネント。
 * app/layout.tsx から呼ばれ、children に各ページ (app/xxx/page.tsx) の中身が入る。
 *
 * 画面構成は画面幅で切り替える（Tailwind の lg: = 1024px 以上がデスクトップ扱い）:
 * - デスクトップ: 左に固定サイドバー、右にメインコンテンツ
 * - モバイル:     上に薄いヘッダー（ロゴのみ）、下に固定のボトムタブバー
 *
 * ボトムタブバーにした理由 (Issue #13 の調査より):
 * - スマホは画面下 1/3 が親指で最も届きやすい（サムゾーン）
 * - タブは 3〜5 個が上限とされるため、ちょうど 5 画面（Home 含む）に収まる
 *
 * ナビの並び順は Issue #112 で「毎日使う順」に変更:
 * ホーム → タスク → カレンダー → プロジェクト → アシスタント。
 * 設定 (/settings) はナビ項目ではなく、サイドバー下部 / モバイルヘッダー右のリンクで出す。
 *
 * Issue #112 追加: PC幅の余白対策として、デスクトップのサイドバーは「既定で閉」にし、
 * 左上の固定トグルボタン / Ctrl+\ で開閉できるようにした（開閉状態は localStorage に記憶）。
 * 参考: Notion は Ctrl+\ で開閉し、開閉状態を覚えておくのが定番のマナー。
 * この開閉はデスクトップ (lg 以上) だけの概念で、モバイルの下部タブ + ヘッダーは変更しない。
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckSquare, Home, Rocket, Folder, PanelLeft, Settings } from "lucide-react";
import { motion } from "framer-motion";

// ナビ項目（5画面）。サイドバー・ボトムタブで共通に使う。
// Issue #112: ラベルを日本語化し、並びを「毎日使う順」（ホーム → タスク → カレンダー → プロジェクト → アシスタント）に変更
const sidebarItems = [
  // Issue #64: ダッシュボードは / から /home に移動（/ は公開ランディング）
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/tasks", label: "タスク", icon: CheckSquare },
  { href: "/calendar", label: "カレンダー", icon: CalendarDays },
  { href: "/projects", label: "プロジェクト", icon: Folder },
  { href: "/sprint", label: "アシスタント", icon: Rocket }
];

// モバイルのボトムタブに出す項目。
// タブは5個までが上限のため、5画面をそのまま表示する（Home もタブに含める）。
const tabItems = sidebarItems;

// サイドバー開閉状態の保存キー（"1" = 開 / "0" = 閉）
const SIDEBAR_STORAGE_KEY = "craftcal-sidebar-open";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  // 現在のURLパス。ナビの「今いる画面」をハイライトする判定に使う
  const pathname = usePathname();

  // PC のサイドバー開閉状態。既定は閉（サイドバーなしが基本）。
  // 実際の値はマウント後に localStorage から復元する（下の useEffect）。
  // 連動 UI: トグルボタン / aside / main の左マージン
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // マウント後に1回だけ、記憶していた開閉状態を読み込む。
  // useState の初期値で読まないのは、SSR (サーバー描画) では localStorage が無く、
  // クライアント初回描画と HTML が食い違うハイドレーション不一致を避けるため。
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1") setSidebarOpen(true);
    } catch {
      // プライベートモード等で localStorage が throw しても、既定(閉)のまま動かす
    }
  }, []);

  // 開閉トグル（1つに集約）。呼び出し元: 固定トグルボタンの onClick と Ctrl+\ ショートカット。
  // 書き込みはトグル時のみ。state 更新関数の中では副作用を避けたいので、次の値をここで計算する
  const toggleSidebar = useCallback(() => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // 保存できなくても開閉自体は有効（次回は既定の閉に戻るだけ）
    }
  }, [sidebarOpen]);

  // キーボードショートカット: Ctrl+\ で開閉（Notion と同じ操作感）。
  // 入力欄 (input/textarea/select) にフォーカス中は誤爆を避けるため無視する
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && e.key === "\\")) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      e.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  return (
    <div className="min-h-screen lg:flex">
      {/* 背景の飾り（グリッド模様と動くブロブ）。操作には関係しない */}
      <div className="bg-visuals" aria-hidden>
        <div className="bg-grid" />
        <div className="blob blob--a" />
        <div className="blob blob--b" />
        <div className="blob blob--c" />
      </div>

      {/* ===== デスクトップ用: サイドバー開閉トグル (lg 以上でのみ表示) =====
          左上に固定。サイドバーが開いていても同じ位置に出続け、aside (z-40) の上に重なって
          「閉じるボタン」として働く (z-50)。Ctrl+\ でも同じ操作ができる */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="サイドバーを開閉"
        aria-expanded={sidebarOpen}
        className="hidden lg:flex fixed left-4 top-4 z-50 h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-surface text-stone-600 shadow-sm transition hover:bg-stone-100"
      >
        <PanelLeft size={20} />
      </button>

      {/* ===== デスクトップ用: 左固定サイドバー (lg 以上でのみ表示) =====
          flex-col にしてナビを上、ユーザー情報+ログアウトを下端 (mt-auto) に配置する。
          Issue #112: DOM には常に存在させ、transform でスライド開閉する
          (開: translate-x-0 / 閉: -translate-x-full)。
          lg:pt-16 は左上の固定トグルボタン (top-4 + 40px) とロゴが重ならないよう下げるため。
          閉のときは aria-hidden + pointer-events-none でスクリーンリーダーとクリックから外し、
          inert で Tab キーのフォーカスも入らないようにする（React 19 から真偽値で指定可能）。 */}
      <aside
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
        className={`hidden lg:flex lg:flex-col border-stone-200 bg-surface px-3 py-3 lg:pt-16 z-40 lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:border-r transition-transform duration-200 ${
          sidebarOpen ? "lg:translate-x-0" : "lg:-translate-x-full lg:pointer-events-none"
        }`}
      >
        {/* ロゴ。クリックでダッシュボード (/) へ */}
        <div className="mb-6">
          <Link href="/home" className="block">
            <h1 className="text-2xl font-bold tracking-tight">CraftCal</h1>
          </Link>
        </div>

        {/* サイドバーのナビ項目（縦並び） */}
        <nav className="flex flex-col gap-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? "bg-lime-700 text-white shadow-md" // 現在の画面: 緑背景で強調
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ===== サイドバー下部: 設定リンクのみ =====
            mt-auto で常に一番下に貼り付ける。
            メールアドレス表示とログアウトは、モバイルでの誤タップ防止のため設定ページの
            「アカウント」セクションへ移した（PC・モバイルで置き場所を揃える） */}
        <div className="mt-auto border-t border-stone-200 pt-3">
          {/* 設定リンク (Issue #112)。控えめなスタイルで、
              現在地でも強調はしない（日常的なナビではないため） */}
          <Link
            href="/settings"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-200 hover:text-stone-900"
          >
            <Settings size={18} />
            <span>設定</span>
          </Link>
        </div>
      </aside>

      {/* ===== モバイル用: 上部の薄いヘッダー (lg 未満でのみ表示) =====
          ナビはここには置かず、ロゴだけにして縦スペースを節約する。
          ロゴタップでダッシュボード (/) へ移動できる */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-stone-200 bg-surface/90 backdrop-blur">
        {/* relative + 中央絶対配置のロゴ。右端に設定アイコンだけを置く */}
        <div className="relative flex items-center justify-center px-2 py-3">
          <Link href="/home" className="text-lg font-bold tracking-tight text-stone-900">
            CraftCal
          </Link>
          {/* 設定リンク (Issue #112)。下部ナビは5項目のままにするため、設定はヘッダーのアイコンで出す。
              ログアウトは、以前ここの隣にあって誤タップしやすかったため設定ページの「アカウント」へ移した。
              これでヘッダーには歯車1個だけが残り、誤タップの構造自体がなくなる。
              タップ領域 44px を確保 (h-11 w-11) */}
          <Link
            href="/settings"
            aria-label="設定"
            className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-200 hover:text-stone-900"
          >
            <Settings size={20} />
          </Link>
        </div>
      </header>

      {/* ===== メインコンテンツ =====
          - lg:ml-56 はデスクトップでサイドバー幅 (w-56) の分だけ右にずらすため
          - pb-24 はモバイルでボトムタブバー (高さ約64px) にコンテンツが隠れないための下余白 */}
      {/* Issue #112: カードと統計を減らした結果、80c779d で広げた余白が逆に空白として
          目立つようになったため一段詰める (lg: px-10/py-10 → px-8/py-8、モバイル: py-7 → py-6) */}
      {/* Issue #112 (サイドバー開閉): サイドバーが開のときだけ lg:ml-56 で幅ぶん右にずらす。
          閉のときは lg:ml-0 にし、左上の固定トグルボタン (left-4 + 40px) と見出しが重ならないよう
          lg:pl-16 で左を空ける（px-8 の左 padding を上書き）。
          transition-[margin,padding] + duration-200 で aside のスライドと同期してなめらかに動かす */}
      <main
        className={`w-full px-5 py-6 pb-28 lg:px-8 lg:py-8 lg:pb-8 content-above transition-[margin,padding] duration-200 ${
          sidebarOpen ? "lg:ml-56" : "lg:ml-0 lg:pl-16"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          // Issue #112: ユーザー決定「PC全画面でも余白を出さない」ため、
          // mx-auto max-w-6xl（最大幅 + 中央寄せ）を撤廃して完全フルードにした
        >
          {children}
        </motion.div>
      </main>

      {/* ===== モバイル用: 画面下固定のボトムタブバー (lg 未満でのみ表示) =====
          - fixed bottom-0 で常に画面下に張り付く
          - pb-[env(safe-area-inset-bottom)] は iPhone のホームバー領域を避けるための余白 */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
        aria-label="メインナビゲーション"
      >
        <div className="grid grid-cols-5">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                // min-h-[56px]: タップ領域を44px以上確保するため (Issue #13 の調査より)
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] transition ${
                  active ? "text-lime-700 font-semibold" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
