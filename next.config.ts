import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['35.213.128.99'],
  serverExternalPackages: ['better-sqlite3', '@prisma/adapter-better-sqlite3', '@prisma/adapter-mariadb'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
