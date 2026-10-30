import type { NextConfig } from "next";

// Static export: `next build` writes a plain static site to `out/`.
// NEXT_PUBLIC_BASE_PATH is only needed when hosting under a sub-path
// (e.g. GitHub Pages project site: "/pro_hub").
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  reactStrictMode: true,
};

export default nextConfig;
