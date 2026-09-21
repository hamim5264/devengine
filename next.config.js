/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: "bottom-right",
  },
};

module.exports = nextConfig;
