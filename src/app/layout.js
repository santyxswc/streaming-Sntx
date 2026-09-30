import localFont from "next/font/local";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import FirebaseAnalytics from "@/components/layout/FirebaseAnalytics";
import Footer from "@/components/layout/Footer";

// Fuentes alojadas en src/app/fonts (ver LICENSES.txt): el build no depende de Google Fonts.
const fontDisplay = localFont({
  variable: "--font-sora",
  src: [
    { path: "./fonts/sora-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/sora-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/sora-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
});

const fontSans = localFont({
  variable: "--font-plus-jakarta-sans",
  src: [
    { path: "./fonts/plus-jakarta-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

const fontMono = localFont({
  variable: "--font-jetbrains-mono",
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://streaming-sntx.vercel.app";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "streaming-Sntx | Tráilers de Películas y Series",
    template: "%s | streaming-Sntx"
  },
  description: "Descubre películas, series y anime a través de sus tráilers oficiales, con una experiencia cinematográfica y búsqueda asistida por IA.",
  keywords: ["trailers", "peliculas", "series", "anime", "estrenos", "catalogo", "sntx"],
  authors: [{ name: "streaming-Sntx" }],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "streaming-Sntx",
    title: "streaming-Sntx | Tu cartelera de tráilers",
    description: "Más de 100.000 películas y series con sus tráilers oficiales, fichas y recomendaciones.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "streaming-Sntx",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "streaming-Sntx | Tráilers de Películas y Series",
    description: "Descubre lo último en cine y series a través de sus tráilers oficiales.",
    images: ["/og-image.png"],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <FirebaseAnalytics />
        </Suspense>
        <div className="min-h-screen flex flex-col">
          {children}
          <Footer />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
