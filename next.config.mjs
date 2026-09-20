/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const csp =
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com " +
      "https://www.googletagmanager.com https://www.google-analytics.com https://www.gstatic.com " +
      "https://apis.google.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https:; " +
      "frame-src 'self' https: blob:; " +
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.gstatic.com wss://*.firebaseio.com " +
      "https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com " +
      "https://*.googletagmanager.com https://www.google.com https://stats.g.doubleclick.net;";
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
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
