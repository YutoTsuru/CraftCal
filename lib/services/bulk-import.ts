/**
 * lib/services/bulk-import.ts: projects と tasks をまとめて投入する (Issue #76)。
 *
 * seed（サンプルデータ投入）と import（旧 localStorage からの取り込み）は、
 * どちらも「プロジェクトとタスクを両方入れて初めて意味がある」操作なので、
 * 2 テーブルへの INSERT を Postgres 側の関数 1 回にまとめて原子性を確保する。
 *
 * 以前は insertProjects → insertTasks と 2 回に分けて送っていたため、
 * タスク側で失敗するとプロジェクトだけが DB に残った。state のタスクは空のままで
 * ボタンのガード（tasksRef.current.length > 0）に引っかからず、seed は毎回
 * 新しい uuid を振るので、押すたびに同じ内容が重複して増えていた。
 *
 * 関数の定義は supabase/schema.sql の import_user_data。
 * user_id はここでは送らず、RPC 側が auth.uid() で埋める。
 */

import { supabase } from "@/lib/supabase";
import { toDbProjectImportRow, toDbTaskImportRow } from "@/lib/db-mappers";
import type { Project, Task } from "@/types/dev-calendar";

export async function importUserData(projects: Project[], tasks: Task[]): Promise<void> {
  // 両方空なら送る意味がない（RPC は空配列でも成功するが、往復を省く）
  if (projects.length === 0 && tasks.length === 0) {
    return;
  }

  const { error } = await supabase.rpc("import_user_data", {
    p_projects: projects.map(toDbProjectImportRow),
    p_tasks: tasks.map(toDbTaskImportRow)
  });

  if (error) {
    throw error;
  }
}
