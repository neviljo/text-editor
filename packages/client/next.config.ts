import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: [
      "@clerk/nextjs",
      "@mantine/core",
      "@mantine/hooks",
      "@blocknote/core",
      "@blocknote/react",
      "@blocknote/mantine",
      "yjs"
    ],
  },
};

export default nextConfig;
