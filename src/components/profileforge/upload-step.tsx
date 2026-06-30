'use client'

import { useProfileStore, UploadedFile } from '@/store/profile-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Upload as UploadIcon,
  X,
  ImageIcon,
  ShieldAlert,
  ShieldCheck,
  Info,
  Loader2,
  Trash2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILES = 5
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

export function UploadStep() {
  const {
    uploads,
    addUpload,
    removeUpload,
    clearUploads,
    updateUpload,
    selectedUploadId,
    selectUpload,
    consentAgreed,
    setConsent,
    setStep,
    credits,
  } = useProfileStore()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const analyzeFile = (file: File): Promise<{ width: number; height: number; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const previewUrl = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, previewUrl })
      img.onerror = () => reject(new Error('이미지 로드 실패'))
      img.src = previewUrl
    })
  }

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      if (uploads.length + files.length > MAX_FILES) {
        toast({
          title: '업로드 제한',
          description: `최대 ${MAX_FILES}장까지 업로드 가능합니다.`,
          variant: 'destructive',
        })
        return
      }

      setUploading(true)
      try {
        for (const file of files) {
          if (!ACCEPTED.includes(file.type)) {
            toast({
              title: '지원하지 않는 형식',
              description: `${file.name}: JPG, PNG, WebP만 지원됩니다.`,
              variant: 'destructive',
            })
            continue
          }
          if (file.size > MAX_SIZE) {
            toast({
              title: '파일 크기 초과',
              description: `${file.name}: 파일당 20MB 이하만 가능합니다.`,
              variant: 'destructive',
            })
            continue
          }

          try {
            const meta = await analyzeFile(file)
            const id = 'up_' + Math.random().toString(36).slice(2, 10)
            const newUpload: UploadedFile = {
              id,
              file,
              previewUrl: meta.previewUrl,
              fileName: file.name,
              fileSize: file.size,
              width: meta.width,
              height: meta.height,
              warnings: [],
            }
            addUpload(newUpload)

            // 서버 업로드 + 품질 검사 (백엔드 연동)
            try {
              const formData = new FormData()
              formData.append('file', file)
              formData.append('sessionId', useProfileStore.getState().sessionId)

              const res = await fetch('/api/profileforge/upload', {
                method: 'POST',
                body: formData,
              })
              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: '업로드 실패' }))
                throw new Error(err.error || '업로드 실패')
              }
              const data = await res.json()
              updateUpload(id, {
                serverId: data.uploadId,
                serverUrl: data.fileUrl,
                qualityScore: data.qualityScore,
                faceCount: data.faceCount,
                warnings: data.warnings || [],
              })
            } catch (e) {
              updateUpload(id, {
                warnings: ['서버 품질 검사를 실행하지 못했습니다. 그래도 진행할 수 있습니다.'],
              })
            }
          } catch (e) {
            toast({
              title: '이미지 분석 실패',
              description: file.name,
              variant: 'destructive',
            })
          }
        }
      } finally {
        setUploading(false)
      }
    },
    [uploads.length, addUpload, updateUpload, toast],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files?.length) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  const primaryUpload = uploads.find((u) => u.id === selectedUploadId)
  const canProceed =
    uploads.length > 0 && consentAgreed && uploads.some((u) => (u.qualityScore ?? 50) >= 30)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold">얼굴 사진 업로드</h2>
        <p className="text-sm text-muted-foreground mt-1">
          얼굴이 잘 보이는 정면 사진 1~5장을 업로드하세요. JPG, PNG, WebP · 파일당 20MB 이하.
        </p>
      </div>

      {/* Consent */}
      <Card className="border-2 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1.5">업로드 전 확인</h3>
              <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
                <li>• 본인 또는 생성 권한이 있는 인물 사진만 업로드할 수 있습니다.</li>
                <li>• 타인·유명인·미성년자 부적절 이미지, 기만적 신분 생성은 제한됩니다.</li>
                <li>• 원본 이미지는 모델 학습에 사용되지 않으며, 30분 후 자동 삭제됩니다. 생성 결과 다운로드 링크는 24시간 동안 유효합니다.</li>
                <li>• 언제든지 즉시 삭제할 수 있습니다.</li>
              </ul>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <Checkbox
                  checked={consentAgreed}
                  onCheckedChange={(v) => setConsent(v === true)}
                />
                <span className="text-xs font-medium">
                  위 안내사항을 확인했으며, 업로드 이미지에 대한 권한과 책임에 동의합니다.
                </span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-fuchsia-400 bg-fuchsia-50/50 dark:bg-fuchsia-950/20 scale-[1.01]'
            : 'border-muted-foreground/25 hover:border-fuchsia-300 hover:bg-muted/30',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center shadow-md">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <UploadIcon className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <p className="font-semibold">
              {uploading ? '업로드 중...' : '사진을 드래그하거나 클릭해서 선택'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              최대 {MAX_FILES}장 · JPG/PNG/WebP · 20MB 이하
            </p>
          </div>
        </div>
      </div>

      {/* Upload list */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              업로드된 사진 ({uploads.length}/{MAX_FILES})
            </h3>
            <Button variant="ghost" size="sm" onClick={clearUploads}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              전체 삭제
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {uploads.map((u) => (
              <UploadCard
                key={u.id}
                upload={u}
                isSelected={u.id === selectedUploadId}
                onSelect={() => selectUpload(u.id)}
                onRemove={() => {
                  if (u.previewUrl) URL.revokeObjectURL(u.previewUrl)
                  removeUpload(u.id)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quality summary */}
      {primaryUpload && primaryUpload.qualityScore !== undefined && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              대표 사진 품질 검사
            </CardTitle>
            <CardDescription className="text-xs">
              {primaryUpload.fileName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium">종합 품질 점수</span>
                <span className="tabular-nums">
                  {Math.round(primaryUpload.qualityScore)}/100
                </span>
              </div>
              <Progress
                value={primaryUpload.qualityScore}
                className={cn(
                  'h-2',
                  primaryUpload.qualityScore >= 70
                    ? '[&>div]:bg-emerald-500'
                    : primaryUpload.qualityScore >= 40
                      ? '[&>div]:bg-amber-500'
                      : '[&>div]:bg-rose-500',
                )}
              />
            </div>

            {primaryUpload.faceCount !== undefined && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-muted-foreground">감지된 얼굴</p>
                  <p className="font-semibold text-sm">
                    {primaryUpload.faceCount}개
                    {primaryUpload.faceCount > 1 && (
                      <Badge variant="secondary" className="ml-2 h-4 text-[10px]">
                        다중 인물
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-muted-foreground">해상도</p>
                  <p className="font-semibold text-sm">
                    {primaryUpload.width}×{primaryUpload.height}
                  </p>
                </div>
              </div>
            )}

            {primaryUpload.warnings && primaryUpload.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle className="text-xs">품질 알림</AlertTitle>
                <AlertDescription className="text-xs">
                  <ul className="list-disc list-inside space-y-0.5 mt-1">
                    {primaryUpload.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notice for multi-face */}
      {primaryUpload && (primaryUpload.faceCount ?? 0) > 1 && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertTitle className="text-sm">다중 인물 사진</AlertTitle>
          <AlertDescription className="text-xs">
            여러 얼굴이 감지되었습니다. 생성 시 대상 얼굴은 대표로 선택한 사진의 가장 큰 얼굴을 기준으로 합니다.
            정확한 결과를 원한다면 단독 셀카를 추가로 업로드해 주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* Bottom actions */}
      <div className="sticky bottom-4 bg-background/95 backdrop-blur border rounded-xl p-3 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {uploads.length === 0 ? (
              <span>사진을 업로드해주세요</span>
            ) : !consentAgreed ? (
              <span className="text-amber-600">동의 확인이 필요합니다</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                다음 단계로 진행 가능
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('landing')}>
              이전
            </Button>
            <Button
              size="sm"
              disabled={!canProceed}
              onClick={() => setStep('concept')}
              className="bg-gradient-to-r from-fuchsia-600 to-rose-500"
            >
              컨셉 선택
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UploadCard({
  upload,
  isSelected,
  onSelect,
  onRemove,
}: {
  upload: UploadedFile
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const qScore = upload.qualityScore
  return (
    <div
      className={cn(
        'relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all',
        isSelected
          ? 'border-fuchsia-500 ring-2 ring-fuchsia-200 dark:ring-fuchsia-900'
          : 'border-transparent hover:border-muted-foreground/30',
      )}
      onClick={onSelect}
    >
      <div className="aspect-[4/5] bg-muted relative">
        <img
          src={upload.previewUrl}
          alt={upload.fileName}
          className="w-full h-full object-cover"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {isSelected && (
          <div className="absolute top-1.5 left-1.5">
            <Badge className="bg-fuchsia-600 text-white h-5 text-[10px] gap-1">
              <ShieldCheck className="w-3 h-3" />
              대표
            </Badge>
          </div>
        )}

        {qScore !== undefined && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
            <div className="flex items-center justify-between text-white text-[10px]">
              <span>품질</span>
              <span className="font-semibold tabular-nums">{Math.round(qScore)}</span>
            </div>
            <Progress
              value={qScore}
              className={cn(
                'h-1 mt-0.5',
                qScore >= 70 ? '[&>div]:bg-emerald-400' : qScore >= 40 ? '[&>div]:bg-amber-400' : '[&>div]:bg-rose-400',
              )}
            />
          </div>
        )}
      </div>
      <div className="p-1.5">
        <p className="text-[10px] text-muted-foreground truncate">{upload.fileName}</p>
      </div>
    </div>
  )
}
