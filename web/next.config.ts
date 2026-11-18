import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker images set DOCKER_BUILD=1 to get a minimal standalone server.
  // Vercel builds leave it unset and use their own output.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
