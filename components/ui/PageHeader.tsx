/**
 * PageHeader: 全ページ共通のページ見出し (Issue #112)。
 *
 * 各ページ (app/xxx/page.tsx) の先頭で使う。
 * 左にタイトル(h1) 1行、右端に任意の操作 (actions) を置くだけのシンプルな部品。
 * 英語の eyebrow や説明文は置かない（情報を増やさず、余白で区切る方針）。
 */
export function PageHeader({
  title,
  actions
}: {
  title: string;
  /** 右端に置く操作（リンクや切替ボタンなど）。無ければ表示しない */
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <h1 className="text-xl font-bold tracking-tight text-stone-900">{title}</h1>
      {actions}
    </header>
  );
}

export default PageHeader;
