import { buildHeaders } from './src/config/securityHeaders.mjs';
import { imageRemotePatterns } from './src/config/imageHosts.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return buildHeaders({
      isProd: process.env.NODE_ENV === 'production',
      // HSTS y upgrade-insecure-requests solo tienen sentido con HTTPS real.
      https: process.env.VERCEL === '1',
    });
  },
  images: {
    remotePatterns: imageRemotePatterns,
    unoptimized: true,
  },
};

export default nextConfig;
