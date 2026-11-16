import { defineConfig } from "vitest/config";
import path from "node:path";

// 【Windowsの落とし穴】ドライブレターが小文字の作業ディレクトリ（例: Git Bash で
// `cd /c/projects/CraftCal` → process.cwd() が c:\projects\CraftCal）から vitest を実行すると、
// 同じモジュールが別パス扱いで二重ロードされ、全テストが
// 「TypeError: Cannot read properties of undefined (reading 'config')」で収集0件のまま落ちる
// (vitest-dev/vitest#5251)。config の root 指定では直らない（内部が process.cwd() を使うため）。
// 対処: 大文字のパスで実行する（Git Bash なら `cd C:/projects/CraftCal`、PowerShell は常に大文字）。
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname)
    }
  },
  test: {
    include: ["lib/**/*.test.ts"]
  }
});
