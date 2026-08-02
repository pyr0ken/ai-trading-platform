import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
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


