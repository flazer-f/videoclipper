import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // Allow large video file uploads
    },
  },
  // Fix lockfile warning by explicitly setting workspace root
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
