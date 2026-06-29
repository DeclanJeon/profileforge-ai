'use client'

import { useProfileStore } from '@/store/profile-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Lock,
  Trash2,
  Clock,
  Users,
  AlertTriangle,
  FileText,
  Eye,
  Ban,
} from 'lucide-react'

export function PolicyDialog() {
  const { policyOpen, setPolicyOpen } = useProfileStore()

  return (
    <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-fuchsia-500" />
            안전 · 정책 · 컴플라이언스
          </DialogTitle>
          <DialogDescription className="text-xs">
            ProfileForge AI는 안전한 AI 프로필 생성을 위해 다음 정책을 적용합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <Section
            icon={Users}
            title="업로드 권한"
            color="text-fuchsia-600"
          >
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              <li>본인 또는 생성 권한이 있는 인물 이미지만 업로드할 수 있습니다.</li>
              <li>타인의 얼굴, 유명인, 미성년자 부적절 이미지, 기만적 신분 생성은 지원하지 않습니다.</li>
              <li>업로드 전 명시적 동의를 받습니다.</li>
            </ul>
          </Section>

          <Section
            icon={FileText}
            title="여권/증명사진 고지"
            color="text-amber-600"
          >
            <p className="text-xs text-muted-foreground">
              미국 국무부 기준으로 AI 또는 디지털 변경 사진은 공식 여권에 허용되지 않습니다.
              따라서 본 서비스의 “여권/증명사진 스타일”은 <strong>공식 제출용이 아니라 “스타일 참고/비공식 용도”</strong>임을 명확히 고지합니다.
              다운로드 시에도 재차 안내 문구가 표시됩니다.
            </p>
          </Section>

          <Section
            icon={Ban}
            title="직업 오인 방지"
            color="text-rose-600"
          >
            <p className="text-xs text-muted-foreground">
              의사 가운, 군복, 경찰복, 공무원 제복 등은 허위 자격 오인 가능성이 있어
              별도 고지 또는 제한됩니다. 생성 시 “inspired original” 가이드를 따릅니다.
            </p>
          </Section>

          <Section
            icon={Lock}
            title="정체성 보존 (Identity-Lock)"
            color="text-fuchsia-600"
          >
            <p className="text-xs text-muted-foreground">
              모든 프롬프트는 identity-lock 문장을 포함하여 원본 인물의 정체성을 보존합니다.
              얼굴 유사도 점수와 보수적 모드 기본값으로 얼굴이 바뀌는 리스크를 최소화합니다.
            </p>
          </Section>

          <Section
            icon={Clock}
            title="데이터 보관 · 삭제"
            color="text-emerald-600"
          >
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              <li>생성 결과 이미지는 <strong>10분 후 자동 삭제</strong>되고, 업로드 원본은 30분 후 자동 삭제됩니다.</li>
              <li>사용자가 즉시 삭제할 수 있습니다 (업로드·결과 임시 파일 일괄 삭제).</li>
              <li>모델 학습용 얼굴 데이터 영구 보관은 <strong>기본 사용하지 않습니다</strong>.</li>
              <li>생성 결과는 공개 정적 경로가 아닌 API 전용 no-store 임시 경로로만 제공됩니다.</li>
            </ul>
          </Section>

          <Section
            icon={AlertTriangle}
            title="생성 결과 사용 안내"
            color="text-amber-600"
          >
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              <li>다운로드 전 “원본과 다르게 보일 수 있음” 경고가 표시됩니다.</li>
              <li>피부 보정은 “자연/중간/강함”으로 제한되며 과도한 신체 변형은 금지됩니다.</li>
              <li>사용자가 선택한 경우 AI 생성 라벨/메타데이터를 결과물에 포함할 수 있습니다.</li>
              <li>유명 IP 직접명 입력은 제한되며 “inspired original” 가이드를 따릅니다.</li>
            </ul>
          </Section>

          <Section
            icon={Eye}
            title="품질 평가 기준"
            color="text-cyan-600"
          >
            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
              <Badge variant="outline" className="justify-start">얼굴 유사도: 원본 인물로 인식 가능</Badge>
              <Badge variant="outline" className="justify-start">사진 품질: 흐림/노이즈/깨짐 없음</Badge>
              <Badge variant="outline" className="justify-start">컨셉 적합도: 의상·배경·조명 반영</Badge>
              <Badge variant="outline" className="justify-start">안전성: 타인/IP/제복/성적/혐오 리스크 없음</Badge>
              <Badge variant="outline" className="justify-start">상업적 완성도: 썸네일에서도 분위기 명확</Badge>
            </div>
          </Section>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">신고 · 문의</p>
            <p>
              부적절한 결과물 발견 시 결과 카드에서 신고할 수 있습니다. 신고된 이미지는 검토 후 삭제됩니다.
              모든 생성물은 AI로 생성되었으며 공식 문서 제출용이 아님을 다시 한번 안내드립니다.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className={`text-sm font-semibold flex items-center gap-2 ${color}`}>
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      {children}
    </div>
  )
}
