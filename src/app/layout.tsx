import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

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
  description: "사진 한 장으로 이력서·LinkedIn·SNS·코스프레·판타지 프로필을 만들고, 완료 후 이메일 첨부파일로 결과를 받는 AI 프로필 생성 웹앱.",
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
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
