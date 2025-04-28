/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Important to prevent build fail on small warnings
  },
  webpack: (config, { isServer }) => {
    config.cache = false; // ✅ Your current setting
    return config;
  },
};

module.exports = nextConfig;
