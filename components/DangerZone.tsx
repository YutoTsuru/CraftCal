"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useDevCalendar } from "@/components/AppProvider";
import { INBOX_PROJECT_ID } from "@/lib/storage";

/**
 * DangerZone: 全データを削除する区画 (Issue #87)。
 *
 * 背景:
 *   resetAll は AppProvider に実装済みだったが、どの画面からも呼ばれておらず
 *   到達できなかった。一方でサンプルデータの投入はタスクが0件のときしか動かないため、
 *   一度データが入ると入れ直す手段が無い状態だった。
 *
 * 誤操作対策:
 *   押しただけでは消さず、2段階にする。プロジェクト名を打たせる方式は
 *   個人用ツールには大げさなので採らない。
 */
export function DangerZone() {
  const { tasks, projects, resetAll } = useDevCalendar();
  const [confirming, setConfirming] = useState(false);

  // Inbox は仮想プロジェクトで DB に実体が無いため、件数から除く
  const realProjectCount = projects.filter((p) => p.id !== INBOX_PROJECT_ID).length;
  const isEmpty = tasks.length === 0 && realProjectCount === 0;

  return (
    <section className="rounded-xl border border-stone-200 bg-surface p-4 shadow-md">
      <h3 className="text-lg font-semibold">データの管理</h3>

      {isEmpty ? (
        <p className="mt-2 text-sm text-stone-500">
          削除できるデータはありません。上の案内からサンプルデータを読み込めます。
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-stone-600">
            プロジェクト {realProjectCount} 件とタスク {tasks.length} 件を削除します。
            <span className="font-semibold text-rose-700">元に戻せません。</span>
          </p>
          <p className="mt-1 text-xs text-stone-500">
            作業ログはこのブラウザに保存されており、削除の対象外です。
            削除するとサンプルデータを読み込み直せるようになります。
          </p>

          {confirming ? (
            <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50/60 p-3">
              <p className="flex items-start gap-2 text-sm font-medium text-rose-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                本当にすべて削除しますか？この操作は取り消せません。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="min-h-11 rounded-xl border border-stone-300 bg-surface px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                >
                  やめる
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetAll();
                    setConfirming(false);
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  本当に削除する
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              <Trash2 size={16} aria-hidden="true" />
              すべてのデータを削除
            </button>
          )}
        </>
      )}
    </section>
  );
}

export default DangerZone;
