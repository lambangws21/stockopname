import type { NextConfig } from "next";

const nextConfig: NextConfig = {

    devIndicators: false,

    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "via.placeholder.com",
        },
      ],
    },
  }
  

export default nextConfig;
