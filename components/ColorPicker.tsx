"use client";

import { Check } from "lucide-react";
import { KeyboardEvent, memo, useId, useMemo, useRef } from "react";
import {
  PALETTE_COLUMNS,
  PROJECT_COLORS,
  findPaletteColor,
  normalizeHex,
  type ProjectColor
} from "@/lib/colors";

/**
 * プロジェクトのテーマカラー選択UI (Issue #57)。
 *
 * 役割:
 *   OSネイティブのカラーピッカー (`<input type="color">`) を置き換える。
 *   従来はクリックするとOSのダイアログ（グラデーション面 + RGB数値）が開き、
 *   「色を作る」操作を強いられていた。ここではアプリ内にスウォッチを描画して
 *   「色を選ぶ」だけにする。Todoist / TickTick / Notion / Linear と同じ方式。
 *
 * UI対応箇所:
 *   - components/ProjectForm.tsx … プロジェクト新規作成フォーム
 *   - app/projects/plan/page.tsx … AIで計画する画面
 *   - app/projects/[projectId]/page.tsx … プロジェクト詳細のインライン編集
 *   - app/projects/[projectId]/edit/page.tsx … プロジェクト編集ページ
 *
 * アクセシビリティ:
 *   role="radiogroup" + role="radio" のパターン。選択中は色だけでなく
 *   チェックマークとリングでも示す（色覚に依存させないため / WCAG 1.4.1）。
 *   矢印キーで移動でき、フォーカスされている項目だけが Tab の対象になる
 *   （ロービングタブインデックス。10個の色が全部 Tab 順に並ぶのを避ける）。
 */

type ColorPickerProps = {
  /** 現在選択されている色 (HEX)。DB に入る値そのもの */
  value: string;
  onChange: (hex: string) => void;
  /** 見出しラベル。radiogroup の名前としても使われる */
  label?: string;
  className?: string;
};

function ColorPickerComponent({
  value,
  onChange,
  label = "テーマカラー",
  className = ""
}: ColorPickerProps) {
  const labelId = useId();
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const normalizedValue = normalizeHex(value);

  /**
   * 表示する選択肢。
   * 既存プロジェクトにパレット外の色が入っている場合（旧UIで自由に選べた分）、
   * その色を「現在の色」として先頭に足す。こうしないと編集して保存した瞬間に
   * 色が別のものへ書き換わってしまう。
   */
  const options = useMemo<ProjectColor[]>(() => {
    if (!normalizedValue || findPaletteColor(normalizedValue)) {
      return [...PROJECT_COLORS];
    }

    // パレット外の色は GCal のイベント色に対応付けられないので、変換用の項目は空にする
    const current: ProjectColor = {
      id: "current",
      labelJa: "現在の色",
      hex: normalizedValue,
      gcalColorId: "",
      gcalColorName: ""
    };
    return [current, ...PROJECT_COLORS];
  }, [normalizedValue]);

  const selectedIndex = options.findIndex((c) => c.hex === normalizedValue);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    // 上下は1行ぶん（列数）、左右は1つぶん動かす。端では反対側へ回り込む
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: PALETTE_COLUMNS,
      ArrowUp: -PALETTE_COLUMNS
    };

    const delta = moves[e.key];
    if (delta === undefined) return;

    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].hex);
    swatchRefs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <span id={labelId} className="text-sm font-medium text-slate-700">
        {label}
      </span>

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="mt-2 grid w-max gap-2"
        style={{ gridTemplateColumns: `repeat(${PALETTE_COLUMNS}, minmax(0, 1fr))` }}
      >
        {options.map((color, index) => {
          const isSelected = index === selectedIndex;

          return (
            <button
              key={color.id}
              ref={(el) => {
                swatchRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={color.labelJa}
              title={color.labelJa}
              // ロービングタブインデックス: 選択中（未選択なら先頭）だけが Tab で到達できる
              tabIndex={isSelected || (selectedIndex === -1 && index === 0) ? 0 : -1}
              onClick={() => onChange(color.hex)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="flex h-8 w-8 items-center justify-center rounded-full transition hover:scale-110 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              style={{
                backgroundColor: color.hex,
                // 選択中はその色自身でリングを描く（白い隙間を挟んで二重丸に見せる）
                boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 4px ${color.hex}` : undefined
              }}
            >
              {/* 選択状態を色以外でも示すためのチェックマーク */}
              {isSelected && <Check size={16} strokeWidth={3} className="text-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const ColorPicker = memo(ColorPickerComponent);

export default ColorPicker;
