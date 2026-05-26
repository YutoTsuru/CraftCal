# CraftCal

CraftCalは、個人開発を短期集中で進めるためのスプリント管理ツールです。

## 概要

作りたいものを期間で区切り、タスクを日ごとに自動配置するための自分用Webアプリです。

## 主な機能

- タスク追加
- タスク削除
- タスク状態変更
- タスクの重さ設定
- スプリント期間設定
- 未完了タスクの自動配置
- 今日やること表示
- localStorage保存

## 技術スタック

- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion
- localStorage

## 起動方法

```bash
npm install
npm run dev
```

## 画面構成

- `/` ダッシュボード
- `/tasks` タスク管理
- `/sprint` スプリント生成
- `/today` 今日やること

## 開発方針

2週間で自分が毎日使える最低限の状態を目指します。
Google Calendar連携、AI連携、認証、DB連携は後回しです。
