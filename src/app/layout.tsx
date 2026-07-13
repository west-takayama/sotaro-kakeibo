import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_DESC = "カード明細(PDF/CSV)を自動仕分けし、自分専用の決算書(P/L・B/S)ができる無料の家計簿・資産管理アプリ。データは端末内のみ・広告なし・登録不要。";
export const metadata: Metadata = {
  title: "マイ決算書 — 自分専用の決算書ができる家計簿・資産管理アプリ",
  description: APP_DESC,
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "マイ決算書" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: {
    title: "マイ決算書",
    description: APP_DESC,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "マイ決算書", description: APP_DESC, images: ["/og.png"] },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, themeColor: "#0b0b1a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head><link rel="apple-touch-icon" href="/icon-192.png" /></head>
      <body>{children}</body>
    </html>
  );
}
