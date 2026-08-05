import type { MetadataRoute } from "next";
import { DISALLOWED_PATHS, SITE_URL } from "@/lib/site";

/**
 * /robots.txt を生成する (Issue #62)。
 *
 * 方針: 非公開ルートも「クロールは許可して noindex を読ませる」。
 *
 * robots.txt で Disallow するとクローラがページを取得しなくなり、
 * ページ内の noindex も読まれない。その結果、外部からリンクされていると
 * Google は中身を知らないまま URL だけを検索結果に載せ続ける。
 * 「インデックスから消す」目的では逆効果になるため、除外は各セグメントの
 * layout.tsx が出す noindex に任せる。
 *
 * 例外は /auth/（OAuth の中継。URLにトークンが乗りうるので取得自体をさせない）。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...DISALLOWED_PATHS]
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
