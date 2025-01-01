/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "localhost" }, { hostname: "randomuser.me" }, { hostname: "divinetalk.ai" }],
  },
  assetPrefix: process.env.NEXT_PUBLIC_BASE_URL,

};

export default nextConfig;
