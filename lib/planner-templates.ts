export type PlannedTask = {
  title: string;
  estimatedMinutes: number;
  dependency: string | null;
  weight: "light" | "medium" | "heavy";
  priority: "low" | "medium" | "high";
};

type Template = {
  label: string;
  keywords: string[];
  tasks: PlannedTask[];
};

const TEMPLATES: Template[] = [
  {
    label: "認証・ログイン",
    keywords: ["認証", "ログイン", "login", "auth", "jwt", "oauth", "パスワード", "password", "signup", "サインアップ", "register"],
    tasks: [
      { title: "認証フローの仕様を確定する（ログイン・ログアウト・セッション管理）", estimatedMinutes: 30, dependency: null, weight: "light", priority: "high" },
      { title: "ユーザーモデル・スキーマを定義する", estimatedMinutes: 30, dependency: null, weight: "light", priority: "high" },
      { title: "パスワードのハッシュ化処理を実装する", estimatedMinutes: 30, dependency: "ユーザーモデル定義後", weight: "light", priority: "high" },
      { title: "JWTトークン生成・検証ロジックを実装する", estimatedMinutes: 45, dependency: null, weight: "medium", priority: "high" },
      { title: "ログインAPIエンドポイントを実装する", estimatedMinutes: 45, dependency: "JWTロジック実装後", weight: "medium", priority: "high" },
      { title: "認証ミドルウェア（ルート保護）を実装する", estimatedMinutes: 45, dependency: "ログインAPI実装後", weight: "medium", priority: "high" },
      { title: "パスワードリセット機能を実装する", estimatedMinutes: 60, dependency: "認証基盤実装後", weight: "medium", priority: "medium" },
      { title: "動作確認・セキュリティチェックを実施する", estimatedMinutes: 30, dependency: "全実装後", weight: "light", priority: "high" },
    ],
  },
  {
    label: "API・バックエンド",
    keywords: ["api", "バックエンド", "backend", "endpoint", "エンドポイント", "rest", "graphql", "server", "サーバー", "crud"],
    tasks: [
      { title: "APIの仕様・エンドポイント一覧を設計する", estimatedMinutes: 30, dependency: null, weight: "light", priority: "high" },
      { title: "データモデル・スキーマを定義する", estimatedMinutes: 30, dependency: null, weight: "light", priority: "high" },
      { title: "データベース接続・マイグレーションを設定する", estimatedMinutes: 30, dependency: "スキーマ定義後", weight: "light", priority: "high" },
      { title: "CRUDエンドポイントを実装する", estimatedMinutes: 90, dependency: "DB設定後", weight: "heavy", priority: "high" },
      { title: "入力バリデーションを実装する", estimatedMinutes: 30, dependency: "エンドポイント実装後", weight: "light", priority: "medium" },
      { title: "エラーハンドリングを共通化して実装する", estimatedMinutes: 30, dependency: null, weight: "light", priority: "medium" },
      { title: "APIドキュメントを作成する（README or Swagger）", estimatedMinutes: 20, dependency: "全実装後", weight: "light", priority: "low" },
      { title: "APIの動作確認・テストを実施する", estimatedMinutes: 30, dependency: "全実装後", weight: "light", priority: "high" },
    ],
  },
  {
    label: "データベース",
    keywords: ["データベース", "database", "db", "schema", "スキーマ", "migration", "マイグレーション", "sql", "テーブル", "table", "orm"],
    tasks: [
      { title: "テーブル設計・ER図を作成する", estimatedMinutes: 45, dependency: null, weight: "medium", priority: "high" },
      { title: "マイグレーションファイルを作成する", estimatedMinutes: 30, dependency: "テーブル設計後", weight: "light", priority: "high" },
      { title: "インデックスを設計・設定する", estimatedMinutes: 20, dependency: "マイグレーション作成後", weight: "light", priority: "medium" },
      { title: "ORMモデルを実装する", estimatedMinutes: 45, dependency: "マイグレーション作成後", weight: "medium", priority: "high" },
      { title: "シードデータを用意する", estimatedMinutes: 20, dependency: "ORMモデル実装後", weight: "light", priority: "low" },
      { title: "クエリのパフォーマンスを計測・確認する", estimatedMinutes: 30, dependency: "全実装後", weight: "light", priority: "medium" },
    ],
  },
  {
    label: "フロントエンド・UI",
    keywords: ["ui", "フロント", "frontend", "component", "コンポーネント", "画面", "react", "vue", "next", "ページ", "page", "デザイン", "design", "レイアウト", "layout"],
    tasks: [
      { title: "画面のワイヤーフレーム・レイアウトを決定する", estimatedMinutes: 30, dependency: null, weight: "light", priority: "high" },
      { title: "コンポーネントのファイル・ディレクトリ構成を決める", estimatedMinutes: 15, dependency: null, weight: "light", priority: "medium" },
      { title: "ベースコンポーネントを実装する", estimatedMinutes: 60, dependency: "構成決定後", weight: "medium", priority: "high" },
      { title: "スタイル・レイアウトを実装する", estimatedMinutes: 45, dependency: "コンポーネント実装後", weight: "medium", priority: "high" },
      { title: "状態管理・ロジックを実装する", estimatedMinutes: 60, dependency: null, weight: "medium", priority: "high" },
      { title: "APIとのデータ連携を実装する", estimatedMinutes: 45, dependency: "状態管理実装後", weight: "medium", priority: "high" },
      { title: "エラー・ローディング状態のUIを実装する", estimatedMinutes: 30, dependency: "API連携後", weight: "light", priority: "medium" },
      { title: "ブラウザ動作確認・レスポンシブ対応を確認する", estimatedMinutes: 30, dependency: "全実装後", weight: "light", priority: "high" },
    ],
  },
  {
    label: "バグ修正",
    keywords: ["バグ", "bug", "fix", "修正", "不具合", "エラー", "error", "クラッシュ", "crash", "問題"],
    tasks: [
      { title: "バグを再現する手順を確認・文書化する", estimatedMinutes: 15, dependency: null, weight: "light", priority: "high" },
      { title: "ログ・スタックトレースから原因箇所を特定する", estimatedMinutes: 30, dependency: null, weight: "light", priority: "high" },
      { title: "関連コードを調査して根本原因を把握する", estimatedMinutes: 30, dependency: "原因箇所特定後", weight: "light", priority: "high" },
      { title: "修正方法を設計・決定する", estimatedMinutes: 20, dependency: "根本原因把握後", weight: "light", priority: "high" },
      { title: "修正を実装する", estimatedMinutes: 45, dependency: "修正方法決定後", weight: "medium", priority: "high" },
      { title: "修正が正しく機能することを動作確認する", estimatedMinutes: 20, dependency: "修正実装後", weight: "light", priority: "high" },
      { title: "デグレ（他機能への影響）がないことを確認する", estimatedMinutes: 20, dependency: "動作確認後", weight: "light", priority: "high" },
    ],
  },
  {
    label: "テスト",
    keywords: ["テスト", "test", "testing", "spec", "unit", "e2e", "qa", "品質", "coverage"],
    tasks: [
      { title: "テスト対象の機能・仕様を整理する", estimatedMinutes: 20, dependency: null, weight: "light", priority: "high" },
      { title: "テストケース一覧を作成する", estimatedMinutes: 30, dependency: null, weight: "light", priority: "high" },
      { title: "ユニットテストを実装する", estimatedMinutes: 60, dependency: "テストケース作成後", weight: "medium", priority: "high" },
      { title: "統合テスト（APIテスト等）を実装する", estimatedMinutes: 60, dependency: "ユニットテスト後", weight: "medium", priority: "medium" },
      { title: "E2Eテストを実装する", estimatedMinutes: 60, dependency: "統合テスト後", weight: "medium", priority: "medium" },
      { title: "テストカバレッジを確認・目標値まで改善する", estimatedMinutes: 30, dependency: "全テスト実装後", weight: "light", priority: "medium" },
      { title: "CIパイプラインにテストを組み込む", estimatedMinutes: 30, dependency: "カバレッジ確認後", weight: "light", priority: "low" },
    ],
  },
  {
    label: "デプロイ・インフラ",
    keywords: ["デプロイ", "deploy", "deployment", "ci", "cd", "本番", "production", "インフラ", "infra", "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "vercel", "heroku"],
    tasks: [
      { title: "デプロイ要件・対象環境を確認する", estimatedMinutes: 20, dependency: null, weight: "light", priority: "high" },
      { title: "環境変数・設定ファイルを整備する", estimatedMinutes: 20, dependency: null, weight: "light", priority: "high" },
      { title: "Dockerfileまたはビルドスクリプトを作成・確認する", estimatedMinutes: 30, dependency: "設定整備後", weight: "light", priority: "high" },
      { title: "CI/CDパイプラインを設定する", estimatedMinutes: 45, dependency: "ビルドスクリプト作成後", weight: "medium", priority: "medium" },
      { title: "ステージング環境にデプロイして動作確認する", estimatedMinutes: 30, dependency: "CI/CD設定後", weight: "light", priority: "high" },
      { title: "本番環境にデプロイする", estimatedMinutes: 20, dependency: "ステージング確認後", weight: "light", priority: "high" },
      { title: "本番環境で動作確認・モニタリングを設定する", estimatedMinutes: 20, dependency: "本番デプロイ後", weight: "light", priority: "high" },
    ],
  },
  {
    label: "リファクタリング",
    keywords: ["リファクタリング", "refactor", "refactoring", "改善", "cleanup", "整理", "最適化", "optimize"],
    tasks: [
      { title: "リファクタリング対象の範囲と目標を明確にする", estimatedMinutes: 20, dependency: null, weight: "light", priority: "high" },
      { title: "現状コードを調査・把握する", estimatedMinutes: 30, dependency: null, weight: "light", priority: "high" },
      { title: "既存テストのカバレッジを確認する", estimatedMinutes: 20, dependency: null, weight: "light", priority: "medium" },
      { title: "不足しているテストを追加する", estimatedMinutes: 45, dependency: "カバレッジ確認後", weight: "medium", priority: "medium" },
      { title: "リファクタリングを段階的に実施する", estimatedMinutes: 90, dependency: "テスト整備後", weight: "heavy", priority: "high" },
      { title: "テストが通ることを確認する", estimatedMinutes: 20, dependency: "リファクタリング後", weight: "light", priority: "high" },
      { title: "パフォーマンスに変化がないことを確認する", estimatedMinutes: 20, dependency: "テスト確認後", weight: "light", priority: "medium" },
    ],
  },
  {
    label: "モバイルアプリ",
    keywords: ["モバイル", "mobile", "ios", "android", "react native", "flutter", "swift", "kotlin"],
    tasks: [
      { title: "画面一覧・ナビゲーション構造を設計する", estimatedMinutes: 45, dependency: null, weight: "medium", priority: "high" },
      { title: "ベース画面コンポーネントを実装する", estimatedMinutes: 90, dependency: "画面設計後", weight: "heavy", priority: "high" },
      { title: "APIクライアント・データ取得ロジックを実装する", estimatedMinutes: 60, dependency: null, weight: "medium", priority: "high" },
      { title: "ローカルストレージ・キャッシュ戦略を実装する", estimatedMinutes: 45, dependency: "APIクライアント実装後", weight: "medium", priority: "medium" },
      { title: "プッシュ通知を設定・実装する", estimatedMinutes: 45, dependency: null, weight: "medium", priority: "medium" },
      { title: "UIの調整・アニメーションを実装する", estimatedMinutes: 60, dependency: "コンポーネント実装後", weight: "medium", priority: "low" },
      { title: "実機テスト（iOS/Android両対応確認）を実施する", estimatedMinutes: 45, dependency: "全実装後", weight: "medium", priority: "high" },
    ],
  },
];

const GENERAL_TEMPLATE: PlannedTask[] = [
  { title: "要件・ゴールを具体的に文書化する", estimatedMinutes: 20, dependency: null, weight: "light", priority: "high" },
  { title: "技術的なアプローチを調査・決定する", estimatedMinutes: 30, dependency: "要件確定後", weight: "light", priority: "high" },
  { title: "実装に必要なファイル・構成を準備する", estimatedMinutes: 20, dependency: "アプローチ決定後", weight: "light", priority: "high" },
  { title: "コア機能を実装する", estimatedMinutes: 90, dependency: "準備完了後", weight: "heavy", priority: "high" },
  { title: "エラーハンドリング・エッジケースを実装する", estimatedMinutes: 30, dependency: "コア実装後", weight: "light", priority: "medium" },
  { title: "動作確認・テストを実施する", estimatedMinutes: 30, dependency: "全実装後", weight: "light", priority: "high" },
  { title: "コードレビュー・整理を実施する", estimatedMinutes: 20, dependency: "テスト後", weight: "light", priority: "low" },
];

export function generateTasks(projectName: string, description: string, goal: string): PlannedTask[] {
  const text = [projectName, description, goal].join(" ").toLowerCase();

  let bestMatch: Template | null = null;
  let bestScore = 0;

  for (const template of TEMPLATES) {
    const score = template.keywords.filter((kw) => text.includes(kw.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return bestMatch ? bestMatch.tasks : GENERAL_TEMPLATE;
}
