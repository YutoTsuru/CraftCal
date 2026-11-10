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
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, CheckSquare, Home, Rocket, Folder, LogOut, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";

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

        {/* ===== サイドバー下部: ログイン中のメールアドレス + ログアウトボタン =====
            mt-auto で常に一番下に貼り付ける */}
        <div className="mt-auto border-t border-stone-200 pt-3">
          {/* メールアドレス（長い場合は truncate で省略） */}
          <p className="mb-2 truncate px-1 text-xs text-stone-500" title={user?.email ?? ""}>
            {user?.email}
          </p>
          {/* 設定リンク (Issue #112)。ログアウトと同系の控えめなスタイルで、
              現在地でも強調はしない（日常的なナビではないため） */}
          <Link
            href="/settings"
            className="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-200 hover:text-stone-900"
          >
            <Settings size={18} />
            <span>設定</span>
          </Link>
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
          {/* 設定リンク (Issue #112)。ログアウトの左隣（right-12 = 44px + 余白）。
              下部ナビは5項目のままにするため、設定はヘッダーのアイコンで出す */}
          <Link
            href="/settings"
            aria-label="設定"
            className="absolute right-12 flex h-11 w-11 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-200 hover:text-stone-900"
          >
            <Settings size={20} />
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
      {/* Issue #112: カードと統計を減らした結果、80c779d で広げた余白が逆に空白として
          目立つようになったため一段詰める (lg: px-10/py-10 → px-8/py-8、モバイル: py-7 → py-6) */}
      <main className="w-full px-5 py-6 pb-28 lg:ml-56 lg:px-8 lg:py-8 lg:pb-8 content-above">
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
