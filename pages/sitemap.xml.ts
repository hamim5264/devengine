import { GetServerSideProps } from "next";
import { getPublishedBlogs, INITIAL_BLOGS } from "@/lib/services/blogService";
import { getAllAppPolicies } from "@/lib/services/appLegalService";

export const getServerSideProps: GetServerSideProps = async ({ res, req }) => {
  const host = req.headers.host || "www.devenginehq.com";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${protocol}://${host}`;

  const staticPages = [
    { loc: "/", changefreq: "daily", priority: 1.0 },
    { loc: "/home", changefreq: "daily", priority: 1.0 },
    { loc: "/projects", changefreq: "weekly", priority: 0.9 },
    { loc: "/services", changefreq: "weekly", priority: 0.9 },
    { loc: "/blog", changefreq: "daily", priority: 0.9 },
    { loc: "/about", changefreq: "monthly", priority: 0.8 },
    { loc: "/pricing", changefreq: "weekly", priority: 0.8 },
    { loc: "/contact", changefreq: "monthly", priority: 0.8 },
    { loc: "/career", changefreq: "weekly", priority: 0.7 },
    { loc: "/reviews", changefreq: "weekly", priority: 0.7 },
    { loc: "/documentation-and-api-access", changefreq: "monthly", priority: 0.6 },
    { loc: "/terms", changefreq: "yearly", priority: 0.5 },
    { loc: "/privacy", changefreq: "yearly", priority: 0.5 },
    { loc: "/privacy-policy", changefreq: "yearly", priority: 0.5 },
    { loc: "/refund-policy", changefreq: "yearly", priority: 0.5 },
    { loc: "/commercial-license", changefreq: "yearly", priority: 0.5 },
    { loc: "/security-protocol", changefreq: "yearly", priority: 0.5 },
  ];

  let blogs: any[] = [];
  try {
    const list = await getPublishedBlogs();
    blogs = list.length ? list : INITIAL_BLOGS.filter((b) => b.isPublished);
  } catch (err) {
    console.warn("Could not load blogs for sitemap:", err);
    blogs = INITIAL_BLOGS.filter((b) => b.isPublished);
  }

  let policies: any[] = [];
  try {
    policies = await getAllAppPolicies();
  } catch (err) {
    console.warn("Could not load app policies for sitemap:", err);
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`
  )
  .join("\n")}
${blogs
  .map((blog) => {
    const lastMod = blog.updatedAt || blog.publishedAt || blog.createdAt || new Date().toISOString();
    return `  <url>
    <loc>${baseUrl}/blog/${encodeURIComponent(blog.slug)}</loc>
    <lastmod>${new Date(lastMod).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  })
  .join("\n")}
${policies
  .map((pol) => {
    return `  <url>
    <loc>${baseUrl}/apps/${encodeURIComponent(pol.slug)}/privacy-policy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "text/xml");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(sitemapXml);
  res.end();

  return {
    props: {},
  };
};

export default function Sitemap() {
  return null;
}
