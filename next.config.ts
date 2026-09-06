import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['35.213.128.99'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
