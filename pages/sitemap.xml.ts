import { GetServerSideProps } from "next";
import { getPublishedBlogs, INITIAL_BLOGS } from "@/lib/services/blogService";
import { getAllAppPolicies } from "@/lib/services/appLegalService";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = "https://www.devenginehq.com";
  const staticLastMod = "2026-10-24";

  const staticPages = [
    { loc: "/home", changefreq: "daily", priority: 1.0, lastmod: staticLastMod },
    { loc: "/projects", changefreq: "weekly", priority: 0.9, lastmod: staticLastMod },
    { loc: "/services", changefreq: "weekly", priority: 0.9, lastmod: staticLastMod },
    { loc: "/blog", changefreq: "daily", priority: 0.9, lastmod: staticLastMod },
    { loc: "/about", changefreq: "monthly", priority: 0.8, lastmod: staticLastMod },
    { loc: "/pricing", changefreq: "weekly", priority: 0.8, lastmod: staticLastMod },
    { loc: "/contact", changefreq: "monthly", priority: 0.8, lastmod: staticLastMod },
    { loc: "/career", changefreq: "weekly", priority: 0.7, lastmod: staticLastMod },
    { loc: "/reviews", changefreq: "weekly", priority: 0.7, lastmod: staticLastMod },
    { loc: "/documentation-and-api-access", changefreq: "monthly", priority: 0.6, lastmod: staticLastMod },
    { loc: "/terms", changefreq: "yearly", priority: 0.5, lastmod: staticLastMod },
    { loc: "/privacy-policy", changefreq: "yearly", priority: 0.5, lastmod: staticLastMod },
    { loc: "/refund-policy", changefreq: "yearly", priority: 0.5, lastmod: staticLastMod },
    { loc: "/commercial-license", changefreq: "yearly", priority: 0.5, lastmod: staticLastMod },
    { loc: "/security-protocol", changefreq: "yearly", priority: 0.5, lastmod: staticLastMod },
  ];

  let rawBlogs: any[] = [];
  try {
    const list = await getPublishedBlogs();
    rawBlogs = list.length ? list : INITIAL_BLOGS.filter((b) => b.isPublished);
  } catch (err) {
    console.warn("Could not load blogs for sitemap:", err);
    rawBlogs = INITIAL_BLOGS.filter((b) => b.isPublished);
  }

  // Strictly filter out drafts, unpublished, or invalid slugs
  const validBlogs = rawBlogs.filter(
    (b) =>
      b &&
      b.isPublished !== false &&
      typeof b.slug === "string" &&
      b.slug.trim().length > 0
  );

  let policies: any[] = [];
  try {
    policies = await getAllAppPolicies();
  } catch (err) {
    console.warn("Could not load app policies for sitemap:", err);
  }

  const validPolicies = (policies || []).filter(
    (p) =>
      p &&
      p.isPublished !== false &&
      typeof p.slug === "string" &&
      p.slug.trim().length > 0
  );

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`
  )
  .join("\n")}
${validBlogs
  .map((blog) => {
    const rawDate = blog.updatedAt || blog.publishedAt || blog.createdAt;
    let lastMod = "2026-10-21";
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        lastMod = parsed.toISOString().split("T")[0];
      }
    }
    const cleanSlug = encodeURIComponent(blog.slug.trim());
    return `  <url>
    <loc>${baseUrl}/blog/${cleanSlug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  })
  .join("\n")}
${validPolicies
  .map((pol) => {
    const rawPolDate = pol.updatedAt || pol.createdAt;
    let polLastMod = "2026-10-21";
    if (rawPolDate) {
      const parsed = new Date(rawPolDate);
      if (!isNaN(parsed.getTime())) {
        polLastMod = parsed.toISOString().split("T")[0];
      }
    }
    const cleanSlug = encodeURIComponent(pol.slug.trim());
    return `  <url>
    <loc>${baseUrl}/apps/${cleanSlug}/privacy-policy</loc>
    <lastmod>${polLastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
  res.write(sitemapXml);
  res.end();

  return {
    props: {},
  };
};

export default function Sitemap() {
  return null;
}
