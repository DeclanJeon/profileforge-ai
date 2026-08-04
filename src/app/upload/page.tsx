import type { Metadata } from 'next'
import { ProfileForgeApp } from '@/components/profileforge/app-shell'

export const metadata: Metadata = {
  title: '얼굴 사진 업로드 | ProfileForge AI',
  description: '같은 사람의 정면·측면·다른 표정 사진을 여러 장 업로드해 더 정확한 AI 프로필을 생성하세요.',
  alternates: { canonical: '/upload' },
  robots: { index: false, follow: true },
}

export default function UploadPage() {
  return <ProfileForgeApp initialStep="upload" />
}
