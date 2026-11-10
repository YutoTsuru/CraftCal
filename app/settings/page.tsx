"use client";

/**
 * /settings: 設定ページ (Issue #112)。
 * サイドバー下部（モバイルはヘッダー右）の「設定」リンクから来る。
 * 以前 Home に置かれていた「データの管理」(DangerZone) をここに移す。
 * 日常的に使わない危険な操作をホームから遠ざけるため。
 */

import DangerZone from "@/components/DangerZone";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="設定" />
      {/* データ全削除の区画（2段階確認つき） */}
      <DangerZone />
    </div>
  );
}
