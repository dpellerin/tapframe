import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.TAPFRAME_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  output: "standalone",
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  outputFileTracingIncludes: {
    "/*": [
      "node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**/*",
    ],
    "/api/health": ["src/lib/fonts/*.ttf"],
    "/api/render": ["src/lib/fonts/*.ttf"],
    "/api/display/send": ["src/lib/fonts/*.ttf"],
  },
};

export default nextConfig;
