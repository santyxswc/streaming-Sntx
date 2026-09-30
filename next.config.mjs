import { buildHeaders } from './src/config/securityHeaders.mjs';
import { imageRemotePatterns } from './src/config/imageHosts.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Bundle autocontenido para la imagen Docker. En Vercel no se usa: es solo con DOCKER_BUILD=1.
  ...(process.env.DOCKER_BUILD === '1'
    ? {
        output: 'standalone',
        // Las imágenes van `unoptimized`, así que sharp/libvips (~28 MB y con CVEs propios)
        // no se usa nunca. Si algún día se activa el optimizador de imágenes, quita esto.
        outputFileTracingExcludes: { '*': ['node_modules/sharp/**', 'node_modules/@img/**'] },
      }
    : {}),
  async headers() {
    return buildHeaders({
      isProd: process.env.NODE_ENV === 'production',
      // HSTS y upgrade-insecure-requests solo tienen sentido con HTTPS real. Se calculan al
      // compilar: en Docker se activan con el build arg FORCE_HTTPS_HEADERS=1.
      https: process.env.VERCEL === '1' || process.env.FORCE_HTTPS_HEADERS === '1',
    });
  },
  images: {
    remotePatterns: imageRemotePatterns,
    unoptimized: true,
  },
};

export default nextConfig;
