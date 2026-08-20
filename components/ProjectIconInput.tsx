"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useId, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { ProjectIcon } from "@/components/ProjectIcon";
import { removeProjectIcon, uploadProjectIcon } from "@/lib/services/project-icons";
import {
  ALLOWED_ICON_TYPES,
  MAX_ICON_BYTES,
  formatBytes,
  pickPastedImage
} from "@/lib/project-icon-rules";

/**
 * ProjectIconInput: プロジェクトのアイコン画像を選ぶUI (Issue #82)。
 *
 * 受け取り方は3通り。どれも同じ検証・アップロード処理を通る:
 *   - ボタンからのファイル選択
 *   - 枠へのドラッグ&ドロップ
 *   - クリップボードからの貼り付け (Ctrl+V)
 *
 * 選んだ時点でアップロードし、保存先パスを onChange で親へ返す。
 * 親（プロジェクトのフォーム）は受け取ったパスを iconPath として保存する。
 *
 * 差し替え時は、新しい画像のアップロードが成功してから古いファイルを消す。
 * 順序を逆にすると、アップロードに失敗したときにアイコンだけ消えてしまう。
 */

type ProjectIconInputProps = {
  /** アップロード先のパスに使う。新規作成時も先に id を決めて渡す */
  projectId: string;
  /** 現在のアイコンのパス（未設定なら null） */
  value: string | null;
  onChange: (iconPath: string | null) => void;
  /** 画像が無いときに出す色の丸の色 */
  color?: string | null;
  name: string;
  className?: string;
};

export function ProjectIconInput({
  projectId,
  value,
  onChange,
  color,
  name,
  className = ""
}: ProjectIconInputProps) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  /** ファイル選択・ドロップ・貼り付けの共通処理 */
  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      const previous = value;

      try {
        // 形式・サイズの検証は uploadProjectIcon の中で行い、
        // 弾いた理由をそのまま画面に出せるメッセージで throw させる
        const path = await uploadProjectIcon(projectId, file);
        onChange(path);

        // 新しい画像が入ってから古いファイルを消す。
        // 消せなくても表示には影響しないため、失敗しても操作は止めない
        if (previous) {
          try {
            await removeProjectIcon(previous);
          } catch {
            // 残骸が残るだけなので握りつぶす
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "アップロードに失敗しました。");
      } finally {
        setBusy(false);
      }
    },
    [projectId, value, onChange]
  );

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 同じファイルを選び直しても change が発火するよう、値をすぐ空に戻す
    event.target.value = "";
    if (file) void handleFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (busy) return;
    // 複数まとめて落とされても、アイコンは1枚なので先頭だけ使う
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  // クリップボードからの貼り付け。
  // 枠にフォーカスを当ててから Ctrl+V を押す運用は分かりにくいため window で受ける。
  // ただし画像を含む貼り付けのときだけ横取りする。テキストの貼り付け（説明欄など）は素通しする。
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (busy) return;
      const file = pickPastedImage(event.clipboardData?.files);
      if (!file) return;

      event.preventDefault();
      void handleFile(file);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile, busy]);

  const handleRemove = async () => {
    if (!value) return;
    setBusy(true);
    setError(null);
    const target = value;
    onChange(null);
    try {
      await removeProjectIcon(target);
    } catch {
      // 参照は外れているので、ファイルが残っても画面には出ない
    } finally {
      setBusy(false);
    }
  };

  const acceptedLabel = ALLOWED_ICON_TYPES.map((t) => t.replace("image/", "").toUpperCase()).join(" / ");

  return (
    <div className={className}>
      <span className="text-sm font-medium text-stone-700">アイコン画像</span>

      {/* ドロップ枠。ドラッグ中は枠線と背景で受け付けることを示す */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3 transition ${
          dragOver ? "border-lime-600 bg-lime-50" : "border-stone-300"
        }`}
      >
        <ProjectIcon name={name} iconPath={value} color={color} size={48} />

        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={inputId}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-surface px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <ImagePlus size={16} aria-hidden="true" />
            {busy ? "アップロード中..." : value ? "画像を変える" : "画像を選ぶ"}
          </label>
          <input
            id={inputId}
            type="file"
            accept={ALLOWED_ICON_TYPES.join(",")}
            onChange={handleSelect}
            disabled={busy}
            className="sr-only"
          />

          {value && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-100 disabled:opacity-60"
            >
              <Trash2 size={16} aria-hidden="true" />
              削除
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-stone-500">
        ドラッグ&ドロップ、Ctrl+V での貼り付けもできます（{acceptedLabel} / {formatBytes(MAX_ICON_BYTES)}まで）
      </p>

      {/* 弾かれた理由をその場に出す。何を直せばよいか分かる文言にしている */}
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
