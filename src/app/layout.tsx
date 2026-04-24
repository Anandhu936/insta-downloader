import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InstaGet — Instagram Video & Story Downloader",
  description:
    "Download Instagram videos, reels, and stories for free. Fast, easy, and no login required. Paste the Instagram URL and download instantly.",
  keywords: [
    "instagram downloader",
    "instagram video downloader",
    "instagram reel downloader",
    "instagram story downloader",
    "download instagram videos",
    "save instagram reels",
  ],
  authors: [{ name: "InstaGet" }],
  openGraph: {
    title: "InstaGet — Instagram Video & Story Downloader",
    description:
      "Download Instagram videos, reels, and stories for free. Paste any Instagram URL to download instantly.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "InstaGet — Instagram Video & Story Downloader",
    description: "Download Instagram videos, reels, and stories for free.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "rgba(20, 20, 35, 0.95)",
              color: "#f0f0f5",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              borderRadius: "12px",
              fontSize: "14px",
              padding: "12px 16px",
            },
            success: {
              iconTheme: { primary: "#a78bfa", secondary: "#080810" },
            },
            error: {
              iconTheme: { primary: "#f87171", secondary: "#080810" },
            },
          }}
        />
      </body>
    </html>
  );
}
