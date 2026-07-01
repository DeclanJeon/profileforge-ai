import type { Metadata } from 'next'
import { ProfileForgeApp } from '@/components/profileforge/app-shell'

export const metadata: Metadata = {
  title: 'ProfileForge AI | 사진 한 장으로 만드는 AI 프로필 사진',
  description: '사진 한 장으로 LinkedIn, 이력서, SNS, 판타지, 코스프레용 AI 프로필 이미지를 만들고 결과를 이메일 첨부파일로 받아보세요.',
  alternates: { canonical: '/' },
}

export default function Home() {
  return <ProfileForgeApp initialStep="landing" />
}
