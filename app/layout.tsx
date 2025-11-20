import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";
import { ToastProvider } from '../components/ui/toast';
import { TooltipProvider } from '../components/ui/tooltip';

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
  description: "Practica, recita y lee pasajes bíblicos en español",
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
            {children}
            <Analytics />
          </ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
