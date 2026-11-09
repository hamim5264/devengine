/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
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
      ...['/admin/:path*','/staff/:path*','/employee/:path*','/contract/:path*','/project-overview/:path*','/project-progress/:path*','/api/:path*','/login','/reset-password','/checkout','/payment-cancel','/payment-fail','/payment-success'].map(source=>({source,headers:[{key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'}]})),
    ];
  },
  images: {
    unoptimized: true,
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
