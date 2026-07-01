import type { Metadata } from 'next'
import { ProfileForgeApp } from '@/components/profileforge/app-shell'

export const metadata: Metadata = {
  title: 'AI 프로필 컨셉 선택 | ProfileForge AI',
  description: 'LinkedIn, 이력서, SNS, 판타지, 코스프레 등 다양한 AI 프로필 사진 컨셉을 선택하세요.',
  alternates: { canonical: '/concepts' },
}

export default function ConceptsPage() {
  return <ProfileForgeApp initialStep="concept" />
}
