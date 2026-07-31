import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['ccxt'],
  // Optimize memory during build and execution
  experimental: {
    // Reduce memory usage during builds
    parallelServerBuildTraces: true,
  },
  // Set explicit limits for memory-intensive operations if needed
  // Note: Most memory limits are set via NODE_OPTIONS in environment variables
};

export default nextConfig;
