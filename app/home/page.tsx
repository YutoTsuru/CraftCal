"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import { StatCard, type StatTone } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
// Today (旧 /today) の機能をこのホームに統合するために配置するコンポーネント群 (Issue #27)。
// 各コンポーネントの内部は変更せず、ここに並べ替えて移設するだけ
import TodayList from "@/components/TodayList";
import StatsCard from "@/components/StatsCard";
import ActivityGrid from "@/components/ActivityGrid";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";
import RecentLogs from "@/components/RecentLogs";
import Achievements from "@/components/Achievements";
import { getSprintLabel, getTodayString, getTodayTasks } from "@/lib/schedule";
import { selectTopTasks } from "@/lib/top-tasks";
import { selectDueSoonTasks, type DueSeverity } from "@/lib/due-status";

/**
 * 期限の危険度ごとの見た目 (Issue #69)。
 * 行の左端に色帯を出しつつ、残り日数のテキストにも同じ色を当てる。
 * 色が見分けられなくても「今日まで」「2日超過」の文言で危険度が伝わるようにしている。
 */
const DUE_TONE: Record<DueSeverity, { row: string; label: string }> = {
  overdue: { row: "border-stone-200 border-l-rose-600 bg-rose-50/60", label: "text-rose-700" },
  today: { row: "border-stone-200 border-l-rose-500 bg-rose-50/40", label: "text-rose-700" },
  soon: { row: "border-stone-200 border-l-amber-500 bg-amber-50/40", label: "text-amber-800" },
  upcoming: { row: "border-stone-200 border-l-stone-300", label: "text-stone-600" }
};

export default function HomePage() {
  const { tasks, sprint, schedule, seedSampleData, updateTaskStatus, completeTask } = useDevCalendar();
  const { projects = [], canImportLocalData, importLocalData } = useDevCalendar();

  // 取り込みボタンの二度押し防止。取り込み成功でカード自体が消えるため false へ戻す必要はない
  const [importing, setImporting] = useState(false);

  const todayTasks = getTodayTasks(schedule, tasks);

  const inProgress = tasks.filter((t) => t.status === "doing");

  // 今日やるべき Top3: lib/top-tasks.ts のスコアリング（doing/優先度/期限/今日の予定）で上位を抽出
  const topTasks = useMemo(() => selectTopTasks(tasks, getTodayString()), [tasks]);

  // Issue #69: 期限の判定は lib/due-status.ts に切り出した。
  // 以前はここで「期限日の 00:00」と「現在時刻」を引き算していたため、
  // 期限が今日のタスクは差が負になって一覧からもカウントからも漏れていた。
  // 超過タスクも含め、危険な順に並ぶ。
  const dueSoonAll = useMemo(() => selectDueSoonTasks(tasks, getTodayString()), [tasks]);

  // カードに出すのは上位6件だけ。ただし「期限間近」の件数は全件で数える
  // （切り詰めた配列の length を使うと、7件以上あっても常に 6 と表示されてしまう）
  const dueSoon = useMemo(() => dueSoonAll.slice(0, 6), [dueSoonAll]);

  // 「期限間近」カードの危険度。超過・今日ぶんがあれば赤、それ以外で1件でもあれば琥珀
  const dueSoonTone: StatTone = useMemo(() => {
    if (dueSoonAll.some((d) => d.due.severity === "overdue" || d.due.severity === "today")) {
      return "danger";
    }
    return dueSoonAll.length > 0 ? "warning" : "default";
  }, [dueSoonAll]);

  return (
    <div className="grid gap-6">
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

      {/* ヘッダー: 統合ホームの見出し + 概要 StatCard 4枚。
          旧「概要」セクションを流用し、Tasks/Sprint へのボタンはナビと重複するため削除した (Issue #27)。
          右側の StatCard 4枚（全タスク/進行中/今日のタスク/期限間近）はそのまま残す */}
      <section className="rounded-xl border border-stone-200 bg-surface p-6 shadow-md">
        {/* Issue #69: 統計カードは見出しの右に押し込むと4枚が窮屈で読みにくかったため、
            見出しの下に独立した行として置き、1枚あたりの幅を確保する */}
        <div>
          <p className="text-sm font-medium text-stone-500">Home</p>
          <h2 className="mt-2 text-2xl font-bold">今日のダッシュボード</h2>
          <p className="mt-2 text-stone-500">今日やること・進捗・実績をここで確認します。</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="全タスク" value={tasks.length} />
          <StatCard label="進行中" value={inProgress.length} />
          <StatCard label="今日のタスク" value={todayTasks.length} description={getSprintLabel(sprint)} />
          {/* 期限間近だけは件数に応じて色を変える。0件のときは既定色に戻す */}
          <StatCard label="期限間近" value={dueSoonAll.length} tone={dueSoonTone} />
        </div>
      </section>

      {/* 今日やるべき Top3: 開いて数秒で「今何をすべきか」が分かるように上部に置く (Issue #6)。
          未完了タスクが1件もないときはセクションごと非表示にする */}
      {topTasks.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-surface p-4 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">今日やるべき Top3</h3>
            <Link href="/tasks" className="text-sm text-lime-700">すべて見る</Link>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {topTasks.map((task, index) => {
              const project = projects.find((p) => p.id === task.projectId);

              return (
                <div key={task.id} className="relative rounded-xl border border-stone-200 bg-surface p-4 shadow-sm">
                  {/* 順位バッジ (1〜3位)。カード左上に固定表示 */}
                  <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-stone-700 text-sm font-semibold text-white">
                    {index + 1}
                  </span>

                  <div className="pl-9">
                    <div className="font-semibold">{task.title}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: project?.color ?? DEFAULT_PROJECT_COLOR }} />
                      {project?.name ?? "Inbox"}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.status} size="sm" />
                      <PriorityBadge priority={task.priority} />
                      {typeof task.estimatedMinutes === "number" && (
                        <span className="text-xs text-stone-500">{Math.round((task.estimatedMinutes / 60) * 10) / 10}h</span>
                      )}
                    </div>

                    <div className="mt-3">
                      {/* todo なら「開始」で doing へ、それ以外(doing等)は「完了」で done へ */}
                      {task.status === "todo" ? (
                        <button
                          onClick={() => updateTaskStatus(task.id, "doing")}
                          className="min-h-11 w-full rounded-xl bg-amber-700 px-3 text-sm font-semibold text-white transition hover:bg-amber-800"
                        >
                          開始
                        </button>
                      ) : (
                        <button
                          onClick={() => completeTask(task.id)}
                          className="min-h-11 w-full rounded-xl bg-amber-700 px-3 text-sm font-semibold text-white transition hover:bg-amber-800"
                        >
                          完了
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 今日のタスク + 実績: 旧 /today ページの構成をそのまま移植 (Issue #27)。
          左に今日のタスク操作 (TodayList)、右に実績サマリ (StatsCard) と活動グリッド (ActivityGrid) を縦積み */}
      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <TodayList />
        </div>
        <div className="grid gap-4">
          <StatsCard />
          <ActivityGrid />
        </div>
      </section>

      {/* プロジェクト進捗: 各プロジェクトの完了率をバーで表示 */}
      <section className="rounded-xl border border-stone-200 bg-surface p-4 shadow-md">
        <h3 className="text-lg font-semibold">プロジェクト進捗</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const done = projectTasks.filter((t) => t.status === "done").length;
            const progress = projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100);

            return (
              <div key={p.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-stone-500">{projectTasks.length} 件</div>
                  </div>
                  <div className="text-sm font-semibold">{progress}%</div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                  <div style={{ width: `${progress}%`, background: p.color ?? DEFAULT_PROJECT_COLOR }} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ログと実績: 最近の作業ログ (RecentLogs)・達成バッジ (Achievements)・期限が近いタスクを3列で並べる (Issue #27)。
          旧レイアウトで空だった3列目に「期限が近いタスク」カードを移設した */}
      <section className="grid gap-4 md:grid-cols-3">
        <RecentLogs />
        <Achievements />

        <div className="rounded-xl border border-stone-200 bg-surface p-4 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">期限が近いタスク</h3>
            <Link href="/tasks" className="text-sm text-lime-700">すべて見る</Link>
          </div>

          {dueSoon.length === 0 ? (
            <p className="mt-4 text-stone-500">今後7日以内の期限はありません。</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {dueSoon.map(({ task, due }) => {
                const tone = DUE_TONE[due.severity];

                return (
                  <li
                    key={task.id}
                    // 左端の色帯で危険度を示す。色だけに頼らないよう残り日数のテキストも併記する
                    className={`rounded-lg border border-l-4 px-3 py-2 ${tone.row}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{task.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          {/* 「あと3日」「今日まで」「2日超過」。生の日付より状況が分かる */}
                          <span className={`font-semibold ${tone.label}`}>{due.label}</span>
                          <span className="text-stone-500">{task.dueDate}</span>
                        </div>
                      </div>
                      {task.priority && <PriorityBadge priority={task.priority} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
