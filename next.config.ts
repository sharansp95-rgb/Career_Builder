import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.75.5.233"],
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  webpack: (config) => {
    config.cache = false;
    return config;
  },
  images: {
    remotePatterns: [
      // Google profile photos (OAuth)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh4.googleusercontent.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "lh6.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
