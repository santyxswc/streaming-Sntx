import { Sora, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import FirebaseAnalytics from "@/components/FirebaseAnalytics";
import Footer from "@/components/Footer";

const fontDisplay = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://streaming-sntx.vercel.app";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "streaming-Sntx | Streaming de Películas y Series en HD",
    template: "%s | streaming-Sntx"
  },
  description: "Disfruta del mejor contenido de películas, series y anime con una experiencia premium cinematográfica y búsqueda asistida por IA.",
  keywords: ["streaming", "peliculas", "series", "anime", "hd", "estrenos", "sntx"],
  authors: [{ name: "streaming-Sntx" }],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "streaming-Sntx",
    title: "streaming-Sntx | Tu Cinemateca Premium",
    description: "Cientos de títulos a un click de distancia. La mejor calidad de streaming con diseño cinematográfico.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "streaming-Sntx Streaming Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "streaming-Sntx | Streaming Premium",
    description: "Descubre lo último en cine y series con la mejor experiencia visual.",
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
