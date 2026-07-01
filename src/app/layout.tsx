import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from './providers'

const siteUrl = 'https://profileforge.ponslink.com'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'ProfileForge AI',
  title: {
    default: 'ProfileForge AI - AI 프로필 사진 생성기',
    template: '%s',
  },
  description: '사진 한 장으로 이력서·LinkedIn·SNS·코스프레·판타지 프로필을 만들고, 완료 후 이메일 첨부파일로 결과를 받는 AI 프로필 생성 웹앱.',
  keywords: ['AI 프로필', '프로필 사진', 'LinkedIn 프로필 사진', '이력서 사진', 'AI 이미지 생성', '증명사진 스타일', 'ProfileForge'],
  authors: [{ name: 'ProfileForge AI' }],
  creator: 'ProfileForge AI',
  publisher: 'ProfileForge AI',
  alternates: {
    canonical: '/',
    languages: {
      ko: '/',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'AI image generation',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: ['/favicon.svg'],
  },
  openGraph: {
    title: 'ProfileForge AI - AI 프로필 사진 생성기',
    description: '사진 한 장으로 LinkedIn, 이력서, SNS용 AI 프로필 이미지를 생성하고 이메일 첨부파일로 받으세요.',
    url: '/',
    siteName: 'ProfileForge AI',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/logo.svg',
        width: 512,
        height: 512,
        alt: 'ProfileForge AI logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProfileForge AI - AI 프로필 사진 생성기',
    description: '사진 한 장으로 다양한 AI 프로필 이미지를 만들고 이메일 첨부파일로 받으세요.',
    images: ['/logo.svg'],
  },
  other: {
    'geo.region': 'KR',
    'geo.placename': 'South Korea',
    'ai:purpose': 'AI profile photo generation with identity-preserving prompts and temporary storage',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'ProfileForge AI',
  url: siteUrl,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  inLanguage: 'ko-KR',
  description: '사진 한 장으로 LinkedIn, 이력서, SNS, 판타지, 코스프레용 AI 프로필 이미지를 생성하는 웹앱입니다.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
  },
  featureList: [
    'Google login before upload',
    'Identity-preserving AI profile image generation',
    'Temporary upload and generated image retention',
    'Email attachment delivery',
  ],
  potentialAction: {
    '@type': 'UseAction',
    target: `${siteUrl}/upload`,
    name: 'AI 프로필 사진 생성 시작',
  },
  mainEntity: [
    {
      '@type': 'Question',
      name: 'ProfileForge AI는 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '사진 한 장을 기반으로 얼굴 정체성을 보존하면서 이력서, LinkedIn, SNS, 판타지, 코스프레용 프로필 이미지를 생성하는 웹앱입니다.',
      },
    },
    {
      '@type': 'Question',
      name: '생성 결과는 어떻게 받나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Google 로그인 후 생성이 완료되면 로그인한 이메일 주소로 결과 이미지가 첨부파일 형태로 발송됩니다.',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
