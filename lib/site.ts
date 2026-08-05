/**
 * サイト全体で共有する公開情報 (Issue #62)。
 *
 * 役割:
 *   SEO 関連のファイル（app/layout.tsx / robots.ts / sitemap.ts / opengraph-image.tsx）が
 *   同じURLと文言を参照できるようにする単一の情報源。
 *   URLや説明文が3箇所に散らばると、片方だけ直してcanonicalとsitemapが食い違う事故が起きる。
 */

/**
 * 本番の公開URL。
 *
 * metadataBase に渡して、OG画像やcanonicalを絶対URLへ解決させるために使う
 * （これが無いと相対URLのまま出力され、SNS側で画像を取得できない）。
 *
 * Vercel のプレビュー環境では本番ドメインと違うURLになるため、
 * NEXT_PUBLIC_SITE_URL が設定されていればそちらを優先する。
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://craftcal.me";

/** アプリ名。title のテンプレートやOG画像のワードマークに使う */
export const SITE_NAME = "CraftCal";

/**
 * サイトの説明文。
 * README・app/layout.tsx・SplashScreen のタグラインと同じ文言に揃えている。
 */
export const SITE_DESCRIPTION = "個人開発を短期集中で進めるためのスプリント管理ツール";

/**
 * 検索エンジンにインデックスさせるルート。
 *
 * CraftCal は認証必須の個人ツールなので、公開してよいのはトップページだけ。
 * それ以外は各セグメントの layout.tsx で noindex にしている。
 * sitemap.ts はこの配列だけを出力する（noindex のURLをsitemapに載せるのは矛盾するため）。
 */
export const INDEXABLE_PATHS = ["/"] as const;

/**
 * クロール自体を禁止するパス。
 *
 * 原則として非公開ルートも「クロールは許可して noindex を読ませる」方式を取る。
 * robots.txt で塞ぐとクローラがページを取得できず、中の noindex も読まれないため、
 * 外部リンク経由で URL だけが検索結果に残り続けてしまう。
 *
 * 例外がここ。/auth/ は OAuth の中継でURLにトークンが乗りうるので、
 * そもそも取得させない（検索結果に載る導線も無いため noindex を読ませる必要がない）。
 */
export const DISALLOWED_PATHS = ["/auth/"] as const;
