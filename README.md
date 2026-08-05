# CraftCal

作りたいものをタスクに分解し、カレンダーに置いて、今日ぶんだけに集中するための個人開発向けスプリント管理ツールです。

**https://craftcal.me**

「いつかやる」で積み上がった個人開発を、日付の入った予定に変えることを目的にしています。作者が毎日使うために作った自分用のWebアプリで、汎用のタスク管理ツールを目指してはいません。

## できること

- **プロジェクト管理** — 作りたいものごとにゴール・説明・テーマカラーを設定し、進捗率を一覧で確認する
- **タスク分解** — プロジェクトの説明文からタスク候補を生成する（`/projects/plan`）
- **カレンダー配置** — 月/週表示でタスクを日付へ配置。なぞって期間指定、バーの端をドラッグして期間の伸縮ができる
- **今日のダッシュボード** — 今日ぶんのタスク、優先して着手すべき Top3、期限が近いもの、実績グラフをまとめて表示
- **予定アシスタント** — 「今日の午前に軽いタスクを」のような入力から、条件に合うタスクを選んで提案する（`/sprint`）
- **アカウント同期** — Supabase 認証でログインし、複数の端末から同じデータを扱える

> **注記:** UI 上「AIで計画する」と表示している機能を含め、タスク生成と予定提案は**キーワードとテンプレートによるルールベース**の実装です。LLM の API は呼んでいません（サーバーAPIルート自体が存在しません）。

## クイックスタート

Supabase のプロジェクトが1つ必要です（無料枠で足ります）。

```bash
git clone https://github.com/YutoTsuru/CraftCal.git
cd CraftCal
npm install
cp .env.example .env.local   # 値を埋める（下記）
npm run dev                  # http://localhost:3000
```

`.env.local` に設定する値は2つです。どちらも Supabase ダッシュボードの **Project Settings → API** から取得します。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Secret / Service Role キーは使いません（ブラウザから直接 Supabase を叩き、アクセス制御は RLS に任せる構成のため）。

データベースの初期化は `supabase/schema.sql` を SQL Editor に貼って1回実行するだけです。手順の詳細は [docs/supabase-setup.md](docs/supabase-setup.md) にあります。

## 技術スタック

| 領域 | 使用技術 |
| --- | --- |
| フレームワーク | Next.js 15 (App Router) / React 19 |
| 言語 | TypeScript 5.6 |
| スタイル | Tailwind CSS 3.4 |
| アニメーション | Framer Motion |
| 認証・DB | Supabase (Auth + Postgres, Row Level Security) |
| テスト | Vitest |
| ホスティング | Vercel |

## プロジェクト構成

```
app/                    ルーティング (App Router)
  page.tsx              公開ランディング（唯一のインデックス対象）
  home/                 ダッシュボード（要ログイン）
  projects/             プロジェクト一覧・詳細・編集・タスク分解
  tasks/ sprint/ calendar/
  login/ signup/ auth/callback/
  robots.ts sitemap.ts opengraph-image.tsx    SEO
  */layout.tsx          非公開ルートに noindex を付ける薄いサーバーコンポーネント
components/             UIコンポーネント
  AppProvider.tsx       データ層。state と actions で Context を分離
  AuthProvider.tsx      Supabase セッションの配布
  AuthGate.tsx          公開/保護ルートの振り分けとリダイレクト
lib/                    純関数・サービス層（テストはここに集中している）
  services/             Supabase への読み書き
  db-mappers.ts         DB (snake_case) ⇔ アプリ (camelCase) の変換
  persist-coordinator.ts 楽観更新の保存調整と失敗時ロールバック
  colors.ts             プロジェクトのテーマカラーのパレット
types/                  共通の型定義
supabase/schema.sql     テーブル・RLS・トリガー（冪等）
```

## 開発

```bash
npm run dev          # 開発サーバー
npm run build        # 本番ビルド
npm run start        # 本番ビルドの起動確認
npm test             # Vitest (116件 / lib の純関数)
npm run test:watch   # 監視モード
npx tsc --noEmit     # 型チェック
```

ロジックは可能な限り `lib/` の純関数に寄せ、そこにテストを集めています。UIコンポーネントのテストは持っていません。

## 設計上の決めごと

後から見て理由を思い出せなくなりがちな判断を残しています。

- **サーバーAPIルートを持たない** — ブラウザから Supabase を直接叩き、アクセス制御は全テーブルの RLS で行う。秘密鍵をアプリ側に置かないための構成
- **画面はほぼクライアントコンポーネント** — ただし `/` の公開ランディングだけは認証ゲートの外に出したサーバーコンポーネント。ここを認証待ちにすると、クローラに届く HTML が起動画面になってしまうため
- **非公開ルートは `robots.txt` ではなく `noindex` で外す** — `Disallow` するとクローラが `noindex` を読めず、URL だけが検索結果に残り続けるため
- **プロジェクトの色はプリセットから選ぶ** — 8px のドットで判別できるよう色相を離した10色に限定し、白背景に対して 3:1 以上（WCAG 1.4.11）を満たす値だけを採用している

## デプロイ (Vercel)

1. [Vercel](https://vercel.com) でこのリポジトリをインポート（Framework Preset は Next.js が自動検出される）
2. Environment Variables に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を設定
3. `main` へのマージで本番デプロイ、PR ごとにプレビューデプロイが作られる

本番と異なるドメインで動かす場合は `NEXT_PUBLIC_SITE_URL` を設定します（未設定時は `https://craftcal.me` を基準に canonical と OG 画像の URL を解決します）。

## 開発の進め方

GitHub の Issue 単位で進めています。コード変更は `feature/issue-<番号>-<説明>` ブランチを切り、PR を経由して `main` に入れます。

## ライセンス

個人用プロジェクトのためライセンスは設定していません（`package.json` は `private: true`）。
