import type { MetadataRoute } from "next";
import { INDEXABLE_PATHS, SITE_URL } from "@/lib/site";

/**
 * /sitemap.xml を生成する (Issue #62)。
 *
 * 載せるのは lib/site.ts の INDEXABLE_PATHS だけ（現状はトップページの1件のみ）。
 * CraftCal は認証必須の個人ツールなので、公開してよいURLはそれしかない。
 *
 * noindex を付けたURLをサイトマップに載せると「載せてほしい」と「載せるな」を
 * 同時に伝えることになり矛盾するため、非公開ルートは意図的に含めない。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_PATHS.map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 1
  }));
}
