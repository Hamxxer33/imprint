import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  transpilePackages: ["@walletconnect/ethereum-provider", "@walletconnect/modal"],
};

export default nextConfig;
