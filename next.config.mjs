/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "localhost" }, { hostname: "randomuser.me" }, { hostname: "divinetalk.ai" }],
  },

};

export default nextConfig;
