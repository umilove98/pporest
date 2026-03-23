import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { MobileShell } from "@/components/layout/mobile-shell";
import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "PPORest - 내 주변 화장실 찾기",
  description: "위치 기반 화장실 탐색, 리뷰 및 평점 앱",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PPORest",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* GPS를 HTML 파싱 시점에 즉시 시작 — React 하이드레이션보다 먼저 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(!navigator.geolocation)return;window.__geo={p:new Promise(function(resolve){navigator.geolocation.getCurrentPosition(function(pos){var loc={lat:pos.coords.latitude,lng:pos.coords.longitude};window.__geo.result=loc;resolve(loc)},function(){resolve(null)},{enableHighAccuracy:false,timeout:3000,maximumAge:300000})})};})()`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <AuthProvider>
          <MobileShell>{children}</MobileShell>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js")})}`,
          }}
        />
      </body>
    </html>
  );
}
