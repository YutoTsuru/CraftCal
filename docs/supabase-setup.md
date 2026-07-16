# Supabase セットアップ手順 (Issue #33)

CraftCal の認証とデータ保存を動かすために、Supabase 側で一度だけ行う設定です。
コードは実装済みなので、この手順を終えれば動きます。

## 1. Supabase プロジェクトを作る

1. https://supabase.com にサインアップ（無料枠でOK）→「New project」
2. リージョンは Tokyo (ap-northeast-1) 推奨。DBパスワードは控えておく（アプリでは使わない）

## 2. スキーマを流す（SQL は1ファイルだけ・実行は1回）

1. ダッシュボード左メニュー「SQL Editor」→「New query」
2. このリポジトリの `supabase/schema.sql` の中身を全部貼り付けて「Run」
3. 「Success. No rows returned」と出ればOK（テーブル4つ・RLS・トリガーがまとめて作られる）
   - 冪等に書いてあるので、間違えて2回実行しても壊れない

## 3. APIキーを取得して環境変数に設定

ダッシュボード「Project Settings → API」で以下の2つを控える:

- Project URL（`https://xxxx.supabase.co`）
- Publishable key（旧 anon key。**secret / service_role は絶対に使わない**）

### ローカル開発用

リポジトリ直下に `.env.local` を作成（gitignore 済み）:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=（Publishableキー）
```

### 本番 (Vercel)

Vercel の Project → Settings → Environment Variables に同じ2つを追加 → Redeploy。

## 4. 認証の設定（ダッシュボード「Authentication」）

### URL設定（Authentication → URL Configuration）

- Site URL: `https://craftcal.me`
- Redirect URLs に以下を追加:
  - `https://craftcal.me/auth/callback`
  - `http://localhost:3000/auth/callback`（ローカル開発用）

### メール+パスワード

デフォルトで有効。「Confirm email」がONの場合、新規登録後に確認メールのリンクを踏むまでログインできない
（開発中に面倒なら Authentication → Providers → Email で Confirm email をOFFにしてもよい）。

### Googleログイン（Authentication → Providers → Google）

1. [Google Cloud Console](https://console.cloud.google.com) → プロジェクト作成 → 「APIとサービス → 認証情報」
2. 「OAuth クライアント ID」を作成（種類: ウェブアプリケーション）
   - 承認済みのリダイレクトURI: Supabase の Google プロバイダ設定画面に表示される
     `https://xxxx.supabase.co/auth/v1/callback` をコピーして貼る
3. 発行された Client ID / Client Secret を Supabase の Google プロバイダ設定に入力して有効化
   - **Client Secret は Supabase ダッシュボードにだけ入れる。リポジトリや Vercel の env には絶対に置かない**
4. OAuth 同意画面の公開設定（テストユーザーに自分のGmailを追加すればまず動く）

※ Google カレンダーのスコープは付けない（今回はログインのみ。カレンダー連携は別機能として将来実装）

## 5. ローカルでの起動と動作確認

```bash
npm install
npm run dev   # http://localhost:3000
```

1. 未ログインで開く → /login に飛ぶ
2. 新規登録（またはGoogleでログイン）→ ホームが表示される
3. 以前 localStorage にデータがあれば「以前このブラウザに保存したデータが見つかりました」カード → 取り込む
4. タスク・プロジェクトを作成 → Supabase ダッシュボードの「Table Editor」で行が増えていることを確認
5. 別ブラウザ（またはシークレット）で同じアカウントでログイン → 同じデータが見える（端末をまたげるようになった）

## 6. 分離の確認（アカウント2つで）

1. アカウントA でタスク・プロジェクトを作成
2. 別のメールアドレスでアカウントB を作成してログイン
3. B の画面に A のデータが**出ないこと**
4. （念入りに確認するなら）ブラウザの開発者ツールで A のタスクIDを控え、B でログインした状態で
   Console から `await (await fetch(...))` のような直接リクエストをしても RLS が拒否して0件になること

## セキュリティ上の注意

- `.env.local` はコミットしない（gitignore 済み）
- Publishable キーは公開されても RLS が守る前提の鍵。ただし **secret / service_role キーは別物**で、
  これが漏れると RLS を無視して全ユーザーのデータにアクセスできるため、どこにも書かない
- 本番・開発ともリダイレクトURLは上記で登録したものだけが使われる
