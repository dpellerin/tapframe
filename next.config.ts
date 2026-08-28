import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.50.196"],
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
};

export default nextConfig;
