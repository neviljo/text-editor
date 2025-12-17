import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ["@clerk/nextjs", "@mantine/core", "@mantine/hooks", "yjs", "@blocknote/core", "@blocknote/react"],
  },
};

export default nextConfig;
