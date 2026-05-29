import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.finnhub.io",
      },
    ],
  },
};

export default nextConfig;
