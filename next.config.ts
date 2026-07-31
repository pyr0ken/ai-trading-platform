import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['ccxt'],
  experimental: {
    // Enable memory optimizations during builds and dev
    memoryBasedWorkersCount: true,
    webpackMemoryOptimizations: true,
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      'clsx',
      'tailwind-merge',
    ],
  },
};

export default nextConfig;

