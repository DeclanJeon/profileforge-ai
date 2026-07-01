'use client'

import { useSession } from 'next-auth/react'
import { useProfileStore, GeneratedResult } from '@/store/profile-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Crop,
  Trash2,
  Frown,
  Bot,
  ImageOff,
  Shirt,
  Image as ImageIcon,
  RefreshCw,
  Mail,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const FEEDBACKS = [
  { id: 'face-different', label: '얼굴이 다름', icon: Frown },
  { id: 'too-ai', label: '너무 AI 같음', icon: Bot },
  { id: 'weak-concept', label: '컨셉이 약함', icon: ImageOff },
  { id: 'too-strong', label: '컨셉이 과함', icon: AlertTriangle },
  { id: 'bg-only', label: '배경만 바꾸기', icon: ImageIcon },
  { id: 'outfit-only', label: '의상만 바꾸기', icon: Shirt },
] as const

export function ResultsStep() {
  const {
    results,
    selectedResultId,
    selectResult,
    selectedConcept,
    setStep,
    setResultFeedback,
    openEditor,
    jobId,
    generationStatus,
  } = useProfileStore()
  const { toast } = useToast()
  const { data: session } = useSession()
  const userEmail = session?.user?.email || ''
  const [zoomId, setZoomId] = useState<string | null>(null)
  const [resendingEmail, setResendingEmail] = useState(false)

  const zoomResult = results.find((r) => r.id === zoomId)

  if (results.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">생성된 결과가 없습니다.</p>
        <Button className="mt-3" onClick={() => setStep('customize')}>
          다시 생성
        </Button>
      </div>
    )
  }

  const handleDownload = async (r: GeneratedResult, size: string) => {
    try {
      toast({
        title: '다운로드 시작',
        description: `${size} 해상도로 다운로드합니다.`,
      })
      // 다운로드 API 호출
      const res = await fetch('/api/profileforge/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size,
          jobId,
          imageId: r.id,
        }),
      })
      if (!res.ok) throw new Error('다운로드 실패')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `profileforge-${selectedConcept?.name}-${size}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast({
        title: '다운로드 실패',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
    }
  }

  const handleFeedback = (resultId: string, feedback: string) => {
    setResultFeedback(resultId, feedback)
    toast({
      title: '피드백 저장',
      description: '피드백은 다음 신규 생성 요청에서 참고할 수 있도록 표시됩니다.',
    })
  }

  const handleDelete = async () => {
    if (!confirm('업로드 원본과 생성 결과 모두 삭제하시겠습니까?')) return
    try {
      await fetch('/api/profileforge/delete', { method: 'DELETE' })
      toast({ title: '삭제 완료', description: '모든 데이터가 삭제되었습니다.' })
      useProfileStore.getState().resetAll()
      setStep('landing')
    } catch {
      toast({ title: '삭제 실패', variant: 'destructive' })
    }
  }

  const handleResendEmail = async () => {
    if (!jobId || !userEmail) return
    setResendingEmail(true)
    try {
      const res = await fetch('/api/profileforge/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '이메일 재발송 실패')
      toast({
        title: '이메일 재발송 요청 완료',
        description: data.message || '결과 이미지 첨부 이메일을 다시 보내고 있습니다.',
      })
    } catch (error) {
      toast({
        title: '이메일 재발송 실패',
        description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setResendingEmail(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">생성 결과</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {results.length}장의 프로필이 생성되었습니다. 비교 후 가장 만족스러운 것을 선택하세요.
          </p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          생성 완료
        </Badge>
      </div>

      {/* Likeness warning */}
      <Alert className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-xs">
          AI 생성 결과는 원본과 다르게 보일 수 있습니다. 중요 용도(채용, 공식 문서)에는 반드시 본인 확인 후 사용하세요.
          {selectedConcept?.category === 'ID-style' && (
            <span className="block mt-1 font-medium">
              ⚠️ 본 결과는 비공식 “스타일 참고용”이며 공식 제출용이 아닙니다.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {generationStatus === 'partially_succeeded' && (
        <Alert className="border-orange-200 bg-orange-50/70 dark:bg-orange-950/20">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertTitle className="text-sm">일부 결과만 생성되었습니다</AlertTitle>
          <AlertDescription className="text-xs">
            요청한 이미지 중 {results.length}장만 성공했습니다. 실패한 이미지는 과금/다운로드 대상에서 제외되며, 이메일에도 성공한 결과만 첨부됩니다.
          </AlertDescription>
        </Alert>
      )}

      <Alert className="border-fuchsia-200 bg-fuchsia-50/50 dark:bg-fuchsia-950/20">
        <Mail className="w-4 h-4 text-fuchsia-600" />
        <AlertTitle className="text-sm">결과 이미지 첨부 이메일 발송</AlertTitle>
        <AlertDescription className="text-xs space-y-2">
          <p>
            결과 이미지는 {userEmail || '로그인한 Google 이메일'}로 첨부 발송됩니다. 별도 다운로드 링크나 R2 저장소를 거치지 않습니다.
          </p>
          <p className="text-muted-foreground">
            화면의 결과 미리보기는 임시 제공용이며, 장기 보관이 필요하면 이메일 첨부파일을 저장하세요.
          </p>
          {jobId && userEmail && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={resendingEmail}
              onClick={handleResendEmail}
            >
              {resendingEmail ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
              이메일 재발송
            </Button>
          )}
        </AlertDescription>
      </Alert>

      {/* Results grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {results.map((r) => (
          <ResultCard
            key={r.id}
            result={r}
            isSelected={r.id === selectedResultId}
            onSelect={() => selectResult(r.id)}
            onZoom={() => setZoomId(r.id)}
            onDownload={(s) => handleDownload(r, s)}
            onEditor={() => openEditor(r.id)}
          />
        ))}
      </div>

      {/* Selected result actions */}
      {selectedResultId && (
        <SelectedActionBar
          result={results.find((r) => r.id === selectedResultId)!}
          onFeedback={(resultId, feedback) => handleFeedback(resultId, feedback)}
          onDelete={handleDelete}
        />
      )}

      {/* Bottom action */}
      <div className="sticky bottom-4 bg-background/95 backdrop-blur border rounded-xl p-3 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {selectedResultId ? (
              <span className="flex items-center gap-1 text-fuchsia-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                선택된 결과: {results.find((r) => r.id === selectedResultId)?.id.slice(-6)}
              </span>
            ) : (
              <span>결과를 선택하거나 재생성하세요</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('customize')}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              다시 설정
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-fuchsia-600 to-rose-500"
              onClick={() => setStep('landing')}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              새 프로필 만들기
            </Button>
          </div>
        </div>
      </div>

      {/* Zoom modal */}
      <Dialog open={!!zoomId} onOpenChange={(o) => !o && setZoomId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {zoomResult?.id && `결과 #${zoomResult.id.slice(-6)}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              시드: {zoomResult?.seed} · 유사도: {Math.round(zoomResult?.likenessScore || 0)}% · 품질: {Math.round(zoomResult?.qualityScore || 0)}%
            </DialogDescription>
          </DialogHeader>
          {zoomResult && (
            <div className="space-y-3">
              <div className="relative aspect-[4/5] bg-muted rounded-lg overflow-hidden">
                <img
                  src={zoomResult.imageUrl}
                  alt="생성 결과 확대"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <ScoreCell label="얼굴 유사도" value={zoomResult.likenessScore} />
                <ScoreCell label="이미지 품질" value={zoomResult.qualityScore} />
                <ScoreCell label="컨셉 적합도" value={zoomResult.conceptFitScore} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => zoomResult && openEditor(zoomResult.id)}>
              <Crop className="w-3.5 h-3.5 mr-1" />
              편집
            </Button>
            <Button size="sm" onClick={() => zoomResult && handleDownload(zoomResult, '1024')}>
              <Download className="w-3.5 h-3.5 mr-1" />
              다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ResultCard({
  result,
  isSelected,
  onSelect,
  onZoom,
  onDownload,
  onEditor,
}: {
  result: GeneratedResult
  isSelected: boolean
  onSelect: () => void
  onZoom: () => void
  onDownload: (size: string) => void
  onEditor: () => void
}) {
  return (
    <Card
      className={cn(
        'overflow-hidden cursor-pointer transition-all border-2',
        isSelected ? 'border-fuchsia-500 ring-2 ring-fuchsia-200 dark:ring-fuchsia-900' : 'border-border',
      )}
      onClick={onSelect}
    >
      <div className="aspect-[4/5] bg-muted relative group">
        <img
          src={result.imageUrl}
          alt="생성 결과"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Likeness score badge */}
        <div className="absolute top-2 left-2">
          <Badge
            className={cn(
              'h-5 text-[10px]',
              result.likenessScore >= 80
                ? 'bg-emerald-500 text-white'
                : result.likenessScore >= 60
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-500 text-white',
            )}
          >
            {Math.round(result.likenessScore)}%
          </Badge>
        </div>

        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 rounded-full bg-fuchsia-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute bottom-2 inset-x-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="secondary" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); onZoom() }}>
            확대
          </Button>
          <Button size="sm" variant="secondary" className="h-7 text-xs px-2" onClick={(e) => { e.stopPropagation(); onEditor() }}>
            <Crop className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="secondary" className="h-7 text-xs px-2" onClick={(e) => { e.stopPropagation(); onDownload('1024') }}>
            <Download className="w-3 h-3" />
          </Button>
        </div>

        {result.feedback && (
          <div className="absolute bottom-2 left-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity">
            <Badge variant="secondary" className="text-[10px] h-5">
              {FEEDBACKS.find((f) => f.id === result.feedback)?.label}
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="pt-2 pb-2 px-2">
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          <MiniScore label="유사" value={result.likenessScore} />
          <MiniScore label="품질" value={result.qualityScore} />
          <MiniScore label="적합" value={result.conceptFitScore} />
        </div>
      </CardContent>
    </Card>
  )
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground">{label}</p>
      <p className={cn(
        'font-semibold tabular-nums',
        value >= 80 ? 'text-emerald-600' : value >= 60 ? 'text-amber-600' : 'text-rose-600',
      )}>
        {Math.round(value)}
      </p>
    </div>
  )
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/50 p-2 text-center">
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className="font-bold text-sm tabular-nums">{Math.round(value)}/100</p>
    </div>
  )
}

function SelectedActionBar({
  result,
  onFeedback,
  onDelete,
}: {
  result: GeneratedResult
  onFeedback: (resultId: string, feedback: string) => void
  onDelete: () => void
}) {
  const { openEditor } = useProfileStore()
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold">선택된 결과 #{result.id.slice(-6)}</p>
            <p className="text-xs text-muted-foreground">
              시드 {result.seed} · 유사도 {Math.round(result.likenessScore)}%
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => openEditor(result.id)}>
              <Crop className="w-3.5 h-3.5 mr-1" />
              편집
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              데이터 삭제
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium mb-2 text-muted-foreground">피드백 표시 (다음 신규 생성 요청 참고용)</p>
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACKS.map((f) => {
              const Icon = f.icon
              const isActive = result.feedback === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFeedback(result.id, f.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-colors',
                    isActive
                      ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50',
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
