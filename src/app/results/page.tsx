import type { Metadata } from 'next'
import { ProfileForgeApp } from '@/components/profileforge/app-shell'

export const metadata: Metadata = {
  title: 'AI 프로필 생성 결과 | ProfileForge AI',
  description: '생성된 AI 프로필 결과를 확인하고 다운로드하거나 이메일 첨부 결과를 다시 받을 수 있습니다.',
  alternates: { canonical: '/results' },
  robots: { index: false, follow: true },
}

export default function ResultsPage() {
  return <ProfileForgeApp initialStep="results" />
}
