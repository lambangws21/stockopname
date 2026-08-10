import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {Toaster} from "sonner";
import BackgroundTransactionMonitor from "@/components/BackgroundTransactionMonitor";
import AppTutorial from "@/components/AppTutorial";
import GlobalMotionProvider from "@/components/GlobalMotionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  // Hindari warning preload pada route yang CSS/font-nya baru dipakai
  // setelah hydration atau lazy loading.
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "NEX Stock Implant",
  description: "Stock, scanner, serah terima, dan logistik implant.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NEX Stock",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <GlobalMotionProvider>{children}</GlobalMotionProvider>
        <AppTutorial />
        <BackgroundTransactionMonitor />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
