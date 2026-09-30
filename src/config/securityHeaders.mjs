// Política de cabeceras HTTP. Vive aparte de next.config.mjs para poder testearla.

// Rutas de solo lectura que consumen la app de escritorio (origen distinto).
// El resto de /api/* (chat, admin, ingesta, IA) no emite cabeceras CORS.
export const PUBLIC_CORS_ROUTES = ['/api/media/:path*', '/api/media', '/api/feed/:path*', '/api/auth/limit'];

// `https` indica que el sitio se sirve bajo HTTPS real (p. ej. Vercel); en localhost es false.
export function buildCsp({ isProd, https = false }) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      // Next.js lo necesita solo en desarrollo (HMR, source maps).
      ...(isProd ? [] : ["'unsafe-eval'"]),
      'https://www.youtube.com',
      'https://s.ytimg.com',
      'https://www.gstatic.com',
      'https://apis.google.com',
      // Firebase Analytics (getAnalytics) inyecta gtag.js en ejecución.
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    // Solo se embeben tráilers de YouTube; Firebase Auth necesita sus iframes.
    'frame-src': [
      "'self'",
      'https://www.youtube-nocookie.com',
      'https://www.youtube.com',
      'https://*.firebaseapp.com',
      'https://apis.google.com',
      'https://accounts.google.com',
    ],
    'connect-src': [
      "'self'",
      'https://*.googleapis.com',
      'https://*.firebaseio.com',
      'https://*.gstatic.com',
      'wss://*.firebaseio.com',
      // Envío de eventos de Firebase Analytics / GA4.
      'https://www.google-analytics.com',
      'https://*.google-analytics.com',
      'https://www.googletagmanager.com',
      'https://*.googletagmanager.com',
      'https://www.google.com',
      'https://stats.g.doubleclick.net',
      ...(isProd ? [] : ['ws:', 'http://localhost:*']),
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    ...(https ? { 'upgrade-insecure-requests': [] } : {}),
  };

  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(' '))
    .join('; ');
}

export function buildSecurityHeaders({ isProd, https = false }) {
  return [
    { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // Obsoleta: "0" desactiva el auditor XSS de navegadores antiguos, que introducía fallos.
    { key: 'X-XSS-Protection', value: '0' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
    ...(https
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
      : []),
    { key: 'Content-Security-Policy', value: buildCsp({ isProd, https }) },
  ];
}

export const publicCorsHeaders = [
  { key: 'Access-Control-Allow-Origin', value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
];

export function buildHeaders({ isProd, https = false }) {
  return [
    { source: '/:path*', headers: buildSecurityHeaders({ isProd, https }) },
    ...PUBLIC_CORS_ROUTES.map((source) => ({ source, headers: publicCorsHeaders })),
  ];
}
