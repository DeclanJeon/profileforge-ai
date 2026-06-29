import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProfileForge AI - AI 프로필 자동 생성 웹앱",
  description: "사진 한 장으로 이력서·LinkedIn·SNS·코스프레·판타지 프로필을 3분 안에 만들어 드려요. 얼굴 정체성을 보존하는 identity-lock 프롬프트 엔진.",
  keywords: ["AI 프로필", "프로필 사진", "LinkedIn", "이력서 사진", "AI 이미지 생성", "ProfileForge"],
  authors: [{ name: "ProfileForge AI" }],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
  },
  openGraph: {
    title: "ProfileForge AI",
    description: "AI 프로필 자동 생성 웹앱",
    siteName: "ProfileForge AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProfileForge AI",
    description: "AI 프로필 자동 생성 웹앱",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
