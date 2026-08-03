/**
 * seed-data: 「サンプルデータを読み込む」ボタン (app/page.tsx) で投入されるデータを作る。
 *
 * - CraftCal プロジェクト: 架空ではなく、GitHub の実Issue (#3〜#16) をタスク化した本物の開発計画
 * - ポートフォリオサイト: 一般的な使い方が分かるモックプロジェクト
 * - Inbox: プロジェクトに属さない未分類タスクの例
 *
 * 予定日・期限はすべて「読み込んだ日から±N日」で計算するので、
 * いつ実行してもカレンダー・Today・未配置置き場が生きた状態になる。
 *
 * 呼び出し元: components/AppProvider.tsx の seedSampleData()
 */

import { formatDate } from "@/lib/schedule";
import { INBOX_PROJECT_ID } from "@/lib/storage";
import { DEFAULT_PROJECT_COLOR, PROJECT_COLORS } from "@/lib/colors";
import type { Project, Task, TaskPriority, TaskStatus, TaskWeight } from "@/types/dev-calendar";

// 今日から days 日後の日付を "YYYY-MM-DD" 形式で返す（負の値なら過去）
function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
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
  /** 今日から何日後が期限か。null なら期限なし */
  dueIn?: number | null;
  estimatedMinutes?: number;
};

function makeSeedTask(input: SeedTaskInput): Task {
  const now = new Date().toISOString();
  const isDone = input.status === "done";

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
    // 完了タスクには完了日時 (昨日) を入れて、実績表示が動くようにする
    completedAt: isDone ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : null,
    completionNote: null,
    completionUrl: null,
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
    description: "## 概要\nこのアプリ自体の開発プロジェクト。\n\nタスクは GitHub の実Issue (#3〜#16) をそのまま反映したもの。",
    overviewUrl: "https://github.com/YutoTsuru/CraftCal",
    color: DEFAULT_PROJECT_COLOR, // アプリのテーマカラーと同じエメラルド
    status: "active",
    goal: "UX/UIを磨いて毎日使えるスプリント管理ツールにする",
    createdAt: now,
    updatedAt: now
  };

  const portfolio: Project = {
    id: crypto.randomUUID(),
    name: "ポートフォリオサイト",
    description: "自己紹介と制作物をまとめる静的サイト（モックデータ）",
    overviewUrl: null,
    // インディゴ。CraftCalと見分けやすい色にする。Issue #57 のパレット値を使う
    color: PROJECT_COLORS.find((c) => c.id === "indigo")!.hex,
    status: "active",
    goal: "就活・案件獲得に使えるポートフォリオを公開する",
    createdAt: now,
    updatedAt: now
  };

  // ---- CraftCal のタスク: GitHub Issue と1対1対応 ----
  const craftcalTasks: Task[] = [
    // 完了済み: デプロイ (#10) とレスポンシブ対応 (#14 / PR #15)
    makeSeedTask({
      projectId: craftcal.id,
      title: "Vercelデプロイ環境の構築 (#10)",
      memo: "本番ビルド修正 + README整備 + Vercel連携。完了済み",
      weight: "medium",
      priority: "high",
      status: "done",
      scheduledIn: -1,
      estimatedMinutes: 90
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "レスポンシブデザイン対応 (#14)",
      memo: "ボトムタブバー・カレンダーのモバイル表示・タップ領域44px。PR #15 レビュー中",
      weight: "heavy",
      priority: "high",
      status: "doing",
      scheduledIn: 0, // 今日のタスクとして表示される
      estimatedMinutes: 180
    }),
    // 直近でやる予定のもの
    makeSeedTask({
      projectId: craftcal.id,
      title: "クイック追加式のタスク入力 (#13)",
      memo: "タスク名だけで5秒で追加、詳細は展開式に。UX調査Issueから切り出し予定",
      weight: "medium",
      priority: "high",
      scheduledIn: 1,
      dueIn: 5,
      estimatedMinutes: 120
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "Sprint画面のダミー表示整理 (#7)",
      memo: "空き時間のハードコード削除・未使用コンポーネント削除",
      weight: "light",
      priority: "medium",
      scheduledIn: 2,
      estimatedMinutes: 60
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "AI提案のタイムラインプレビュー (#3)",
      memo: "提案を時間軸上にブロック表示して説得力を上げる (Structured風)",
      weight: "heavy",
      priority: "high",
      scheduledIn: 3,
      dueIn: 7,
      estimatedMinutes: 180
    }),
    // 未配置 (バックログ): カレンダーの「未配置のタスク」に並ぶ
    makeSeedTask({
      projectId: craftcal.id,
      title: "確信度が低いときは選択肢を返すチャットUI (#4)",
      memo: "スコア拮抗時にA案/B案ボタンを出す",
      weight: "medium",
      priority: "medium",
      scheduledIn: null,
      estimatedMinutes: 120
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "/tasks にカンバン表示切替 (#5)",
      memo: "TickTick風。ステータス3列 + クリック移動から始める",
      weight: "heavy",
      priority: "medium",
      scheduledIn: null,
      dueIn: 14,
      estimatedMinutes: 240
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "ホームを「今日のTop3」中心に再構成 (#6)",
      memo: "数秒で今やるべきことが分かる画面に",
      weight: "medium",
      priority: "medium",
      scheduledIn: null,
      estimatedMinutes: 120
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "LLM本接続: Route Handler経由のAIプランナー (#8)",
      memo: "ANTHROPIC_API_KEY はサーバー側。ルールベースをフォールバックに残す",
      weight: "heavy",
      priority: "low",
      scheduledIn: null,
      estimatedMinutes: 300
    }),
    makeSeedTask({
      projectId: craftcal.id,
      title: "永続化の堅牢化 (#9)",
      memo: "スキーマバージョン導入・複数タブ同期・容量超過時の通知",
      weight: "medium",
      priority: "low",
      scheduledIn: null,
      estimatedMinutes: 150
    })
  ];

  // ---- ポートフォリオサイトのタスク (モック) ----
  const portfolioTasks: Task[] = [
    makeSeedTask({
      projectId: portfolio.id,
      title: "デザイン案を作る",
      memo: "Figmaでトップ・作品一覧・お問い合わせの3画面",
      weight: "medium",
      status: "done",
      scheduledIn: -2,
      estimatedMinutes: 120
    }),
    makeSeedTask({
      projectId: portfolio.id,
      title: "トップページ実装",
      memo: "ヒーローセクションと自己紹介",
      weight: "medium",
      priority: "high",
      status: "doing",
      scheduledIn: 0, // 今日のタスク
      estimatedMinutes: 90
    }),
    makeSeedTask({
      projectId: portfolio.id,
      title: "作品一覧ページ実装",
      memo: "CraftCalも載せる",
      weight: "medium",
      scheduledIn: 4,
      estimatedMinutes: 120
    }),
    makeSeedTask({
      projectId: portfolio.id,
      title: "公開 (独自ドメイン設定)",
      weight: "light",
      priority: "medium",
      scheduledIn: null, // 未配置
      dueIn: 10,
      estimatedMinutes: 60
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
    projects: [craftcal, portfolio],
    tasks: [...craftcalTasks, ...portfolioTasks, ...inboxTasks]
  };
}
