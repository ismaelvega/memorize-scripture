import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";
import { ToastProvider } from '../components/ui/toast';
import { TooltipProvider } from '../components/ui/tooltip';
import { GoogleOAuthAppProvider } from './providers/google-oauth-provider';
import { SyncOnAuthProvider } from './providers/sync-on-auth';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Memoriza Su Palabra",
  description: "Practica, memoriza y repasa pasajes bíblicos de manera efectiva.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "Memoriza Su Palabra",
    description: "Practica, memoriza y repasa pasajes bíblicos de manera efectiva.",
    images: ["/logo_png.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Memoriza Su Palabra",
    description: "Practica, memoriza y repasa pasajes bíblicos de manera efectiva.",
    images: ["/logo_png.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-auto`}>
        <TooltipProvider>
          <ToastProvider>
            <GoogleOAuthAppProvider>
              <SyncOnAuthProvider>
                {children}
                <Analytics />
              </SyncOnAuthProvider>
            </GoogleOAuthAppProvider>
          </ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
