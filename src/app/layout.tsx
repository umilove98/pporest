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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <AuthProvider>
          <MobileShell>{children}</MobileShell>
        </AuthProvider>
      </body>
    </html>
  );
}
