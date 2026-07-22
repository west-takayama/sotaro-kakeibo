import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";
import { ARTICLES } from "./hints/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/hints`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    ...ARTICLES.map(a => ({
      url: `${SITE_URL}/hints/${a.slug}`,
      lastModified: new Date(a.updated),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
