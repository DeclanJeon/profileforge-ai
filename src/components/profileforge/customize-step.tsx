'use client'

import { signIn, useSession } from 'next-auth/react'
import { useProfileStore } from '@/store/profile-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ArrowLeft,
  ArrowRight,
  Wand2,
  AlertTriangle,
  ShieldAlert,
  Eye,
  Sparkles,
  Crop,
  Palette,
  Lightbulb,
  Smile,
  Shirt,
  Image as ImageIcon,
  RotateCcw,
  Mail,
} from 'lucide-react'
import { CustomizeOptions, buildPrompts } from '@/lib/profileforge/prompt-builder'
import { CATEGORY_LABELS } from '@/lib/profileforge/concepts'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

const ASPECT_OPTIONS: { value: CustomizeOptions['aspectRatio']; label: string; desc: string }[] = [
  { value: '1:1', label: '1:1', desc: 'SNS 프로필' },
  { value: '4:5', label: '4:5', desc: 'LinkedIn/이력서' },
  { value: '3:4', label: '3:4', desc: '증명사진' },
  { value: '16:9', label: '16:9', desc: '와이드 배너' },
]

const SKIN_OPTIONS: { value: CustomizeOptions['skinRetouch']; label: string; desc: string }[] = [
  { value: 'natural', label: '자연스럽게', desc: '주근깨/잡티 일부 유지' },
  { value: 'medium', label: '부드럽게', desc: '피부질감 정리' },
  { value: 'strong', label: '매끄럽게', desc: '보정 강화 (인형 금지)' },
]

const RESULT_COUNT_OPTIONS = [1, 2, 4]

export function CustomizeStep() {
  const { selectedConcept, customize, setCustomize, setStep, resetCustomizeForConcept, uploads, setContactEmail } = useProfileStore()
  const { data: session, status } = useSession()
  const sessionEmail = session?.user?.email || ''
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  useEffect(() => {
    if (sessionEmail) setContactEmail(sessionEmail)
  }, [sessionEmail, setContactEmail])

  if (!selectedConcept) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">컨셉을 먼저 선택해주세요.</p>
        <Button className="mt-3" onClick={() => setStep('concept')}>
          컨셉 선택으로
        </Button>
      </div>
    )
  }

  const built = buildPrompts(selectedConcept, customize)
  const totalCost = selectedConcept.creditCost * customize.resultCount

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sessionEmail)
  const isSignedIn = status === 'authenticated' && emailValid
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">커스터마이즈</h2>
          <p className="text-sm text-muted-foreground mt-1">
            선택한 컨셉의 세부 스타일을 조절하세요.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => resetCustomizeForConcept(selectedConcept)}>
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          기본값으로
        </Button>
      </div>

      {/* Selected concept summary */}
      <Card className="overflow-hidden">
        <div className={cn('h-2 bg-gradient-to-r', getGradient(selectedConcept.category))} />
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-[10px] h-5">
                  {CATEGORY_LABELS[selectedConcept.category]}
                </Badge>
                <span className="text-xs text-muted-foreground">{selectedConcept.creditCost} 크레딧/장</span>
              </div>
              <h3 className="font-bold text-lg">{selectedConcept.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{selectedConcept.description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep('concept')}>
              변경
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk notice */}
      {selectedConcept.riskLevel !== 'safe' && (
        <Alert className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <AlertTitle className="text-sm">안내 사항</AlertTitle>
          <AlertDescription className="text-xs">
            {selectedConcept.notRecommendedFor && (
              <p className="mb-1">
                <strong>부적합 용도:</strong> {selectedConcept.notRecommendedFor}
              </p>
            )}
            {built.safetyNote && <p>{built.safetyNote}</p>}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="style">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="style" className="text-xs"><Sparkles className="w-3.5 h-3.5 mr-1" />스타일</TabsTrigger>
          <TabsTrigger value="adjust" className="text-xs"><Smile className="w-3.5 h-3.5 mr-1" />조정</TabsTrigger>
          <TabsTrigger value="output" className="text-xs"><Crop className="w-3.5 h-3.5 mr-1" />출력</TabsTrigger>
          <TabsTrigger value="prompt" className="text-xs"><Eye className="w-3.5 h-3.5 mr-1" />프롬프트</TabsTrigger>
        </TabsList>

        {/* Style tab */}
        <TabsContent value="style" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Shirt className="w-4 h-4" />의상 · 배경 · 조명 · 표정</CardTitle>
              <CardDescription className="text-xs">빈 칸은 컨셉 기본값이 사용됩니다. 오버라이드하려면 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <OverrideField
                icon={Shirt}
                label="의상"
                placeholder={selectedConcept.outfit}
                value={customize.outfit || ''}
                onChange={(v) => setCustomize({ outfit: v })}
              />
              <OverrideField
                icon={ImageIcon}
                label="배경"
                placeholder={selectedConcept.background}
                value={customize.background || ''}
                onChange={(v) => setCustomize({ background: v })}
              />
              <OverrideField
                icon={Lightbulb}
                label="조명"
                placeholder={selectedConcept.lighting}
                value={customize.lighting || ''}
                onChange={(v) => setCustomize({ lighting: v })}
              />
              <OverrideField
                icon={Smile}
                label="표정"
                placeholder={selectedConcept.expression}
                value={customize.expression || ''}
                onChange={(v) => setCustomize({ expression: v })}
              />
            </CardContent>
          </Card>

          <CreativityCard
            value={customize.creativity}
            onChange={(v) => setCustomize({ creativity: v })}
          />
        </TabsContent>

        {/* Adjust tab */}
        <TabsContent value="adjust" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4" />얼굴 정체성 보존 강도</CardTitle>
              <CardDescription className="text-xs">높을수록 원본 얼굴을 더 충실히 유지합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Slider
                value={[customize.identityLockStrength]}
                onValueChange={(v) => setCustomize({ identityLockStrength: v[0] })}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                <span>느슨한 참고</span>
                <span className="font-semibold text-fuchsia-600">
                  {customize.identityLockStrength >= 75
                    ? '정체성 우선'
                    : customize.identityLockStrength >= 40
                      ? '균형'
                      : '참고용'}
                </span>
                <span>정체성 우선</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Palette className="w-4 h-4" />피부 보정 강도</CardTitle>
              <CardDescription className="text-xs">과도한 신체 변형은 금지됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {SKIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCustomize({ skinRetouch: opt.value })}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    customize.skinRetouch === opt.value
                      ? 'border-fuchsia-500 bg-fuchsia-50/50 dark:bg-fuchsia-950/20'
                      : 'border-border hover:border-muted-foreground/40',
                  )}
                >
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />AI 생성 라벨</CardTitle>
              <CardDescription className="text-xs">결과 이미지에 작게 “AI” 워터마크를 포함합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customize.aiLabel}
                  onChange={(e) => setCustomize({ aiLabel: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">AI 생성 표시 포함</span>
              </label>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Output tab */}
        <TabsContent value="output" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Crop className="w-4 h-4" />출력 비율</CardTitle>
              <CardDescription className="text-xs">용도에 맞는 비율을 선택하세요.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ASPECT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCustomize({ aspectRatio: opt.value })}
                  className={cn(
                    'p-3 rounded-lg border-2 text-center transition-all',
                    customize.aspectRatio === opt.value
                      ? 'border-fuchsia-500 bg-fuchsia-50/50 dark:bg-fuchsia-950/20'
                      : 'border-border hover:border-muted-foreground/40',
                  )}
                >
                  <AspectIcon ratio={opt.value} />
                  <p className="font-bold text-sm mt-1">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" />생성 결과 수</CardTitle>
              <CardDescription className="text-xs">기본 1장으로 빠르게 받고, 필요하면 2~4장으로 선택 폭을 넓힐 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {RESULT_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCustomize({ resultCount: n })}
                  className={cn(
                    'p-3 rounded-lg border-2 text-center transition-all',
                    customize.resultCount === n
                      ? 'border-fuchsia-500 bg-fuchsia-50/50 dark:bg-fuchsia-950/20'
                      : 'border-border hover:border-muted-foreground/40',
                  )}
                >
                  <p className="font-bold text-lg">{n}</p>
                  <p className="text-[10px] text-muted-foreground">{n * selectedConcept.creditCost} 크레딧</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompt preview tab */}
        <TabsContent value="prompt" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4" />생성될 프롬프트 미리보기</CardTitle>
              <CardDescription className="text-xs">identity-lock 문장과 안전 가드가 자동으로 포함됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-emerald-600 mb-1">Positive Prompt</Label>
                <Textarea
                  readOnly
                  value={built.positive}
                  className="text-xs font-mono min-h-[120px] bg-emerald-50/30 dark:bg-emerald-950/10"
                />
              </div>
              <div>
                <Label className="text-xs text-rose-600 mb-1">Negative Prompt</Label>
                <Textarea
                  readOnly
                  value={built.negative}
                  className="text-xs font-mono min-h-[80px] bg-rose-50/30 dark:bg-rose-950/10"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">비율: {built.aspectRatio}</Badge>
                <Badge variant="outline">사이즈: {built.size}</Badge>
                <Badge variant="outline">결과 {customize.resultCount}장</Badge>
                <Badge variant="outline">창의성 {customize.creativity}</Badge>
                <Badge variant="outline">정체성 {customize.identityLockStrength}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-fuchsia-200 bg-fuchsia-50/40 dark:bg-fuchsia-950/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Mail className="w-4 h-4" />결과를 받을 이메일</CardTitle>
          <CardDescription className="text-xs">
            Google 계정 이메일로만 결과 이미지를 첨부 발송합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isSignedIn ? (
            <div className="rounded-lg border bg-background px-3 py-2 text-sm font-medium">
              {sessionEmail}
            </div>
          ) : (
            <Button type="button" onClick={() => signIn('google')} className="w-full bg-gradient-to-r from-fuchsia-600 to-rose-500">
              Google로 로그인하고 이메일 연결
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">
            결과 이미지는 로그인한 Google 이메일에 첨부파일로 발송됩니다.
          </p>
          {!isSignedIn && (
            <p className="text-[11px] text-rose-600">생성하려면 Google 로그인이 필요합니다.</p>
          )}
        </CardContent>
      </Card>

      {/* Cost summary + actions */}
      <div className="sticky bottom-4 bg-background/95 backdrop-blur border rounded-xl p-3 shadow-md">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="text-xs">
              <p className="font-semibold">
                총 {customize.resultCount}장 × {selectedConcept.creditCost} ={' '}
                <span className="text-fuchsia-600">{totalCost} 크레딧</span>
              </p>
              <p className="text-muted-foreground">현재 보유: {useProfileStore.getState().credits} 크레딧</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('concept')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              이전
            </Button>
            <Button
              size="sm"
              disabled={totalCost > useProfileStore.getState().credits || uploads.length === 0 || !isSignedIn}
              onClick={() => {
                setStep('generate')
              }}
              className="bg-gradient-to-r from-fuchsia-600 to-rose-500"
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              이메일로 결과 받기
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
        {totalCost > useProfileStore.getState().credits && (
          <p className="text-[10px] text-rose-600 mt-2">
            크레딧이 부족합니다. 결과 수를 줄이거나 나중에 다시 시도해주세요.
          </p>
        )}
        {!isSignedIn && (
          <p className="text-[10px] text-rose-600 mt-2">
            생성 결과를 받을 Google 계정으로 로그인해주세요.
          </p>
        )}
      </div>
    </div>
  )
}

function OverrideField({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {label}
        <span className="text-muted-foreground font-normal">(기본: {placeholder})</span>
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm"
      />
    </div>
  )
}

function CreativityCard({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wand2 className="w-4 h-4" />컨셉 강도
        </CardTitle>
        <CardDescription className="text-xs">
          보수적(얼굴/현실성 우선) ↔ 균형 ↔ 창의적(코스튬/배경 강함)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          min={0}
          max={100}
          step={5}
          className="mt-2"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
          <span>보수적</span>
          <span className="font-semibold text-fuchsia-600">
            {value < 33 ? '보수적' : value < 66 ? '균형형' : '창의적'}
          </span>
          <span>창의적</span>
        </div>
      </CardContent>
    </Card>
  )
}

function AspectIcon({ ratio }: { ratio: string }) {
  const dims: Record<string, string> = {
    '1:1': 'w-6 h-6',
    '4:5': 'w-5 h-6',
    '3:4': 'w-5 h-6',
    '16:9': 'w-7 h-4',
  }
  return (
    <div className="flex items-center justify-center h-7">
      <div className={cn('border-2 border-current rounded-sm', dims[ratio])} />
    </div>
  )
}

function getGradient(category: string): string {
  const map: Record<string, string> = {
    Professional: 'from-slate-700 via-slate-500 to-slate-300',
    Social: 'from-orange-500 via-amber-400 to-yellow-300',
    'ID-style': 'from-zinc-600 via-zinc-400 to-zinc-200',
    Editorial: 'from-zinc-900 via-zinc-700 to-zinc-500',
    Creator: 'from-fuchsia-600 via-purple-500 to-cyan-400',
    Cosplay: 'from-emerald-700 via-teal-600 to-lime-400',
    Fantasy: 'from-amber-700 via-yellow-600 to-stone-500',
    'Sci-Fi': 'from-indigo-900 via-blue-700 to-slate-400',
    'Art/Avatar': 'from-rose-600 via-pink-500 to-yellow-400',
  }
  return map[category] || 'from-fuchsia-500 to-rose-500'
}
