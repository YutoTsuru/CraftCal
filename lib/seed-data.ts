/**
 * seed-data: 「サンプルデータを読み込む」ボタン (app/home/page.tsx) で投入されるデータを作る。
 *
 * 目的は2つ:
 *   1. 実際に進行中の作業を反映して、読み込んだ直後から現実的な画面にする
 *   2. アプリの機能をひととおり試せる状態にする
 *      （期限切れ / 今日が期限 / 週またぎの期間 / 未配置 / 完了の散らばり）
 *
 * 収録プロジェクト:
 *   - CraftCal            … このアプリ自体。GitHub のオープンIssueをそのまま反映
 *   - tobenaitsuru-HP     … 実在のポートフォリオサイト。リポジトリの状態から起こしたタスク
 *   - 技術ブログを立ち上げる … 個人開発でよくある形の汎用プロジェクト
 *
 * 予定日・期限・完了日はすべて「読み込んだ日から±N日」で計算するので、
 * いつ実行してもカレンダー・ホーム・活動グリッドが生きた状態になる。
 *
 * 呼び出し元: components/AppProvider.tsx の seedSampleData()
 */

import { formatDate } from "@/lib/schedule";
import { INBOX_PROJECT_ID } from "@/lib/storage";
import { DEFAULT_PROJECT_COLOR, PROJECT_COLORS } from "@/lib/colors";
import type { Project, Task, TaskPriority, TaskStatus, TaskWeight } from "@/types/dev-calendar";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// 今日から days 日後の日付を "YYYY-MM-DD" 形式で返す（負の値なら過去）
function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** パレットから色を引く。パレット外の色を作らないための小道具 */
function paletteColor(id: string): string {
  return PROJECT_COLORS.find((c) => c.id === id)?.hex ?? DEFAULT_PROJECT_COLOR;
}

// タスク1件を組み立てるヘルパー。
// 毎回書くと長くなる共通フィールド (createdAt など) をここで埋める
type SeedTaskInput = {
  projectId: string;
  title: string;
  memo?: string;
  weight?: TaskWeight;
  priority?: TaskPriority;
  status?: TaskStatus;
  /** 今日から何日後に作業する予定か。null なら未配置（カレンダーの未配置置き場に出る） */
  scheduledIn?: number | null;
  /** 今日から何日後が期限か。null なら期限なし。scheduledIn と別の値にすると期間つきになる */
  dueIn?: number | null;
  estimatedMinutes?: number;
  /**
   * 完了タスクを何日前に終えたことにするか（status: "done" のときだけ効く）。
   * 全部を同じ日にすると活動グリッドが1日しか埋まらないため、散らせるようにしている。
   */
  completedDaysAgo?: number;
  completionNote?: string;
  completionUrl?: string;
};

function makeSeedTask(input: SeedTaskInput): Task {
  const now = new Date().toISOString();
  const isDone = input.status === "done";
  const completedDaysAgo = input.completedDaysAgo ?? 1;

  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    title: input.title,
    memo: input.memo ?? "",
    weight: input.weight ?? "medium",
    priority: input.priority ?? "medium",
    dueDate: input.dueIn != null ? daysFromToday(input.dueIn) : null,
    scheduledDate: input.scheduledIn != null ? daysFromToday(input.scheduledIn) : null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    status: input.status ?? "todo",
    completedAt: isDone ? new Date(Date.now() - completedDaysAgo * MS_PER_DAY).toISOString() : null,
    completionNote: isDone ? input.completionNote ?? null : null,
    completionUrl: isDone ? input.completionUrl ?? null : null,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * サンプルのプロジェクト一覧とタスク一覧を生成する。
 * Inbox プロジェクト自体は AppProvider 側で常に存在が保証されるため、ここでは作らない。
 */
export function createSeedData(): { projects: Project[]; tasks: Task[] } {
  const now = new Date().toISOString();

  // ---- プロジェクト定義 ----
  const craftcal: Project = {
    id: crypto.randomUUID(),
    name: "CraftCal",
    // 注意: プロジェクト一覧のカードは全体が <a> リンクなので、
    // description に Markdown リンクを入れると <a> の入れ子になり hydration エラーが出る。
    // GitHub への導線は overviewUrl（「概要を開く」ボタン）に任せてここは平文にする
    description:
      "## 概要\nこのアプリ自体の開発プロジェクト。\n\nタスクは GitHub のオープンIssueをそのまま反映したもの。",
    overviewUrl: "https://github.com/YutoTsuru/CraftCal",
    iconPath: null,
    color: DEFAULT_PROJECT_COLOR,
    status: "active",
    goal: "毎日使えるスプリント管理ツールにする",
    createdAt: now,
    updatedAt: now
  };

  const portfolio: Project = {
    id: crypto.randomUUID(),
    name: "tobenaitsuru-HP",
    description:
      "## 概要\n自己紹介と制作物をまとめるポートフォリオサイト。Next.js に管理画面がついている。\n\n作品(Makes)・About・Skills・Contact を管理画面から編集できる。",
    overviewUrl: "https://github.com/YutoTsuru/tobenaitsuru-HP",
    iconPath: null,
    // インディゴ。CraftCal と見分けやすい色にする
    color: paletteColor("indigo"),
    status: "active",
    goal: "就活・案件獲得で見せられる状態を保つ",
    createdAt: now,
    updatedAt: now
  };

  const blog: Project = {
    id: crypto.randomUUID(),
    name: "技術ブログを立ち上げる",
    description:
      "## 概要\n学んだことを記事にして残す場所を作る。\n\n書く習慣をつけるところまでが目的で、凝った仕組みは後回しにする。",
    overviewUrl: null,
    iconPath: null,
    color: paletteColor("orange"),
    status: "active",
    goal: "月2本のペースで記事を出し続ける",
    createdAt: now,
    updatedAt: now
  };

  // ---- CraftCal: GitHub のオープンIssueと直近の完了作業 ----
  const craftcalTasks: Task[] = [
    // 進行中。今日の予定に入る
    makeSeedTask({
      projectId: craftcal.id,
      title: "予定に開始/終了時刻を持たせる (#51)",
      memo: "PR #52 がレビュー待ち。マージ前に Supabase のスキーマ適用が必要",
      weight: "heavy",
      priority: "high",
      status: "doing",
      scheduledIn: 0,
      dueIn: 2,
      estimatedMinutes: 180
    }),
    // 期限切れ（ホームの危険度が赤になる）
    makeSeedTask({
      projectId: craftcal.id,
      title: "seed/import の重複データを防ぐ (#76)",
      memo: "タスクのINSERTが失敗するとプロジェクトだけ残り、再実行で重複が増える",
      weight: "medium",
      priority: "high",
      scheduledIn: -3,
      dueIn: -2,
      estimatedMinutes: 120
    }),
    // 今日が期限（Issue #69 で直した境界の確認用）
    makeSeedTask({
      projectId: craftcal.id,
      title: "dueDate の二重意味を解消する (#55)",
      memo: "締切と期間終了日が同じ列に入っている。期間つきタスクが締切として赤く出てしまう",
      weight: "heavy",
      priority: "high",
      scheduledIn: 0,
      dueIn: 0,
      estimatedMinutes: 240
    }),
    // 週をまたぐ期間つき（カレンダーの週またぎバーが出る）
    makeSeedTask({
      projectId: craftcal.id,
      title: "CalendarView のセル描画を切り出す (#56)",
      memo: "日付ユーティリティと週バーの計算は lib へ移動済み。残りは描画とドラッグ処理",
      weight: "heavy",
      priority: "medium",
      scheduledIn: 1,
      dueIn: 9,
      estimatedMinutes: 300
    }),
    // 上と同じ週に重なる期間つき（バーが2段になる）
    makeSeedTask({
      projectId: craftcal.id,
      title: "未使用の schedules テーブルを撤去する (#54)",
      memo: "PR #52 が schema.sql を触るため、そちらを片付けてから",
      weight: "light",
      priority: "low",
      scheduledIn: 3,
      dueIn: 6,
      estimatedMinutes: 60
    }),
    // 未配置（カレンダーの未配置置き場に並ぶ）
    makeSeedTask({
      projectId: craftcal.id,
      title: "UX改善の全体方針をまとめる (#13)",
      memo: "TODOアプリのベストプラクティス調査。個別Issueへ切り出す前の受け皿",
      weight: "medium",
      priority: "low",
      scheduledIn: null,
      estimatedMinutes: 120
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "確信度が低いときは選択肢を返すチャットUI (#4)",
      memo: "スコアが拮抗したらA案/B案のボタンを出す",
      weight: "medium",
      priority: "low",
      scheduledIn: null,
      estimatedMinutes: 150
    }),
    // 完了ぶん。日を散らして活動グリッドに濃淡を出す
    makeSeedTask({
      projectId: craftcal.id,
      title: "プロジェクトにアイコン画像を設定できるようにする (#82)",
      memo: "Supabase Storage。選択・ドラッグ&ドロップ・貼り付けの3通りで受け取る",
      weight: "heavy",
      priority: "high",
      status: "done",
      scheduledIn: -1,
      completedDaysAgo: 1,
      completionUrl: "https://github.com/YutoTsuru/CraftCal/pull/84",
      estimatedMinutes: 240
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "一覧からタスクへ飛べない箇所を直す (#81)",
      memo: "説明文のMarkdownリンクがカードのリンクと入れ子になり、タップが効かなくなっていた",
      weight: "medium",
      priority: "high",
      status: "done",
      scheduledIn: -2,
      completedDaysAgo: 2,
      estimatedMinutes: 90
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "CIを導入する (#73)",
      memo: "型チェック・Lint・テスト・ビルドをPRごとに自動実行する",
      weight: "medium",
      priority: "high",
      status: "done",
      scheduledIn: -5,
      completedDaysAgo: 5,
      completionUrl: "https://github.com/YutoTsuru/CraftCal/pull/74",
      estimatedMinutes: 120
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "配色を暖色ベースに変更する (#67)",
      memo: "下地とカードの明度差が無く、カードの輪郭が消えていた",
      weight: "heavy",
      priority: "medium",
      status: "done",
      scheduledIn: -8,
      completedDaysAgo: 8,
      estimatedMinutes: 180
    })
  ];

  // ---- tobenaitsuru-HP: 実リポジトリの状態から起こしたタスク ----
  const portfolioTasks: Task[] = [
    // 期限切れ。リポジトリを見て実際に見つかった問題
    makeSeedTask({
      projectId: portfolio.id,
      title: "リポジトリ直下に紛れ込んだnpmパッケージを消す",
      memo: "next / postcss / picomatch などがリポジトリ直下にコミットされている。.gitignore の /node_modules では拾えない。15.8MBの主因",
      weight: "medium",
      priority: "high",
      scheduledIn: -4,
      dueIn: -1,
      estimatedMinutes: 60
    }),
    // 今日の予定
    makeSeedTask({
      projectId: portfolio.id,
      title: "ログファイルをコミットから外す",
      memo: "build_log.txt / error.log / stderr.txt が入ったまま。.gitignore に追記する",
      weight: "light",
      priority: "medium",
      status: "doing",
      scheduledIn: 0,
      dueIn: 3,
      estimatedMinutes: 45
    }),
    // 週をまたぐ期間つき
    makeSeedTask({
      projectId: portfolio.id,
      title: "スマホ表示のナビゲーションを見直す",
      memo: "小さい画面でヘッダーの間隔が詰まる。実機で確認する",
      weight: "medium",
      priority: "medium",
      scheduledIn: 2,
      dueIn: 8,
      estimatedMinutes: 120
    }),
    makeSeedTask({
      projectId: portfolio.id,
      title: "依存の modules パッケージが必要か確認する",
      memo: "package.json に modules がある。使っていなければ外す",
      weight: "light",
      priority: "low",
      scheduledIn: 5,
      estimatedMinutes: 30
    }),
    // 未配置
    makeSeedTask({
      projectId: portfolio.id,
      title: "作品カードにOGP画像を設定する",
      memo: "SNSに貼ったときサムネイルが出るようにする",
      weight: "medium",
      priority: "medium",
      scheduledIn: null,
      dueIn: 20,
      estimatedMinutes: 150
    }),
    makeSeedTask({
      projectId: portfolio.id,
      title: "MakesにCraftCalを載せる",
      memo: "スクリーンショットと説明文を用意する",
      weight: "light",
      priority: "medium",
      scheduledIn: null,
      estimatedMinutes: 60
    }),
    // 完了ぶん
    makeSeedTask({
      projectId: portfolio.id,
      title: "Makesの公開/下書き切替を実装する (#45)",
      memo: "isPublished フラグが機能していなかった",
      weight: "medium",
      priority: "high",
      status: "done",
      scheduledIn: -3,
      completedDaysAgo: 3,
      completionUrl: "https://github.com/YutoTsuru/tobenaitsuru-HP/pull/46",
      estimatedMinutes: 120
    }),
    makeSeedTask({
      projectId: portfolio.id,
      title: "管理画面の保存フローを分かりやすくする (#44)",
      memo: "追加ボタンだけでは保存されないことが伝わっていなかった",
      weight: "medium",
      status: "done",
      scheduledIn: -6,
      completedDaysAgo: 6,
      estimatedMinutes: 90
    })
  ];

  // ---- 技術ブログ: よくある形の汎用プロジェクト ----
  const blogTasks: Task[] = [
    // 今日が期限
    makeSeedTask({
      projectId: blog.id,
      title: "1本目の記事を書き上げる",
      memo: "CraftCalを作って学んだことをテーマにする",
      weight: "heavy",
      priority: "high",
      status: "doing",
      scheduledIn: 0,
      dueIn: 0,
      estimatedMinutes: 180
    }),
    makeSeedTask({
      projectId: blog.id,
      title: "デプロイ先を決める",
      memo: "Vercel か Cloudflare Pages。独自ドメインを当てられるか確認する",
      weight: "light",
      priority: "medium",
      scheduledIn: 1,
      dueIn: 4,
      estimatedMinutes: 45
    }),
    makeSeedTask({
      projectId: blog.id,
      title: "記事一覧とタグ機能を作る",
      weight: "medium",
      priority: "medium",
      scheduledIn: 4,
      dueIn: 11,
      estimatedMinutes: 180
    }),
    // 未配置
    makeSeedTask({
      projectId: blog.id,
      title: "OGP画像を自動生成する",
      memo: "記事タイトルを載せた画像をビルド時に作る",
      weight: "medium",
      priority: "low",
      scheduledIn: null,
      estimatedMinutes: 120
    }),
    makeSeedTask({
      projectId: blog.id,
      title: "記事のネタを10個書き出す",
      weight: "light",
      priority: "medium",
      status: "done",
      scheduledIn: -4,
      completedDaysAgo: 4,
      estimatedMinutes: 30
    })
  ];

  // ---- Inbox (未分類) のタスク ----
  const inboxTasks: Task[] = [
    makeSeedTask({
      projectId: INBOX_PROJECT_ID,
      title: "気になっていた技術記事を読む",
      memo: "React Server Components の入門記事",
      weight: "light",
      priority: "low",
      scheduledIn: null,
      estimatedMinutes: 30
    }),
    makeSeedTask({
      projectId: INBOX_PROJECT_ID,
      title: "開発環境のバックアップ設定",
      weight: "light",
      priority: "low",
      scheduledIn: 6,
      estimatedMinutes: 30
    })
  ];

  return {
    projects: [craftcal, portfolio, blog],
    tasks: [...craftcalTasks, ...portfolioTasks, ...blogTasks, ...inboxTasks]
  };
}
