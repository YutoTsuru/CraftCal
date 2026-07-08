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
 * - タブは 3〜5 個が上限とされるため、6 画面のうち Dashboard はロゴタップに割り当てて 5 個に絞った
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckSquare, Home, Rocket, Folder, Sun } from "lucide-react";
import { motion } from "framer-motion";

// デスクトップのサイドバーに出す項目（6画面すべて）
const sidebarItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/sprint", label: "Sprint", icon: Rocket },
  { href: "/projects", label: "Projects", icon: Folder }
];

// モバイルのボトムタブに出す項目（5個まで）。
// Dashboard はタブに入れず、ヘッダーのロゴタップで開く。
// 並び順 = タブの表示順。よく使う「今日」を先頭にしている。
const tabItems = sidebarItems.filter((item) => item.href !== "/");

export function LayoutShell({ children }: { children: React.ReactNode }) {
  // 現在のURLパス。ナビの「今いる画面」をハイライトする判定に使う
  const pathname = usePathname();

  return (
    <div className="min-h-screen lg:flex">
      {/* 背景の飾り（グリッド模様と動くブロブ）。操作には関係しない */}
      <div className="bg-visuals" aria-hidden>
        <div className="bg-grid" />
        <div className="blob blob--a" />
        <div className="blob blob--b" />
        <div className="blob blob--c" />
      </div>

      {/* ===== デスクトップ用: 左固定サイドバー (lg 以上でのみ表示) ===== */}
      <aside className="hidden lg:block border-slate-200 bg-white px-3 py-3 lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:border-r">
        {/* ロゴ。クリックでダッシュボード (/) へ */}
        <div className="mb-6">
          <Link href="/" className="block">
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
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ===== モバイル用: 上部の薄いヘッダー (lg 未満でのみ表示) =====
          ナビはここには置かず、ロゴだけにして縦スペースを節約する。
          ロゴタップでダッシュボード (/) へ移動できる */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-center px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
            CraftCal
          </Link>
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
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
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
                  active ? "text-emerald-600 font-semibold" : "text-slate-500 hover:text-slate-800"
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
