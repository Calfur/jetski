import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverRuntimeConfig: {
    // Will only be available on the server side
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
  },
  // Disable HMR to prevent WebSocket conflicts
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: false,
      };
    }
    return config;
  },
  /* config options here */
};

export default nextConfig;
