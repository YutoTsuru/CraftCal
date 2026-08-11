import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

/**
 * ESLint の設定 (Issue #73)。
 *
 * これまで設定ファイルが無く、`npm run lint` が呼ぶ `next lint` は
 * 対話的な初期設定を求めてきて実質動かない状態だった（CIからも呼べない）。
 *
 * ESLint 9 はフラット設定が既定だが、eslint-config-next はまだ従来形式なので
 * FlatCompat 経由で読み込む。
 */
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url))
});

const config = [
  {
    // 生成物・依存は対象外
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "tsconfig.tsbuildinfo"]
  },
  ...compat.extends("next/core-web-vitals")
];

export default config;
