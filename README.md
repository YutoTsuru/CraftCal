# CraftCal

CraftCalは、個人開発を短期集中で進めるためのスプリント管理ツールです。

## 概要

作りたいものを期間で区切り、タスクを日ごとに自動配置するための自分用Webアプリです。

## 主な機能

- タスクの追加・編集・削除・状態変更
- プロジェクト管理（説明文からのタスク候補生成つき）
- カレンダー表示（月/週）と未配置タスクの日付割り当て
- AIプランナー（チャット形式で予定を提案し、タスクに反映）
- 今日やること表示・作業ログ
- localStorage保存（DB不要）

## 技術スタック

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- localStorage

## 開発

```bash
npm install
npm run dev      # 開発サーバー (http://localhost:3000)
```

### テスト・チェック

```bash
npm test             # Vitest (lib/ の純関数テスト)
npx tsc --noEmit     # 型チェック
npm run build        # 本番ビルド
```

## デプロイ (Vercel)

サーバーサイドの依存がない（データはブラウザの localStorage に保存される）ため、Vercel にそのままデプロイできます。

1. [Vercel](https://vercel.com) にログインし、このリポジトリをインポート
2. Framework Preset は **Next.js**（自動検出）。ビルド設定はデフォルトのままでOK
3. `main` ブランチへのマージで本番デプロイ、PRごとにプレビューデプロイが作成される

環境変数は現時点では不要です。今後AI連携（#8）を入れる際は、`ANTHROPIC_API_KEY` を Vercel の Environment Variables に設定します（クライアントに公開される `NEXT_PUBLIC_` プレフィックスは使わないこと）。

## 画面構成

ナビは利用フロー順（Projects で登録 → Tasks で管理 → Sprint で今日やることをAIで計画 → Calendar でスケジュール確認）に並んでいます。

- `/` 統合ホーム（今日のタスク・今日やるべきTop3・進捗・実績をまとめて確認）
- `/projects` プロジェクト管理（`/projects/plan` でタスク候補生成）
- `/tasks` タスク管理
- `/sprint` AIプランナー（予定提案チャット）
- `/calendar` カレンダー（未配置タスクの割り当て）
- `/today` `/` に統合（リダイレクト）

## 開発方針

2週間で自分が毎日使える最低限の状態を目指します。
Google Calendar連携、AI連携、認証、DB連携は後回しです。
