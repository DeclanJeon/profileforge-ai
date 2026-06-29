'use client'

import { useProfileStore } from '@/store/profile-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Crop,
  Palette,
  Download,
  RotateCcw,
  Sun,
  Brush,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const CROP_RATIOS = [
  { id: '1:1', label: '1:1', w: 1, h: 1 },
  { id: '4:5', label: '4:5', w: 4, h: 5 },
  { id: '3:4', label: '3:4', w: 3, h: 4 },
  { id: '16:9', label: '16:9', w: 16, h: 9 },
  { id: '9:16', label: '9:16', w: 9, h: 16 },
] as const

const BG_COLORS = [
  { id: 'original', label: '원본', color: 'transparent' },
  { id: 'white', label: '화이트', color: '#ffffff' },
  { id: 'light-gray', label: '연회색', color: '#f3f4f6' },
  { id: 'dark-gray', label: '진회색', color: '#374151' },
  { id: 'black', label: '블랙', color: '#000000' },
  { id: 'navy', label: '네이비', color: '#1e3a8a' },
  { id: 'sky', label: '스카이', color: '#0ea5e9' },
  { id: 'rose', label: '로즈', color: '#f43f5e' },
]

const SKIN_TONES = [
  { id: 'natural', label: '자연' },
  { id: 'warm', label: '따뜻' },
  { id: 'cool', label: '차분' },
  { id: 'bright', label: '밝게' },
]

export function EditorDialog() {
  const { editorOpen, editorResultId, closeEditor, results } = useProfileStore()
  const { toast } = useToast()
  const result = results.find((r) => r.id === editorResultId)

  const [cropRatio, setCropRatio] = useState<string>('4:5')
  const [bgColor, setBgColor] = useState<string>('original')
  const [skinTone, setSkinTone] = useState<string>('natural')
  const [brightness, setBrightness] = useState(50)
  const [contrast, setContrast] = useState(50)
  const [saturation, setSaturation] = useState(50)
  const [warmth, setWarmth] = useState(50)
  const [skinRetouch, setSkinRetouch] = useState(20)

  // prop 변경에 따라 state 초기화 (렌더링 중 안전한 패턴)
  const [prevOpen, setPrevOpen] = useState(editorOpen)
  if (editorOpen !== prevOpen) {
    setPrevOpen(editorOpen)
    if (editorOpen) {
      setCropRatio('4:5')
      setBgColor('original')
      setSkinTone('natural')
      setBrightness(50)
      setContrast(50)
      setSaturation(50)
      setWarmth(50)
      setSkinRetouch(20)
    }
  }

  if (!result) return null

  const filterStyle = `
    brightness(${0.5 + brightness / 50})
    contrast(${0.5 + contrast / 50})
    saturate(${0.5 + saturation / 50})
    sepia(${warmth > 50 ? (warmth - 50) / 100 : 0})
    hue-rotate(${warmth < 50 ? -(50 - warmth) / 2 : 0}deg)
    blur(${skinRetouch / 30}px)
  `

  const selectedCrop = CROP_RATIOS.find((c) => c.id === cropRatio)
  const cropAspect = selectedCrop ? selectedCrop.w / selectedCrop.h : 1

  const handleDownload = () => {
    toast({
      title: '편집된 이미지 다운로드',
      description: `${cropRatio} 크롭 · ${bgColor} 배경으로 다운로드됩니다.`,
    })
    closeEditor()
  }

  const handleReset = () => {
    setCropRatio('4:5')
    setBgColor('original')
    setSkinTone('natural')
    setBrightness(50)
    setContrast(50)
    setSaturation(50)
    setWarmth(50)
    setSkinRetouch(20)
  }

  return (
    <Dialog open={editorOpen} onOpenChange={(o) => !o && closeEditor()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-4 h-4" />
            프로필 편집
          </DialogTitle>
          <DialogDescription className="text-xs">
            크롭, 배경, 색감, 피부 보정을 조절하세요. 다운로드 전 “원본과 다르게 보일 수 있음”에 유의하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs">미리보기</Label>
            <div
              className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center"
              style={{
                backgroundColor: bgColor !== 'original' ? BG_COLORS.find((b) => b.id === bgColor)?.color : undefined,
                aspectRatio: cropAspect,
              }}
            >
              <img
                src={result.imageUrl}
                alt="편집 미리보기"
                className="w-full h-full object-cover"
                style={{ filter: filterStyle }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                초기화
              </Button>
              <Button size="sm" className="flex-1 bg-gradient-to-r from-fuchsia-600 to-rose-500" onClick={handleDownload}>
                <Download className="w-3.5 h-3.5 mr-1" />
                다운로드
              </Button>
            </div>
          </div>

          {/* Controls */}
          <Tabs defaultValue="crop" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="crop" className="text-xs"><Crop className="w-3 h-3 mr-1" />크롭</TabsTrigger>
              <TabsTrigger value="bg" className="text-xs"><Palette className="w-3 h-3 mr-1" />배경</TabsTrigger>
              <TabsTrigger value="color" className="text-xs"><Sun className="w-3 h-3 mr-1" />색감</TabsTrigger>
              <TabsTrigger value="skin" className="text-xs"><Brush className="w-3 h-3 mr-1" />보정</TabsTrigger>
            </TabsList>

            <TabsContent value="crop" className="mt-3 space-y-2">
              <Label className="text-xs">출력 비율</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {CROP_RATIOS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCropRatio(c.id)}
                    className={cn(
                      'p-2 rounded-md border text-xs text-center transition-colors',
                      cropRatio === c.id
                        ? 'border-fuchsia-500 bg-fuchsia-50/50 dark:bg-fuchsia-950/20'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <div
                      className="border-2 border-current rounded-sm mx-auto mb-1"
                      style={{ width: 18 * (c.w / Math.max(c.w, c.h)), height: 18 * (c.h / Math.max(c.w, c.h)) }}
                    />
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                LinkedIn 400×400 · SNS 1:1 · 이력서 4:5 등
              </p>
            </TabsContent>

            <TabsContent value="bg" className="mt-3 space-y-2">
              <Label className="text-xs">배경 색상</Label>
              <div className="grid grid-cols-4 gap-2">
                {BG_COLORS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBgColor(b.id)}
                    className={cn(
                      'p-2 rounded-md border text-xs text-center transition-all',
                      bgColor === b.id
                        ? 'border-fuchsia-500 ring-1 ring-fuchsia-300'
                        : 'border-border hover:border-muted-foreground/40',
                    )}
                  >
                    <div
                      className="w-full h-7 rounded mb-1 border"
                      style={{
                        backgroundColor: b.color === 'transparent' ? 'white' : b.color,
                        backgroundImage: b.color === 'transparent'
                          ? 'linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, white 25%, white 75%, #ddd 75%)'
                          : undefined,
                        backgroundSize: b.color === 'transparent' ? '8px 8px' : undefined,
                        backgroundPosition: b.color === 'transparent' ? '0 0, 4px 4px' : undefined,
                      }}
                    />
                    {b.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                배경 교체/단색화. 인물 외곽은 자동으로 분리됩니다.
              </p>
            </TabsContent>

            <TabsContent value="color" className="mt-3 space-y-3">
              <ColorSlider label="밝기" value={brightness} onChange={setBrightness} />
              <ColorSlider label="대비" value={contrast} onChange={setContrast} />
              <ColorSlider label="채도" value={saturation} onChange={setSaturation} />
              <ColorSlider label="색온도 (따뜻↔차갑)" value={warmth} onChange={setWarmth} />
            </TabsContent>

            <TabsContent value="skin" className="mt-3 space-y-3">
              <div>
                <Label className="text-xs mb-2 block">피부 톤</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {SKIN_TONES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSkinTone(s.id)}
                      className={cn(
                        'p-2 rounded-md border text-xs transition-colors',
                        skinTone === s.id
                          ? 'border-fuchsia-500 bg-fuchsia-50/50 dark:bg-fuchsia-950/20'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <ColorSlider
                label="피부 보정 강도"
                value={skinRetouch}
                onChange={setSkinRetouch}
                hint="자연/중간/강함으로 제한, 과도한 신체 변형은 금지"
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Badge variant="outline">{cropRatio}</Badge>
          <Badge variant="outline">{bgColor}</Badge>
          <Badge variant="outline">보정 {skinRetouch}%</Badge>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={closeEditor}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ColorSlider({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <Label className="font-medium">{label}</Label>
        <span className="tabular-nums text-muted-foreground">{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={0}
        max={100}
        step={1}
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}
