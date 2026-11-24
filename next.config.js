/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Keep one public origin for crawlers, analytics, and canonical links. These
      // redirects take effect once each host is connected to this deployment.
      {
        source: "/:path*",
        has: [{ type: "host", value: "devenginehq.com" }],
        destination: "https://www.devenginehq.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "onyx.devenginehq.com" }],
        destination: "https://www.devenginehq.com/:path*",
        permanent: true,
      },
      { source: "/careers", destination: "/career", permanent: true },
      { source: "/app-lab", destination: "/launchpad", permanent: true },
      { source: "/archive", destination: "/projects", permanent: true },
      { source: "/archive/all", destination: "/projects/all", permanent: true },
      { source: "/privacy", destination: "/privacy-policy", permanent: true },
      { source: "/security", destination: "/security-protocol", permanent: true },
      { source: "/docs", destination: "/documentation-and-api-access", permanent: true },
      { source: "/documentation", destination: "/documentation-and-api-access", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // The public boot route has no visitor-specific response data, so a
        // CDN can serve it without waiting on an application invocation.
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=600, stale-while-revalidate=3600" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
      ...['/admin/:path*','/staff/:path*','/employee/:path*','/contract/:path*','/project-overview/:path*','/project-progress/:path*','/api/:path*','/login','/reset-password','/checkout','/payment-cancel','/payment-fail','/payment-success'].map(source=>({source,headers:[{key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'}]})),
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

module.exports = nextConfig;
