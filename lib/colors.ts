/**
 * プロジェクトのテーマカラーのプリセットパレット (Issue #57)。
 *
 * 役割:
 *   - 「色を作る」OSネイティブのカラーピッカー (`<input type="color">`) をやめ、
 *     ここで定義した候補から「色を選ぶ」だけにするための単一の情報源。
 *   - デフォルト色 (#10b981) が各画面に直書きされていた問題も、ここに集約して解消する。
 *
 * UI対応箇所:
 *   - components/ColorPicker.tsx … このパレットをスウォッチのグリッドとして描画する
 *   - components/ProjectForm.tsx / app/projects/plan/page.tsx /
 *     app/projects/[projectId]/page.tsx / app/projects/[projectId]/edit/page.tsx … 選択UI
 *   - components/TodayList.tsx / components/CalendarView.tsx / app/page.tsx … 8px の丸ドットとして表示
 *   - app/page.tsx / app/projects/page.tsx … 進捗バーの色として表示
 */

export type ProjectColor = {
  /** 内部ID。Tailwind のカラー名に対応させている */
  id: string;
  /** スウォッチの aria-label に使う日本語名（色だけに頼らせないため） */
  labelJa: string;
  /** 実際に保存される値。DB には従来通り HEX 文字列で入る */
  hex: string;
  /**
   * Google カレンダーのイベント色 (colorId 1〜11) への対応。
   * GCal片方向連携 (Stage 2b) でエクスポートする際の変換表として使う。
   *
   * TODO(Stage 2b): この値は暫定。実装時に Calendar API の `colors.get` を叩いて
   * 実際の colorId と配色を確認してから確定させること。
   */
  gcalColorId: string;
};

/**
 * プリセット10色。2行 × 5列のグリッドで表示する想定。
 *
 * 選定理由:
 *   - 色数を10に絞った … 色が出るのは 8px の丸ドットで、色相が20〜30°離れていないと
 *     判別できない。Todoist のように20色持てるのは色名テキストが併記されるUIだけ。
 *   - Tailwind の 600番台を採用 … 500番台は白背景に対するコントラストが
 *     emerald 2.54:1 / lime 1.98:1 などと、非テキスト要素の基準 (WCAG 1.4.11 の 3:1) を割る。
 *     yellow だけは 600 でも 2.94:1 なので 700 を使う。
 *   - slate … 「色で主張させたくないプロジェクト」用の無彩色枠。
 */
export const PROJECT_COLORS: readonly ProjectColor[] = [
  { id: "rose", labelJa: "ローズ", hex: "#e11d48", gcalColorId: "11" },
  { id: "orange", labelJa: "オレンジ", hex: "#ea580c", gcalColorId: "6" },
  { id: "yellow", labelJa: "イエロー", hex: "#a16207", gcalColorId: "5" },
  { id: "lime", labelJa: "ライム", hex: "#65a30d", gcalColorId: "10" },
  { id: "emerald", labelJa: "エメラルド", hex: "#059669", gcalColorId: "2" },
  { id: "cyan", labelJa: "シアン", hex: "#0891b2", gcalColorId: "7" },
  { id: "blue", labelJa: "ブルー", hex: "#2563eb", gcalColorId: "9" },
  { id: "indigo", labelJa: "インディゴ", hex: "#4f46e5", gcalColorId: "1" },
  { id: "violet", labelJa: "バイオレット", hex: "#7c3aed", gcalColorId: "3" },
  { id: "slate", labelJa: "グレー", hex: "#475569", gcalColorId: "8" }
] as const;

/** グリッドの列数。ColorPicker の見た目と矢印キー移動の両方でこの値を使う */
export const PALETTE_COLUMNS = 5;

/**
 * プロジェクト色が未設定のときのフォールバック。
 * 以前は各画面に "#10b981" (emerald-500) が直書きされていたが、
 * その色は白背景で 2.54:1 しかなく基準を割っていたため emerald-600 に変更した。
 */
export const DEFAULT_PROJECT_COLOR = "#059669";

/**
 * HEX 文字列を比較できる形に揃える。
 * `#ABC` のような3桁表記や大文字が混ざっていてもパレット判定できるようにするため。
 * HEX として解釈できない場合は null を返す。
 */
export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim().toLowerCase();
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(trimmed);
  if (!match) return null;

  const body = match[1];
  // 3桁表記 (#abc) は各桁を2回繰り返して6桁 (#aabbcc) に展開する
  const expanded = body.length === 3 ? body.replace(/./g, (c) => c + c) : body;
  return `#${expanded}`;
}

/** 与えられた色がパレットのどれかを返す。パレット外なら undefined */
export function findPaletteColor(value: string | null | undefined): ProjectColor | undefined {
  const normalized = normalizeHex(value);
  if (!normalized) return undefined;
  return PROJECT_COLORS.find((c) => c.hex === normalized);
}

/** パレットに含まれる色かどうか */
export function isPaletteColor(value: string | null | undefined): boolean {
  return findPaletteColor(value) !== undefined;
}

/**
 * 相対輝度 (WCAG 2.x の定義)。コントラスト比の計算に使う。
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(hex: string): number {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error(`HEXとして解釈できません: ${hex}`);

  const channels = [1, 3, 5]
    .map((i) => parseInt(normalized.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * 白背景 (#ffffff) に対するコントラスト比。
 * バッジのドットや進捗バーは白カード上に置かれるため、この値が
 * 非テキスト要素の基準 3:1 (WCAG 1.4.11) を満たしている必要がある。
 */
export function contrastRatioOnWhite(hex: string): number {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}
