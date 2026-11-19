import type { NextConfig } from "next";

// Development only: lets a phone on the same Wi-Fi open the dev server by the computer's address.
// Covers the private network ranges; add anything else (a tunnel, for example) in ALLOWED_DEV_ORIGINS, comma separated.
const privateNetworks = ["192.168.*.*", "10.*.*.*", ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`)];
const extraDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: [...privateNetworks, ...extraDevOrigins],
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
