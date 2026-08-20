"use client";

import { getProjectIconUrl } from "@/lib/services/project-icons";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";

/**
 * ProjectIcon: プロジェクトの識別マーク (Issue #82)。
 *
 * アイコン画像が設定されていればそれを、無ければ従来どおり色の丸を出す。
 * 一覧・詳細・Home の進捗で同じ見た目を使うため、ここに1つだけ置く。
 *
 * next/image ではなく <img> を使っている理由:
 *   画像のホストは Supabase の環境変数から決まるため、next/image の
 *   remotePatterns に静的に書けない（環境ごとに変わる）。
 *   表示は最大 40px の固定サイズで最適化の恩恵が薄く、
 *   画像最適化の設定を env 依存にする複雑さに見合わないと判断した。
 */

type ProjectIconProps = {
  name: string;
  iconPath?: string | null;
  color?: string | null;
  /** 一辺の px。丸のサイズもこれに合わせる */
  size?: number;
  className?: string;
};

export function ProjectIcon({
  name,
  iconPath,
  color,
  size = 32,
  className = ""
}: ProjectIconProps) {
  const url = getProjectIconUrl(iconPath);
  const style = { width: size, height: size };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        // 装飾ではなく識別のための画像なので、何のアイコンか分かる代替テキストを付ける
        alt={`${name} のアイコン`}
        style={style}
        className={`shrink-0 rounded-lg border border-stone-200 object-cover ${className}`}
      />
    );
  }

  // 未設定なら従来どおり色の丸。アイコンが無くても並びが崩れないよう同じ枠を占める
  return (
    <span
      style={{ ...style, backgroundColor: color ?? DEFAULT_PROJECT_COLOR }}
      className={`shrink-0 rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}
