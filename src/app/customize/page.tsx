import type { Metadata } from 'next'
import { ProfileForgeApp } from '@/components/profileforge/app-shell'

export const metadata: Metadata = {
  title: 'AI 프로필 생성 옵션 조정 | ProfileForge AI',
  description: '정체성 보존 강도, 창의성, 피부 보정, 결과 수 등 AI 프로필 생성 옵션을 조정하세요.',
  alternates: { canonical: '/customize' },
  robots: { index: false, follow: true },
}

export default function CustomizePage() {
  return <ProfileForgeApp initialStep="customize" />
}
