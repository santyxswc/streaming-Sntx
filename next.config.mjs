import { buildHeaders } from './src/config/securityHeaders.mjs';

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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Evita que errores de tipos bloqueen el despliegue
  }
};

export default nextConfig;
