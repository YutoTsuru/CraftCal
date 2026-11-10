/**
 * PageHeader: 全ページ共通のページ見出し (Issue #112)。
 *
 * 各ページ (app/xxx/page.tsx) の先頭で使う。
 * 左にタイトル(h1) 1行、右端に任意の操作 (actions) を置くだけのシンプルな部品。
 * 英語の eyebrow や説明文は置かない（情報を増やさず、余白で区切る方針）。
 * onBack を渡したページ（現状は設定ページ）だけ、h1 の左に「戻る」ボタンを出す。
 */
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  actions,
  onBack
}: {
  title: string;
  /** 右端に置く操作（リンクや切替ボタンなど）。無ければ表示しない */
  actions?: React.ReactNode;
  /** 指定すると h1 の左に戻るボタンを表示し、押下時にこの関数を呼ぶ。省略時は表示しない */
  onBack?: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      {/* 左側: （任意の）戻るボタン + タイトル。ボタンが縮まないよう shrink-0 */}
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="戻る"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-surface text-stone-600 transition hover:bg-stone-100"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold tracking-tight text-stone-900">{title}</h1>
      </div>
      {actions}
    </header>
  );
}

export default PageHeader;
