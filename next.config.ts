import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Een losse server.js met alleen wat nodig is, voor de desktop-app.
  output: "standalone",
};

export default nextConfig;
