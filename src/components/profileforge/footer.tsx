'use client'

import { useProfileStore } from '@/store/profile-store'
import { Sparkles, Shield, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Footer() {
  const { setPolicyOpen } = useProfileStore()

  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold">ProfileForge AI</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              본인 사진 한 장으로 이력서·LinkedIn·SNS·코스프레·판타지 프로필을 만드는 AI 웹앱.
              생성은 대기열에서 처리되며 완료 후 이메일로 다운로드 링크를 보내드립니다.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">
              안전 · 정책
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>본인 또는 권한 있는 인물 사진만 업로드</li>
              <li>여권/증명사진은 “스타일 참고용” (공식 제출 불가)</li>
              <li>미성년자/유명인/타인 얼굴 생성 제한</li>
              <li>의사·군인·경찰 등 제복 오인 방지</li>
            </ul>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 mt-2 text-xs"
              onClick={() => setPolicyOpen(true)}
            >
              <Shield className="w-3 h-3 mr-1" />
              전체 정책 보기
            </Button>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">
              데이터 보관
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>다운로드 링크 24시간 · 원본 30분 TTL 삭제</li>
              <li>모델 학습 미사용 (기본값)</li>
              <li>사용자 즉시 삭제 지원</li>
              <li>API 전용 no-store 임시 제공</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© 2026 ProfileForge AI · 본 제품은 AI로 생성된 결과물이며 공식 문서 제출용이 아닙니다.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for everyone
          </p>
        </div>
      </div>
    </footer>
  )
}
