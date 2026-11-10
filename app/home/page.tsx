"use client";

// Home = 「今日」ビュー (Issue #112)。
// 上から: 日付ヘッダー → 取り込み/サンプル案内 → 期限アラート帯 → 今日のリスト → アクティビティ → 最近の作業ログ。
// 【統計カード廃止の理由】以前は「全タスク/進行中/今日のタスク/期限間近」の4枚やプロジェクト進捗、
// 達成バッジが並んでいたが、開いて"今日何をするか"を知るのに不要な集計が主役を奪っていた。
// そのため集計は廃止し、連続日数・今週の作業日数だけを日付ヘッダー右に小さく残した。
// 全データ削除 (DangerZone) は /settings に移設済み。

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import TodaySection from "@/components/home/TodaySection";
import ActivityGrid from "@/components/ActivityGrid";
import RecentLogs from "@/components/RecentLogs";
import { getAllLogs } from "@/lib/dailyLogs";
import { getTodayString } from "@/lib/schedule";
import { getStreakDays, getThisWeekWorkDays } from "@/lib/stats";
import { selectDueSoonTasks, type DueSeverity } from "@/lib/due-status";
import type { DailyLog } from "@/types/dev-calendar";

/**
 * 期限の危険度ごとの見た目 (Issue #69)。
 * 色だけに頼らず、「今日まで」「2日超過」などの文言と併記して危険度を伝える方針。
 * Home ではアラート帯の文字色に使う。
 */
const DUE_TONE: Record<DueSeverity, { row: string; label: string }> = {
  overdue: { row: "border-stone-200 border-l-rose-600 bg-rose-50/60", label: "text-rose-700" },
  today: { row: "border-stone-200 border-l-rose-500 bg-rose-50/40", label: "text-rose-700" },
  soon: { row: "border-stone-200 border-l-amber-500 bg-amber-50/40", label: "text-amber-800" },
  upcoming: { row: "border-stone-200 border-l-stone-300", label: "text-stone-600" }
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "YYYY-MM-DD" → 「11月10日（月）」。ローカル日付として Date に起こす（UTC ズレ防止） */
function formatJapaneseDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${month}月${day}日（${WEEKDAYS[date.getDay()]}）`;
}

export default function HomePage() {
  const { tasks, seedSampleData } = useDevCalendar();
  const { canImportLocalData, importLocalData } = useDevCalendar();

  // 取り込みボタンの二度押し防止。取り込み成功でカード自体が消えるため false へ戻す必要はない
  const [importing, setImporting] = useState(false);

  const today = getTodayString();

  // ライブ時計 (HH:MM)。日付ヘッダーの時刻表示に使う。
  // 表示は1分精度だが、分の切り替わりを遅らせないよう1秒ごとに現在時刻を見直す。
  // マウント前は null のまま（SSR とのズレ防止）。アンマウント時に clearInterval で止める
  const [clock, setClock] = useState<string | null>(null);
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // 作業ログは localStorage にあり SSR 中は読めないため、マウント後に useEffect で読む。
  // tasks を依存に入れるのは、完了操作などの後にも最新へ更新するため（旧 StatsCard と同じ）
  const [logs, setLogs] = useState<DailyLog[]>([]);
  useEffect(() => {
    setLogs(getAllLogs());
  }, [tasks]);
  const streak = useMemo(() => getStreakDays(logs, today), [logs, today]);
  const weekDays = useMemo(() => getThisWeekWorkDays(logs, today), [logs, today]);

  // Issue #69: 期限の判定は lib/due-status.ts。超過タスクも含め、危険な順に並ぶ。
  // アラート帯には overdue / today だけを使う（soon 以降は /tasks で確認すれば足りる）
  const alertTasks = useMemo(
    () => selectDueSoonTasks(tasks, today).filter((d) => d.due.severity === "overdue" || d.due.severity === "today"),
    [tasks, today]
  );
  // 右レール「期限が近いタスク」用（超過含む・最大6件）
  const dueSoonList = useMemo(() => selectDueSoonTasks(tasks, today, { limit: 6 }), [tasks, today]);
  const overdueCount = alertTasks.filter((d) => d.due.severity === "overdue").length;
  const todayDueCount = alertTasks.length - overdueCount;

  return (
    <div className="grid gap-6">
      {/* 日付ヘッダー: 左に今日の日付 + 現在時刻（大きく）、右に連続日数・今週の作業日数（小さく） */}
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        {/* 時間を意識して作業するため、日付と時刻を大きく表示する。
            時刻はマウント前(null)は出さない（SSR と初回描画の不一致を避ける） */}
        <h2 className="text-2xl font-bold tabular-nums sm:text-3xl">
          {formatJapaneseDate(today)}
          {clock !== null && <span className="ml-4">{clock}</span>}
        </h2>
        <p className="text-sm text-stone-500">🔥 連続{streak}日 ・ 今週{weekDays}日</p>
      </header>

      {/* 以前このブラウザ (localStorage) に保存したデータが見つかったときの取り込み案内カード。
          サンプルカードと同型 (アクセント色)。取り込み後は canImportLocalData が false になり自動で消える。
          サンプルカードより優先し、両方は同時に出さない */}
      {canImportLocalData && (
        <section className="rounded-xl border border-dashed border-lime-300 bg-lime-50/60 p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-lime-950">
                <Sparkles size={18} />
                以前このブラウザに保存したデータが見つかりました
              </h3>
              <p className="mt-1 text-sm text-lime-900">
                ログイン前にこのブラウザへ保存したタスク・プロジェクトを、あなたのアカウントに取り込めます。
              </p>
            </div>
            <button
              onClick={() => {
                setImporting(true);
                importLocalData();
              }}
              disabled={importing}
              className="shrink-0 rounded-xl bg-lime-700 px-4 py-2.5 font-semibold text-white transition hover:bg-lime-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? "取り込み中..." : "データを取り込む"}
            </button>
          </div>
        </section>
      )}

      {/* サンプルデータの案内カード。
          タスクが1件もない（初回アクセスやリセット直後）ときだけ表示される。
          ただし取り込みカードを出しているときは重複を避けて非表示にする。
          ボタンを押すと AppProvider の seedSampleData() が lib/seed-data.ts のデータを投入する */}
      {tasks.length === 0 && !canImportLocalData && (
        <section className="rounded-xl border border-dashed border-lime-300 bg-lime-50/60 p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-lime-950">
                <Sparkles size={18} />
                まずはサンプルデータで試してみる
              </h3>
              <p className="mt-1 text-sm text-lime-900">
                CraftCal自身の開発タスク（実際のGitHub Issue）とモックプロジェクトを読み込んで、各画面の使い方を確認できます。
              </p>
            </div>
            <button
              onClick={seedSampleData}
              className="shrink-0 rounded-xl bg-lime-700 px-4 py-2.5 font-semibold text-white transition hover:bg-lime-600"
            >
              サンプルデータを読み込む
            </button>
          </div>
        </section>
      )}

      {/* PC幅では「今日やること」(左) と ふり返り系 (右レール) の2カラムにする (Issue #112)。
          縦1列のままだと PC では草の右側や画面下部が大きく空いてしまうため。
          モバイルは従来どおり縦積み（アラート → 今日 → アクティビティ → ログ の順） */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:items-start">
        {/* 左: 今日やること（メイン） */}
        <div className="grid min-w-0 gap-6">
          {/* 期限アラート帯: 期限切れ・今日が期限のタスクがあるときだけ表示する。
              色（rose）だけでなく「期限切れN件・今日が期限N件」の文言でも伝える (Issue #69 の二重表現を踏襲) */}
          {alertTasks.length > 0 && (
            <Link
              href="/tasks"
              className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm"
            >
              <span className={`shrink-0 font-semibold ${DUE_TONE.overdue.label}`}>
                {[overdueCount > 0 && `期限切れ${overdueCount}件`, todayDueCount > 0 && `今日が期限${todayDueCount}件`].filter(Boolean).join("・")}
              </span>
              {/* 先頭2件のタイトル（危険な順に並んでいる） */}
              <span className="min-w-0 flex-1 truncate text-stone-700">
                {alertTasks.slice(0, 2).map(({ task }) => task.title).join(" / ")}
              </span>
              <span className="shrink-0 text-lime-700">タスクを見る</span>
            </Link>
          )}

          {/* 「今日」セクション: 旧「今日やるべき Top3」と旧 TodayList を1つに統合したもの。
              同じ"今日やること"が2回出ていたため (Issue #112) */}
          <TodaySection />
        </div>

        {/* 右レール: ふり返り系。日々の操作対象ではないので脇に寄せる */}
        <div className="grid min-w-0 gap-6">
          {/* アクティビティ: 作業ログの活動グリッド。囲みカードは外して素のまま置く */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-stone-500">アクティビティ</h3>
            <ActivityGrid />
          </section>

          {/* 期限が近いタスク: 7日以内（超過含む）を危険な順に最大6件。
              役割分担: 左の期限アラート帯は overdue/today だけの「行動喚起」、こちらは近い期限の「一覧」 */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-stone-500">期限が近いタスク</h3>
            {dueSoonList.length === 0 ? (
              <p className="text-sm text-stone-600">7日以内の期限はありません</p>
            ) : (
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-surface">
                {dueSoonList.map(({ task, due }) => (
                  // 左の色帯は DUE_TONE.row の border-l 色（危険度）を流用
                  <li key={task.id} className={`flex min-w-0 items-baseline gap-3 border-l-2 px-3 py-2 text-sm ${DUE_TONE[due.severity].row}`}>
                    <span className={`shrink-0 font-medium ${DUE_TONE[due.severity].label}`}>{due.label}</span>
                    <span className="min-w-0 flex-1 truncate text-stone-800">{task.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/tasks" className="mt-2 inline-block text-sm text-lime-700 underline-offset-2 hover:underline">
              すべて見る
            </Link>
          </section>

          {/* 最近の作業ログ: 既定は閉じた折りたたみ。開くと RecentLogs が見える */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-stone-500">最近の作業ログ</summary>
            <div className="mt-3">
              <RecentLogs />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
