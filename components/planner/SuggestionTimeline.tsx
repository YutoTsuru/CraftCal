"use client";

/**
 * SuggestionTimeline: AI提案（ScheduleSuggestion）を「1日の時間軸」の上に
 * ブロックとして配置して見せるコンポーネント。
 *
 * UI上の役割:
 * - /sprint（スプリント）ページ右カラムの「提案された予定」カード内で使う。
 * - 従来のテキストカードの羅列だと1日の流れが直感的に分からないため、
 *   Structured 系アプリのように縦の時間軸へ予定ブロックを重ねて表示する。
 *
 * レイアウト方針:
 * - 提案を date ごとにグループ化し、日付列（今日/明日 の最大2列）を横に並べる。
 * - 各列は縦の時間軸。1時間 = 64px。毎時に区切り線と時刻ラベルを描画する。
 * - 提案ブロックは position:absolute で、開始/終了時刻から算出した top/height に置く。
 */

import type { ScheduleSuggestion } from "@/lib/planner";

// 1時間分の高さ(px)。時間軸の縦スケールの基準になる。
const HOUR_HEIGHT = 64;

/**
 * "HH:MM" 形式の時刻文字列を、0時からの通算「分」に変換するヘルパー。
 * 例: "19:30" -> 19*60 + 30 = 1170
 */
function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 1つの日付列に表示する提案の集合から、時間軸の描画に必要な情報を組み立てる。
 * - axisStartHour: 最小 startTime の「時」を floor した値
 * - axisEndHour:   最大 endTime の「時」を ceil した値
 * - 最低3時間分（軸が潰れないよう）は必ず確保する。
 */
function buildAxis(items: ScheduleSuggestion[]) {
  const startMinutes = items.map((item) => timeToMinutes(item.startTime));
  const endMinutes = items.map((item) => timeToMinutes(item.endTime));

  // 最小開始時刻の「時」を切り捨て、最大終了時刻の「時」を切り上げる
  let axisStartHour = Math.floor(Math.min(...startMinutes) / 60);
  let axisEndHour = Math.ceil(Math.max(...endMinutes) / 60);

  // 最低でも3時間分の高さを確保する（提案が短時間に固まっていても軸を潰さない）
  if (axisEndHour - axisStartHour < 3) {
    axisEndHour = axisStartHour + 3;
  }

  // 毎時の区切り線／ラベル用に、軸に含まれる各「時」の配列を作る
  const hours: number[] = [];
  for (let h = axisStartHour; h <= axisEndHour; h += 1) {
    hours.push(h);
  }

  return { axisStartHour, axisEndHour, hours };
}

export function SuggestionTimeline({ suggestions }: { suggestions: ScheduleSuggestion[] }) {
  // date ごとにグループ化する。挿入順（提案の並び順）を保つため Map を使う。
  const groups = new Map<string, ScheduleSuggestion[]>();
  for (const item of suggestions) {
    const list = groups.get(item.date) ?? [];
    list.push(item);
    groups.set(item.date, list);
  }

  return (
    // 日付列を横に並べる。最大2列（今日/明日）想定なので flex gap-4 で十分。
    <div className="flex gap-4 overflow-x-auto">
      {Array.from(groups.entries()).map(([date, items]) => {
        const { axisStartHour, hours } = buildAxis(items);
        // 軸開始「時」を分に直したもの。ブロックの top 計算の基準。
        const axisStartMinutes = axisStartHour * 60;
        // 列全体の高さ = 時間数 × 1時間の高さ
        const columnHeight = (hours.length - 1) * HOUR_HEIGHT;

        return (
          <div key={date} className="min-w-[180px] flex-1">
            {/* 列ヘッダー: 今日/明日 などの dateLabel を表示 */}
            <p className="mb-2 text-xs font-semibold text-emerald-700">{items[0]?.dateLabel}</p>

            {/* 時間軸本体。区切り線と提案ブロックを重ねるため relative にする */}
            <div className="relative" style={{ height: `${columnHeight}px` }}>
              {/* 毎時の区切り線と時刻ラベル */}
              {hours.map((hour, index) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-stone-100"
                  style={{ top: `${index * HOUR_HEIGHT}px` }}
                >
                  <span className="text-xs text-stone-400">{`${String(hour).padStart(2, "0")}:00`}</span>
                </div>
              ))}

              {/* 提案ブロック: 開始/終了時刻から top・height を算出して絶対配置する */}
              {items.map((item) => {
                const startMin = timeToMinutes(item.startTime);
                const endMin = timeToMinutes(item.endTime);
                const top = ((startMin - axisStartMinutes) / 60) * HOUR_HEIGHT;
                const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;

                return (
                  <div
                    key={`${item.taskId}-${item.startTime}`}
                    data-testid="timeline-block"
                    className="absolute left-10 right-1 overflow-hidden rounded-lg bg-emerald-500/90 px-2 py-1 text-white"
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    {/* 1行目: 開始〜終了時刻 */}
                    <p className="text-xs">
                      {item.startTime}〜{item.endTime}
                    </p>
                    {/* 2行目: タスク名（長い場合は省略） */}
                    <p className="truncate text-sm font-semibold">{item.taskTitle}</p>
                    {/* 3行目: プロジェクト名 / 見積もり分 */}
                    <p className="text-[10px] opacity-80">
                      {item.projectName} / {item.estimatedMinutes}分
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
