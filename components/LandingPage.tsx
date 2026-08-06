import Link from "next/link";
import { CalendarDays, Folder, ListChecks } from "lucide-react";
import { PenAndPaper } from "@/components/LoadingScreen";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * LandingPage: 未ログインの訪問者に向けた公開ページ (Issue #64)。
 *
 * 役割:
 *   検索エンジンとSNSに見せる唯一の実体。Issue #62 で SEO の土台は整えたが、
 *   インデックス対象の `/` にアプリ名とタグラインしか無く、評価される中身が無かった。
 *
 * 重要な制約:
 *   このコンポーネントは **サーバーコンポーネントのまま**にすること。
 *   AuthGate は loading=true から始まるため、認証ゲートの内側に置くと
 *   SSR のHTMLが起動画面になり、クローラが本文を読めなくなる。
 *   そのため app/page.tsx から直接描画し、AuthGate は `/` を素通しさせている。
 *
 * イラストは LoadingScreen.tsx の PenAndPaper を共有（起動画面と同じ絵で印象を揃える）。
 */

// 紹介する機能。実装を確認した内容だけを書く
// （README の「localStorage保存」は Supabase 移行前の記述で実態と食い違うため使わない）
const FEATURES = [
  {
    icon: Folder,
    title: "プロジェクト単位で積む",
    body: "作りたいものごとにプロジェクトを作り、説明文からタスクの候補を出せる。ゴールと進捗が一目で分かる。"
  },
  {
    icon: CalendarDays,
    title: "カレンダーに置いて決める",
    body: "月表示と週表示を切り替えながら、タスクを日付へドラッグして配置。なぞって期間を指定したり、バーの端を引いて期間を伸縮できる。"
  },
  {
    icon: ListChecks,
    title: "今日やることに集中する",
    body: "配置済みのタスクから今日ぶんだけを取り出して表示。完了を記録すると作業ログと実績に積み上がる。"
  }
];

// 使い始めの流れ。順序に意味があるので番号を振っている
const STEPS = [
  { n: "1", title: "プロジェクトを作る", body: "作りたいものと、達成したいゴールを書く。" },
  { n: "2", title: "タスクに割る", body: "手を動かせる単位まで分解する。説明文から候補を出すこともできる。" },
  { n: "3", title: "カレンダーに置く", body: "いつやるかを決める。決めた日が来たら今日の一覧に出てくる。" }
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ヘッダー: ワードマークとログイン導線だけの軽いもの */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold tracking-tight text-stone-900">{SITE_NAME}</span>
        <Link
          href="/login"
          className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-surface hover:text-stone-900"
        >
          ログイン
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {/* ヒーロー。h1 は検索結果とスクリーンリーダーの両方で見出しになるため、
            ワードマークではなく「何ができるか」を置く */}
        <section className="grid items-center gap-10 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div className="flex flex-col items-start gap-6">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-stone-900 md:text-5xl">
              「いつかやる」を、
              <br />
              「今日やる」に。
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-stone-600">
              作りたいものをタスクに分解し、カレンダーに置いて、今日ぶんだけに集中する。{SITE_DESCRIPTION}です。
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-lime-700 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-lime-800"
              >
                無料ではじめる
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-stone-300 bg-surface px-6 py-3 font-medium text-stone-700 transition hover:border-stone-400"
              >
                ログイン
              </Link>
            </div>
          </div>

          {/* 起動画面と同じイラスト。装飾なので支援技術からは隠れている（PenAndPaper 側で aria-hidden 済み） */}
          <div className="hidden justify-center md:flex">
            <PenAndPaper width={260} height={224} />
          </div>
        </section>

        {/* 機能 */}
        <section className="py-12">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">できること</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-xl border border-stone-200 bg-surface p-5 shadow-sm"
                >
                  <Icon size={22} className="text-lime-700" aria-hidden="true" />
                  <h3 className="mt-3 font-bold text-stone-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* 使い方。ol にして順序を構造としても表現する */}
        <section className="py-12">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">使い方</h2>
          <ol className="mt-7 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="rounded-xl border border-stone-200 bg-surface p-5 shadow-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-700 text-sm font-bold text-white">
                  {step.n}
                </span>
                <h3 className="mt-3 font-bold text-stone-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 末尾の導線 */}
        <section className="py-14">
          <div className="rounded-xl border border-lime-200 bg-lime-50 px-6 py-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              今日ぶんを決めるところから
            </h2>
            <p className="mx-auto mt-3 max-w-md text-stone-600">
              アカウントを作れば、すぐにプロジェクトを立てて使いはじめられます。
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-xl bg-lime-700 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-lime-800"
            >
              無料ではじめる
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-6 text-sm text-stone-500">
          <span>{SITE_NAME}</span>
          <a
            href="https://github.com/YutoTsuru/CraftCal"
            className="transition hover:text-stone-700"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
