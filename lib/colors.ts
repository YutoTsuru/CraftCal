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
   * Google カレンダーの【イベント色】(colorId 1〜11) への対応。
   * GCal片方向連携 (Stage 2b) でタスクを予定として書き出す際の変換表として使う。
   *
   * 注意: Google カレンダーには「イベント色」と「カレンダー色」の2つのパレットがあり、
   * 同じ色名でもIDが違う（例: Tomato はイベント色なら 11、カレンダー色なら 3）。
   * ここはイベント色のIDなので、カレンダー自体の色を設定する用途には使えない。
   */
  gcalColorId: string;
  /**
   * 対応する Google カレンダーのイベント色名。
   * gcalColorId だけだと対応が合っているか目視で確認できないため併記する
   * （テストでIDと名前の組み合わせを検証している）。
   */
  gcalColorName: string;
};

/**
 * Google カレンダーのイベント色: colorId → 色名。
 *
 * 出典（3つの独立した情報源で一致を確認済み）:
 *   - Google Calendar API リファレンス (Colors)
 *     https://developers.google.com/workspace/calendar/api/v3/reference/colors
 *   - gcsa (Google Calendar Simple API) ドキュメント
 *     https://google-calendar-simple-api.readthedocs.io/en/latest/colors.html
 *   - 色名→ID対応の gist
 *     https://gist.github.com/ansaso/accaddab0892a3b47d5f4884fda0468b
 *
 * 実際の配色は API の `colors.get` が返す hex が正だが、ID と色名の対応は上記で固定。
 * CraftCal 側のパレットは自前の配色を使い、書き出し時にここでIDへ変換する
 * （GCal のパステル配色をそのままUIに持ち込むと現行デザインから浮くため）。
 */
export const GCAL_EVENT_COLORS: Readonly<Record<string, string>> = {
  "1": "Lavender",
  "2": "Sage",
  "3": "Grape",
  "4": "Flamingo",
  "5": "Banana",
  "6": "Tangerine",
  "7": "Peacock",
  "8": "Graphite",
  "9": "Blueberry",
  "10": "Basil",
  "11": "Tomato"
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
  { id: "rose", labelJa: "ローズ", hex: "#e11d48", gcalColorId: "11", gcalColorName: "Tomato" },
  { id: "orange", labelJa: "オレンジ", hex: "#ea580c", gcalColorId: "6", gcalColorName: "Tangerine" },
  { id: "yellow", labelJa: "イエロー", hex: "#a16207", gcalColorId: "5", gcalColorName: "Banana" },
  { id: "lime", labelJa: "ライム", hex: "#65a30d", gcalColorId: "10", gcalColorName: "Basil" },
  { id: "emerald", labelJa: "エメラルド", hex: "#059669", gcalColorId: "2", gcalColorName: "Sage" },
  { id: "cyan", labelJa: "シアン", hex: "#0891b2", gcalColorId: "7", gcalColorName: "Peacock" },
  { id: "blue", labelJa: "ブルー", hex: "#2563eb", gcalColorId: "9", gcalColorName: "Blueberry" },
  { id: "indigo", labelJa: "インディゴ", hex: "#4f46e5", gcalColorId: "1", gcalColorName: "Lavender" },
  { id: "violet", labelJa: "バイオレット", hex: "#7c3aed", gcalColorId: "3", gcalColorName: "Grape" },
  { id: "slate", labelJa: "グレー", hex: "#475569", gcalColorId: "8", gcalColorName: "Graphite" }
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
 * カード面の色。tailwind.config.ts の `surface` と同じ値。
 *
 * 暖色化 (Issue #67) 以前は純白 (#ffffff) だったが、下地との明度差が無く
 * カードの輪郭が消えていたため、下地を暖色に落としカード面を温かい白にした。
 * パレットのコントラスト検証はこの実際の背景色に対して行う必要がある。
 */
export const SURFACE_COLOR = "#fffdf9";

/** 2色間のコントラスト比 (WCAG 2.x)。明るい側／暗い側の順序は自動で判定する */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * カード面 (SURFACE_COLOR) に対するコントラスト比。
 * バッジのドットや進捗バーはカードの上に置かれるため、この値が
 * 非テキスト要素の基準 3:1 (WCAG 1.4.11) を満たしている必要がある。
 */
export function contrastRatioOnSurface(hex: string): number {
  return contrastRatio(hex, SURFACE_COLOR);
}
