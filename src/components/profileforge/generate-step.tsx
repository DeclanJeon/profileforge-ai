'use client'

import { useSession } from 'next-auth/react'
import { useProfileStore } from '@/store/profile-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Wand2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Info,
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { CATEGORY_LABELS, type Concept } from '@/lib/profileforge/concepts'
import { buildPrompts } from '@/lib/profileforge/prompt-builder'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Stage = 'submitting' | 'queued' | 'running' | 'done' | 'failed'

const STAGES: { id: Stage; label: string }[] = [
  { id: 'submitting', label: '생성 요청 접수' },
  { id: 'queued', label: '대기열 등록 및 순번 확인' },
  { id: 'running', label: '고해상도 프로필 이미지 생성' },
  { id: 'done', label: '다운로드 링크 이메일 발송 준비' },
]

export function GenerateStep() {
  const {
    selectedConcept,
    customize,
    uploads,
    selectedUploadId,
    setStep,
    setResults,
    setJobId,
    setGenerationStatus,
    sessionId,
  } = useProfileStore()
  const { toast } = useToast()
  const { status } = useSession()
  const [stage, setStage] = useState<Stage>('submitting')
  const [overallProgress, setOverallProgress] = useState(8)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [serverMessage, setServerMessage] = useState('생성 요청을 접수하고 있습니다.')
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [serverEtaSeconds, setServerEtaSeconds] = useState<number | null>(null)
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const startedRef = useRef(false)

  const primaryUpload = uploads.find((u) => u.id === selectedUploadId)
  const built = selectedConcept ? buildPrompts(selectedConcept, customize) : null
  const estimatedTime = selectedConcept ? estimateGenerationTime(selectedConcept, customize.resultCount) : null


  useEffect(() => {
    if (startedRef.current || status === 'loading') return
    startedRef.current = true
    void runPipeline()
  }, [status])

  useEffect(() => {
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const runPipeline = async () => {
    if (status !== 'authenticated') {
      setErrorMsg('Google 로그인 후 생성할 수 있습니다.')
      setStage('failed')
      return
    }
    if (!selectedConcept || !primaryUpload || !built) {
      setErrorMsg('필수 정보가 누락되었습니다.')
      setStage('failed')
      return
    }

    setStage('submitting')
    setOverallProgress(8)
    setServerMessage('생성 요청을 접수하고 있습니다.')
    setQueuePosition(null)
    setServerEtaSeconds(null)
    setEmailStatus(null)
    setGenerationStatus(null)

    try {
      const res = await fetch('/api/profileforge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          uploadId: primaryUpload.serverId,
          uploadUrl: primaryUpload.serverUrl || primaryUpload.previewUrl,
          conceptId: selectedConcept.id,
          conceptName: selectedConcept.name,
          positivePrompt: built.positive,
          negativePrompt: built.negative,
          aspectRatio: built.aspectRatio,
          size: built.size,
          resultCount: customize.resultCount,
          creativity: customize.creativity,
          identityLockStrength: customize.identityLockStrength,
          skinRetouch: customize.skinRetouch,
          aiLabel: customize.aiLabel,
          thumbnailPrompt: selectedConcept.thumbnailPrompt,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '생성 실패' }))
        throw new Error(err.error || '이미지 생성에 실패했습니다.')
      }

      const initial = await res.json()
      const newJobId = initial.jobId as string | undefined
      if (!newJobId) throw new Error('생성 작업 ID를 받지 못했습니다.')
      setJobId(newJobId)

      setStage(initial.status === 'running' ? 'running' : 'queued')
      setServerMessage(initial.message || '생성 요청이 접수되었습니다.')
      setQueuePosition(typeof initial.queuePosition === 'number' ? initial.queuePosition : null)
      setServerEtaSeconds(typeof initial.estimatedWaitSeconds === 'number' ? initial.estimatedWaitSeconds : null)
      setEmailStatus(initial.emailStatus || null)
      setOverallProgress(initial.status === 'running' ? 45 : 18)

      const startedAt = Date.now()
      const maxWaitMs = 45 * 60 * 1000
      while (Date.now() - startedAt < maxWaitMs) {
        const statusRes = await fetch(`/api/profileforge/generate?jobId=${encodeURIComponent(newJobId)}`, {
          cache: 'no-store',
        })
        if (!statusRes.ok) {
          const err = await statusRes.json().catch(() => ({ error: '생성 상태 확인 실패' }))
          throw new Error(err.error || '생성 상태 확인에 실패했습니다.')
        }

        const data = await statusRes.json()
        setServerMessage(data.message || '작업 상태를 확인하고 있습니다.')
        setQueuePosition(typeof data.queuePosition === 'number' ? data.queuePosition : null)
        setServerEtaSeconds(typeof data.estimatedWaitSeconds === 'number' ? data.estimatedWaitSeconds : null)
        setEmailStatus(data.emailStatus || null)

        if (data.status === 'queued') {
          setStage('queued')
          setOverallProgress(22)
        } else if (data.status === 'running') {
          setStage('running')
          setOverallProgress((current) => Math.max(current, Math.min(92, current + 4)))
        }

        if (Array.isArray(data.images) && data.images.length > 0) {
          setResults(data.images)
          setOverallProgress(Math.min(96, 80 + data.images.length * 4))
        }

        if (data.status === 'succeeded' || data.status === 'partially_succeeded') {
          setResults(data.images || [])
          setGenerationStatus(data.status)
          setOverallProgress(100)
          setStage('done')
          toast({
            title: data.status === 'partially_succeeded' ? '일부 생성 완료' : '생성 완료',
            description: data.message || `${data.images?.length || 0}장의 프로필이 생성되었습니다. 이메일로 다운로드 링크를 보냈습니다.`,
          })
          setTimeout(() => setStep('results'), 600)
          return
        }

        if (data.status === 'failed') {
          throw new Error(data.message || data.error || '이미지 생성에 실패했습니다.')
        }

        await new Promise((r) => setTimeout(r, 5000))
      }

      throw new Error('이미지 생성 시간이 너무 오래 걸립니다. 잠시 후 결과 화면을 다시 확인해주세요.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류'
      setErrorMsg(translateError(msg))
      setStage('failed')
      toast({
        title: '생성 실패',
        description: translateError(msg),
        variant: 'destructive',
      })
    }
  }

  const handleRetry = () => {
    startedRef.current = false
    setErrorMsg(null)
    setOverallProgress(8)
    setServerMessage('생성 요청을 접수하고 있습니다.')
    setQueuePosition(null)
    setServerEtaSeconds(null)
    setEmailStatus(null)
    setStage('submitting')
    setStep('customize')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <div className="text-center">
        <div className="inline-flex w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 items-center justify-center shadow-md mb-3">
          {stage === 'failed' ? (
            <XCircle className="w-8 h-8 text-white" />
          ) : stage === 'done' ? (
            <CheckCircle2 className="w-8 h-8 text-white" />
          ) : (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          )}
        </div>
        <h2 className="text-2xl font-bold">
          {stage === 'failed' ? '생성 실패' : stage === 'done' ? '생성 완료!' : stage === 'submitting' ? '요청 접수 중' : stage === 'queued' ? '대기열에서 처리 중' : '프로필 생성 중'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {stage === 'failed'
            ? '다시 시도하거나 컨셉을 변경해보세요.'
            : stage === 'done'
              ? '결과 비교 화면으로 이동합니다...'
              : `${selectedConcept?.name} · ${customize.resultCount}장 생성`}
        </p>
      </div>

      {/* Progress bar */}
      {stage !== 'failed' && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium">처리 상태</span>
              <span className="tabular-nums">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2.5" />
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {elapsedSec}초 경과
              </span>
              <span>{queuePosition ? `대기 ${queuePosition}번째` : serverEtaSeconds ? `예상 ${formatMinutes(serverEtaSeconds)}` : estimatedTime ? `예상 ${estimatedTime.label}` : '예상 계산 중'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{serverMessage}</p>
          </CardContent>
        </Card>
      )}

      {stage !== 'failed' && stage !== 'done' && estimatedTime && (
        <Alert className="border-fuchsia-200 bg-fuchsia-50/50 dark:bg-fuchsia-950/20">
          <Clock className="w-4 h-4 text-fuchsia-600" />
          <AlertTitle className="text-sm">예상 대기시간: 약 {serverEtaSeconds ? formatMinutes(serverEtaSeconds) : estimatedTime.label}</AlertTitle>
          <AlertDescription className="text-xs">
            브라우저를 닫아도 서버 대기열에서 작업이 계속 진행되고, 완료되면 입력한 이메일로 다운로드 링크를 보냅니다.
          </AlertDescription>
        </Alert>
      )}

      {/* Stage list */}
      {stage !== 'failed' && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            {STAGES.map((s) => {
              const currentIdx = STAGES.findIndex((x) => x.id === stage)
              const idx = STAGES.findIndex((x) => x.id === s.id)
              const isDone = currentIdx > idx || stage === 'done'
              const isActive = stage === s.id
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors',
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'bg-fuchsia-500 text-white'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-semibold">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isActive ? 'text-foreground' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/60',
                      )}
                    >
                      {s.label}
                    </p>
                    {isActive && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {stage === 'queued' && queuePosition ? `현재 대기열 ${queuePosition}번째입니다.` : serverMessage}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Job details */}
      {selectedConcept && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 text-xs space-y-2">
            <Row label="컨셉" value={selectedConcept.name} />
            <Row label="카테고리" value={CATEGORY_LABELS[selectedConcept.category]} />
            <Row label="출력 비율" value={built?.aspectRatio || '-'} />
            <Row label="사이즈" value={built?.size || '-'} />
            <Row label="결과 수" value={`${customize.resultCount}장`} />
            <Row label="창의성" value={`${customize.creativity}/100`} />
            <Row label="정체성 보존" value={`${customize.identityLockStrength}/100`} />
            <Row label="피부 보정" value={customize.skinRetouch} />
            {emailStatus && <Row label="이메일 상태" value={emailStatusLabel(emailStatus)} />}
          </CardContent>
        </Card>
      )}

      {/* Safety notice for ID-style */}
      {selectedConcept?.category === 'ID-style' && stage !== 'failed' && (
        <Alert className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <Info className="w-4 h-4 text-amber-600" />
          <AlertTitle className="text-sm">비공식 용도 안내</AlertTitle>
          <AlertDescription className="text-xs">
            본 결과는 AI로 생성된 “여권/증명사진 스타일” 참고용입니다. 공식 여권·비자·주민등록증·운전면허증 제출용으로 사용할 수 없습니다.
          </AlertDescription>
        </Alert>
      )}

      {/* Error state */}
      {stage === 'failed' && (
        <Card className="border-2 border-rose-300">
          <CardContent className="pt-5 text-center">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">생성 중 오류가 발생했습니다</p>
            <p className="text-xs text-muted-foreground mb-4">{errorMsg}</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('concept')}>
                컨셉 변경
              </Button>
              <Button size="sm" onClick={handleRetry} className="bg-gradient-to-r from-fuchsia-600 to-rose-500">
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel while in progress */}
      {stage !== 'failed' && stage !== 'done' && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            취소하고 커스터마이즈로
          </Button>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function translateError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('face') || m.includes('얼굴')) return '얼굴이 불명확합니다. 더 선명한 정면 사진을 업로드해주세요.'
  if (m.includes('policy') || m.includes('정책') || m.includes('safety')) return '정책 제한으로 생성이 차단되었습니다. 다른 컨셉을 시도해보세요.'
  if (m.includes('credit') || m.includes('크레딧') || m.includes('limit')) return '크레딧이 부족합니다.'
  if (m.includes('server') || m.includes('network') || m.includes('서버')) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  return msg || '이미지 생성에 실패했습니다. 다시 시도해주세요.'
}

function estimateGenerationTime(concept: Concept, resultCount: number) {
  const complexity = concept.estimatedComplexity || (['Cosplay', 'Fantasy', 'Sci-Fi'].includes(concept.category) ? 'complex' : 'standard')
  const composition = concept.composition || 'half-body'
  const complexityMultiplier = complexity === 'very-complex' ? 1.45 : complexity === 'complex' ? 1.25 : 1
  const compositionMultiplier = composition === 'full-body' ? 1.15 : composition === 'three-quarter' ? 1.08 : 1
  const seconds = 75 + Math.max(1, resultCount) * 85 * complexityMultiplier * compositionMultiplier
  const minSeconds = roundToHalfMinute(seconds * 0.75)
  const maxSeconds = roundToHalfMinute(seconds * 1.35)
  return { minSeconds, maxSeconds, label: `${formatMinutes(minSeconds)}~${formatMinutes(maxSeconds)}` }
}

function roundToHalfMinute(seconds: number) {
  return Math.max(60, Math.round(seconds / 30) * 30)
}

function formatMinutes(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes}분`
}

function emailStatusLabel(status: string) {
  if (status === 'sent') return '발송 완료'
  if (status === 'sending') return '발송 중'
  if (status === 'failed') return '발송 실패 - 결과 화면에서 다운로드를 확인해주세요'
  if (status === 'pending') return '발송 대기'
  return status
}
