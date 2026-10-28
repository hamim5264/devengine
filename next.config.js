/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() { return [{source:"/careers",destination:"/career",permanent:true}]; },
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
