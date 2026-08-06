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
 * ナビの並び順は利用フロー順にしている (Issue #27):
 * Home（今日の確認）→ Projects（登録）→ Tasks（管理）→ Sprint（AI計画）→ Calendar（確認）。
 * Today は統合ホーム (/) に統合したため項目から外した。
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, CheckSquare, Home, Rocket, Folder, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";

// ナビ項目（5画面）。サイドバー・ボトムタブで共通に使う。
// 並び順 = 利用フロー順（Home → Projects → Tasks → Sprint → Calendar）
const sidebarItems = [
  // Issue #64: ダッシュボードは / から /home に移動（/ は公開ランディング）
  { href: "/home", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/sprint", label: "Sprint", icon: Rocket },
  { href: "/calendar", label: "Calendar", icon: CalendarDays }
];

// モバイルのボトムタブに出す項目。
// タブは5個までが上限のため、5画面をそのまま表示する（Home もタブに含める）。
const tabItems = sidebarItems;

export function LayoutShell({ children }: { children: React.ReactNode }) {
  // 現在のURLパス。ナビの「今いる画面」をハイライトする判定に使う
  const pathname = usePathname();
  const router = useRouter();
  // ログイン中のユーザー情報とログアウト操作（サイドバー下部・モバイルヘッダーで使う）
  const { user, signOut } = useAuth();

  // ログアウト → ログイン画面へ戻す
  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen lg:flex">
      {/* 背景の飾り（グリッド模様と動くブロブ）。操作には関係しない */}
      <div className="bg-visuals" aria-hidden>
        <div className="bg-grid" />
        <div className="blob blob--a" />
        <div className="blob blob--b" />
        <div className="blob blob--c" />
      </div>

      {/* ===== デスクトップ用: 左固定サイドバー (lg 以上でのみ表示) =====
          flex-col にしてナビを上、ユーザー情報+ログアウトを下端 (mt-auto) に配置する */}
      <aside className="hidden lg:flex lg:flex-col border-stone-200 bg-surface px-3 py-3 lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:border-r">
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
                    ? "bg-emerald-600 text-white shadow-md" // 現在の画面: 緑背景で強調
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ===== サイドバー下部: ログイン中のメールアドレス + ログアウトボタン =====
            mt-auto で常に一番下に貼り付ける */}
        <div className="mt-auto border-t border-stone-200 pt-3">
          {/* メールアドレス（長い場合は truncate で省略） */}
          <p className="mb-2 truncate px-1 text-xs text-stone-500" title={user?.email ?? ""}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-200 hover:text-stone-900"
          >
            <LogOut size={18} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* ===== モバイル用: 上部の薄いヘッダー (lg 未満でのみ表示) =====
          ナビはここには置かず、ロゴだけにして縦スペースを節約する。
          ロゴタップでダッシュボード (/) へ移動できる */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-stone-200 bg-surface/90 backdrop-blur">
        {/* relative + 中央絶対配置のロゴ。右端にログアウトアイコンボタンを置く */}
        <div className="relative flex items-center justify-center px-2 py-3">
          <Link href="/home" className="text-lg font-bold tracking-tight text-stone-900">
            CraftCal
          </Link>
          {/* ログアウトボタン。タップ領域 44px を確保 (h-11 w-11) */}
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="ログアウト"
            className="absolute right-1 flex h-11 w-11 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-200 hover:text-stone-900"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* ===== メインコンテンツ =====
          - lg:ml-56 はデスクトップでサイドバー幅 (w-56) の分だけ右にずらすため
          - pb-24 はモバイルでボトムタブバー (高さ約64px) にコンテンツが隠れないための下余白 */}
      <main className="w-full px-4 py-6 pb-24 lg:ml-56 lg:px-8 lg:py-8 lg:pb-8 content-above">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="mx-auto max-w-6xl"
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
                  active ? "text-emerald-600 font-semibold" : "text-stone-500 hover:text-stone-800"
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
