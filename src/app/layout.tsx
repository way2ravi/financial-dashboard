import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist_Mono, Inter, Montserrat } from "next/font/google";
import { MobileAppNav } from "@/components/dashboard/MobileAppNav";
import { InformationDisclosure } from "@/components/dashboard/InformationDisclosure";
import { isComingSoonMode } from "@/lib/launch";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Way2Investing",
  description: "Data-driven investment intelligence dashboard",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Way2Investing",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a3a67",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const comingSoon = isComingSoonMode((await headers()).get("host"));
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`min-h-full flex flex-col ${comingSoon ? "" : "pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0"}`}>
        {children}
        {!comingSoon && <InformationDisclosure />}
        {!comingSoon && <MobileAppNav />}
      </body>
    </html>
  );
}
