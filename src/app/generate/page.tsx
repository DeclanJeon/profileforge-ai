import type { Metadata } from 'next'
import { ProfileForgeApp } from '@/components/profileforge/app-shell'

export const metadata: Metadata = {
  title: 'AI 프로필 생성 진행 | ProfileForge AI',
  description: 'ProfileForge AI 생성 대기열에서 프로필 이미지를 처리하고 진행 상태를 확인합니다.',
  alternates: { canonical: '/generate' },
  robots: { index: false, follow: true },
}

export default function GeneratePage() {
  return <ProfileForgeApp initialStep="generate" />
}
