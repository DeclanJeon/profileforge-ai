'use client'

import { useProfileStore } from '@/store/profile-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Upload,
  Wand2,
  Download,
  Shield,
  Clock,
  Users,
  Zap,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  Lock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CONCEPTS,
} from '@/lib/profileforge/concepts'

const SAMPLE_CONCEPT_IDS = [
  'pro-corporate-navy',
  'social-night-market',
  'editorial-vogue-style',
  'cosplay-fantasy-mage',
  'fantasy-knight',
  'scifi-astronaut',
  'anime-monster-partner-adventurer',
  'wedding-full-shot-classic',
  'sports-football-player-full-shot',
  'idol-stage-full-shot',
  'model-runway-full-shot',
  'art-pop-art',
] as const

const SAMPLE_CONCEPTS = SAMPLE_CONCEPT_IDS.map((id) => {
  const concept = CONCEPTS.find((item) => item.id === id)
  if (!concept) {
    throw new Error(`Missing landing sample concept: ${id}`)
  }
  return concept
})

const USE_CASES = [
  { icon: '💼', title: '구직자/직장인', desc: '이력서, LinkedIn, 회사 프로필용 프로페셔널 헤드샷' },
  { icon: '🚀', title: '프리랜서/창업자', desc: '신뢰감 있는 개인 브랜드 PR 포트레이트' },
  { icon: '📷', title: '크리에이터', desc: 'SNS 썸네일, 유튜브/트위치 프로필' },
  { icon: '🎮', title: '게이머/팬덤', desc: '캐릭터화된 아바타와 코스프레 프로필' },
  { icon: '⚔️', title: '취미 사용자', desc: '판타지/영화적 자기 연출 포트레이트' },
  { icon: '📄', title: '증명사진 수요자', desc: '규격에 가까운 깔끔한 스타일 (비공식)' },
]

const FLOW = [
  { icon: Upload, title: '1. 업로드', desc: '얼굴이 잘 보이는 사진 1~5장 드래그 앤 드롭' },
  { icon: Wand2, title: '2. 컨셉 선택', desc: '9개 카테고리 50+ 컨셉 중 선택' },
  { icon: Sparkles, title: '3. 자동 생성', desc: '기본 1장, 필요하면 최대 4장까지 생성' },
  { icon: Download, title: '4. 다운로드', desc: '크롭/보정 후 LinkedIn·이력서 비율로 저장' },
]

export function Landing() {
  const { setStep, setPolicyOpen } = useProfileStore()

  return (
    <div className="space-y-16 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden pt-10 md:pt-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-300/30 dark:bg-fuchsia-900/20 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-rose-300/30 dark:bg-rose-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-amber-200/30 dark:bg-amber-900/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
              <Sparkles className="w-3 h-3 mr-1.5 text-fuchsia-500" />
              AI Profile Generation · Beta
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              사진 한 장으로,
              <br />
              <span className="bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                완벽한 프로필
              </span>
              을 만들어 드려요
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              얼굴 정체성을 보존하면서 이력서·LinkedIn·SNS·코스프레·판타지 프로필까지.
              생성은 대기열에서 처리되고 완료되면 이메일로 다운로드 링크를 보내드립니다.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="h-12 px-7 text-base bg-gradient-to-r from-fuchsia-600 to-rose-500 hover:from-fuchsia-700 hover:to-rose-600 shadow-md"
                onClick={() => setStep('upload')}
              >
                <Upload className="w-4 h-4 mr-2" />
                무료로 시작하기
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-7 text-base"
                onClick={() => setPolicyOpen(true)}
              >
                <Shield className="w-4 h-4 mr-2" />
                안전 정책 확인
              </Button>
            </div>
            <div className="mt-5 flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 20 크레딧 무료 제공
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 다운로드 링크 24시간 유효
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 모델 학습 미사용
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sample Gallery (real concept thumbnails) */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">다양한 컨셉 미리보기</h2>
          <p className="text-muted-foreground text-sm mt-2">
            9개 카테고리 · 62개 핵심 컨셉 · 확장 프롬프트 라이브러리
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {SAMPLE_CONCEPTS.map((concept, idx) => (
            <motion.div
              key={concept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
            >
              <Card
                className="overflow-hidden border-0 p-0 shadow-md hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => setStep('upload')}
              >
                <div className="aspect-[4/5] relative bg-muted">
                  <img
                    src={`/concept-thumbnails/${concept.id}.webp`}
                    alt={`${concept.name} concept preview`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading={idx < 4 ? 'eager' : 'lazy'}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute left-3 right-3 bottom-3 text-white">
                    <Badge variant="secondary" className="mb-1.5 text-[10px] h-5 bg-white/90 text-slate-900">
                      {CATEGORY_LABELS[concept.category]}
                    </Badge>
                    <p className="font-semibold text-sm leading-tight">{concept.name}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/80">
                      {concept.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Flow */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">4단계로 끝나는 프로필 제작</h2>
          <p className="text-muted-foreground text-sm mt-2">복잡한 프롬프트 작성은 ProfileForge가 알아서</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {FLOW.map((f, idx) => {
            const Icon = f.icon
            return (
              <Card key={idx} className="relative border-2 hover:border-fuchsia-300 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Use cases */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">누구를 위한 서비스인가요?</h2>
          <p className="text-muted-foreground text-sm mt-2">사용 사례별 추천 컨셉</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {USE_CASES.map((u, idx) => (
            <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex items-start gap-3 pt-5">
                <div className="text-2xl">{u.icon}</div>
                <div>
                  <h3 className="font-semibold text-sm">{u.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{u.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">9개 카테고리</h2>
          <p className="text-muted-foreground text-sm mt-2">전문부터 판타지까지</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
          {CATEGORY_ORDER.map((cat) => {
            const count = CONCEPTS.filter((c) => c.category === cat).length
            return (
              <div
                key={cat}
                className="aspect-square rounded-xl bg-gradient-to-br from-fuchsia-50 to-rose-50 dark:from-fuchsia-950/30 dark:to-rose-950/30 border border-fuchsia-100 dark:border-fuchsia-900 p-2 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform cursor-pointer"
                onClick={() => setStep('upload')}
              >
                <span className="text-[10px] font-semibold text-fuchsia-700 dark:text-fuchsia-300">{CATEGORY_LABELS[cat]}</span>
                <span className="text-[10px] text-muted-foreground mt-1">{count}개</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Trust signals */}
      <section className="max-w-6xl mx-auto px-4">
        <Card className="border-2 border-fuchsia-200 dark:border-fuchsia-900 bg-gradient-to-br from-fuchsia-50/50 to-rose-50/50 dark:from-fuchsia-950/20 dark:to-rose-950/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <TrustItem icon={Lock} title="정체성 보존" desc="identity-lock 프롬프트로 원본 인물을 그대로" />
              <TrustItem icon={Clock} title="24시간 다운로드" desc="링크 만료 후 결과 삭제, 즉시 삭제도 가능" />
              <TrustItem icon={Users} title="본인 확인" desc="본인 또는 권한 있는 인물 사진만 업로드" />
              <TrustItem icon={Zap} title="대기열 처리" desc="브라우저를 닫아도 완료 후 이메일 발송" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 text-center pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ImageIcon className="w-12 h-12 mx-auto text-fuchsia-500 mb-3" />
          <h2 className="text-3xl font-bold mb-2">지금 바로 시작하세요</h2>
          <p className="text-muted-foreground text-sm mb-5">
            20개 무료 크레딧으로 첫 프로필을 만들어보세요. 카드 등록 불필요.
          </p>
          <Button
            size="lg"
            className="h-12 px-8 text-base bg-gradient-to-r from-fuchsia-600 to-rose-500 hover:from-fuchsia-700 hover:to-rose-600"
            onClick={() => setStep('upload')}
          >
            <Upload className="w-4 h-4 mr-2" />
            사진 업로드하기
          </Button>
        </motion.div>
      </section>
    </div>
  )
}

function TrustItem({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-300" />
      </div>
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
