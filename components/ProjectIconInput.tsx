"use client";

import { ChangeEvent, useId, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { ProjectIcon } from "@/components/ProjectIcon";
import { removeProjectIcon, uploadProjectIcon } from "@/lib/services/project-icons";
import { ALLOWED_ICON_TYPES, MAX_ICON_BYTES, formatBytes } from "@/lib/project-icon-rules";

/**
 * ProjectIconInput: プロジェクトのアイコン画像を選ぶUI (Issue #82)。
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 同じファイルを選び直しても change が発火するよう、値をすぐ空に戻す
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    const previous = value;

    try {
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
  };

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

      <div className="mt-2 flex items-center gap-3">
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
            ref={inputRef}
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
        {acceptedLabel} / {formatBytes(MAX_ICON_BYTES)}まで
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
