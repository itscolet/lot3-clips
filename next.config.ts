import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the session cookie, so we render dynamically and skip Cache Components.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
