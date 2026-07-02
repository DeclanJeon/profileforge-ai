 'use client'

import { useMemo } from 'react'
import { useProfileStore } from '@/store/profile-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, ArrowRight, ArrowLeft, ShieldAlert, CheckCircle2, Sparkles, Shirt, Scissors, Camera, Wand2 } from 'lucide-react'
import { CATEGORY_LABELS, CATEGORY_ORDER, CONCEPTS, ConceptCategory, Concept } from '@/lib/profileforge/concepts'
import { BASE_STYLE_CONCEPTS, FASHION_PRESETS, HAIR_PRESETS, STYLE_MODES, StyleMode, StylePreset } from '@/lib/profileforge/style-presets'
import { cn } from '@/lib/utils'

const RISK_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  safe: { label: '안전', variant: 'secondary' },
  notice: { label: '고지 필요', variant: 'outline' },
  restricted: { label: '제한적', variant: 'destructive' },
}

const MODE_ICON: Record<StyleMode, typeof Sparkles> = {
  profile: Sparkles,
  fashion: Shirt,
  hair: Scissors,
  makeover: Wand2,
}

function getConceptThumbnail(concept: Concept) {
  return `/concept-thumbnails/${concept.id}.webp`
}

function presetsForMode(mode: StyleMode) {
  if (mode === 'fashion') return FASHION_PRESETS
  if (mode === 'hair') return HAIR_PRESETS
  if (mode === 'makeover') return [...FASHION_PRESETS, ...HAIR_PRESETS]
  return []
}

export function ConceptGallery() {
  const { categoryFilter, setCategoryFilter, searchQuery, setSearchQuery, selectConcept, selectedConceptId, setStep, resetCustomizeForConcept, uploads, customize, setCustomize, setStyleMode } = useProfileStore()
  const styleMode = customize.styleMode

  const filteredConcepts = useMemo(() => {
    let list = CONCEPTS
    if (categoryFilter !== 'All') list = list.filter((c) => c.category === categoryFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.useCase.toLowerCase().includes(q) || c.styleTags.some((t) => t.toLowerCase().includes(q)))
    }
    return list
  }, [categoryFilter, searchQuery])

  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const presets = presetsForMode(styleMode)
    if (!q) return presets
    return presets.filter((preset) => preset.name.toLowerCase().includes(q) || preset.description.toLowerCase().includes(q) || preset.tags.some((tag) => tag.toLowerCase().includes(q)))
  }, [searchQuery, styleMode])

  const handleMode = (mode: StyleMode) => {
    setStyleMode(mode)
    setSearchQuery('')
    if (mode === 'profile') {
      selectConcept(null)
      return
    }
    const base = BASE_STYLE_CONCEPTS[mode]
    selectConcept(base)
    resetCustomizeForConcept(base)
    setCustomize({ styleMode: mode })
  }

  const handleConceptSelect = (concept: Concept) => {
    setStyleMode('profile')
    selectConcept(concept)
    resetCustomizeForConcept(concept)
    setCustomize({ styleMode: 'profile' })
  }

  const handlePresetSelect = (preset: StylePreset) => {
    const base = BASE_STYLE_CONCEPTS[styleMode === 'profile' ? 'fashion' : styleMode]
    selectConcept(base)
    resetCustomizeForConcept(base)
    if (preset.mode === 'fashion') setCustomize({ styleMode, fashionPresetId: preset.id })
    if (preset.mode === 'hair') setCustomize({ styleMode, hairPresetId: preset.id })
  }

  const canProceed = styleMode === 'profile'
    ? Boolean(selectedConceptId)
    : styleMode === 'fashion'
      ? Boolean(customize.fashionPresetId)
      : styleMode === 'hair'
        ? Boolean(customize.hairPresetId)
        : Boolean(customize.fashionPresetId && customize.hairPresetId)

  const selectedLabel = styleMode === 'profile'
    ? CONCEPTS.find((c) => c.id === selectedConceptId)?.name
    : [FASHION_PRESETS.find((p) => p.id === customize.fashionPresetId)?.name, HAIR_PRESETS.find((p) => p.id === customize.hairPresetId)?.name].filter(Boolean).join(' + ')

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">스타일 선택</h2>
          <p className="text-sm text-muted-foreground mt-1">프로필 컨셉, 패션 변경, 헤어스타일 변경, 풀 메이크오버를 선택하세요.</p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
          <Camera className="w-3 h-3" /> 카메라샷은 다음 단계에서 선택
        </div>
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3 flex items-center gap-3">
          <div className="flex -space-x-2">{uploads.slice(0, 3).map((u) => <img key={u.id} src={u.previewUrl} alt={u.fileName} className="w-8 h-8 rounded-full object-cover border-2 border-background" />)}</div>
          <div className="text-xs"><p className="font-medium">업로드된 사진 {uploads.length}장</p><p className="text-muted-foreground">대표 사진을 기준으로 생성됩니다</p></div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setStep('upload')}>변경</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {STYLE_MODES.map((mode) => {
          const Icon = MODE_ICON[mode.id]
          return <button key={mode.id} type="button" onClick={() => handleMode(mode.id)} className={cn('rounded-xl border-2 p-3 text-left transition-all', styleMode === mode.id ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/20' : 'border-border hover:border-fuchsia-300')}>
            <div className="flex items-center gap-2 font-semibold text-sm"><Icon className="w-4 h-4 text-fuchsia-600" />{mode.label}</div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{mode.description}</p>
          </button>
        })}
      </div>

      <div className="space-y-3 sticky top-[120px] z-20 bg-background/95 backdrop-blur py-2 -mx-4 px-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={styleMode === 'profile' ? '컨셉 검색 (예: LinkedIn, 판타지)' : '스타일 검색 (예: 가죽 재킷, 웨이브, 버즈컷)'} className="pl-9 h-10" /></div>
        {styleMode === 'profile' && <ScrollArea className="w-full whitespace-nowrap"><div className="flex gap-1.5 pb-1"><CategoryChip active={categoryFilter === 'All'} onClick={() => setCategoryFilter('All')} label={`전체 (${CONCEPTS.length})`} />{CATEGORY_ORDER.map((cat) => <CategoryChip key={cat} active={categoryFilter === cat} onClick={() => setCategoryFilter(cat)} label={`${CATEGORY_LABELS[cat]} (${CONCEPTS.filter((c) => c.category === cat).length})`} />)}</div></ScrollArea>}
      </div>

      {styleMode === 'profile' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">{filteredConcepts.map((concept) => <ConceptCard key={concept.id} concept={concept} isSelected={concept.id === selectedConceptId} onSelect={() => handleConceptSelect(concept)} />)}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">{filteredPresets.map((preset) => <StylePresetCard key={preset.id} preset={preset} isSelected={preset.id === customize.fashionPresetId || preset.id === customize.hairPresetId} onSelect={() => handlePresetSelect(preset)} />)}</div>
      )}

      <div className="sticky bottom-4 bg-background/95 backdrop-blur border rounded-xl p-3 shadow-md"><div className="flex items-center justify-between gap-3"><div className="text-xs text-muted-foreground">{canProceed ? <span className="flex items-center gap-1 text-fuchsia-600"><CheckCircle2 className="w-3.5 h-3.5" />{selectedLabel} 선택됨</span> : <span>{styleMode === 'makeover' ? '패션과 헤어를 각각 하나씩 선택해주세요' : '스타일을 선택해주세요'}</span>}</div><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => setStep('upload')}><ArrowLeft className="w-4 h-4 mr-1" />이전</Button><Button size="sm" disabled={!canProceed} onClick={() => setStep('customize')} className="bg-gradient-to-r from-fuchsia-600 to-rose-500">커스터마이즈<ArrowRight className="w-4 h-4 ml-1.5" /></Button></div></div></div>
    </div>
  )
}

function CategoryChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border', active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border')}>{label}</button>
}

function StylePresetCard({ preset, isSelected, onSelect }: { preset: StylePreset; isSelected: boolean; onSelect: () => void }) {
  return <Card className={cn('group cursor-pointer border-2 transition-all hover:shadow-md overflow-hidden', isSelected ? 'border-fuchsia-500 ring-2 ring-fuchsia-200 dark:ring-fuchsia-900' : 'border-border')} onClick={onSelect}>
    <div className="aspect-square bg-muted relative overflow-hidden">
      {preset.thumbnailPath ? <img src={preset.thumbnailPath} alt={`${preset.name} 적용 예시`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" /> : <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10" />
      <div className="absolute top-2 left-2"><Badge variant="secondary" className="text-[10px] h-5">{preset.mode === 'hair' ? '헤어' : '패션'}</Badge></div>
      {isSelected && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-fuchsia-600" /></div>}
      <div className="absolute bottom-0 inset-x-0 p-2 text-white">
        <h3 className="font-bold text-xs line-clamp-1">{preset.name}</h3>
        <p className="text-[10px] opacity-85 line-clamp-1">{preset.category}</p>
      </div>
    </div>
    <CardContent className="p-2 space-y-1.5"><p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{preset.description}</p><div className="flex flex-wrap gap-1">{preset.tags.slice(0, 3).map((tag) => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>)}</div></CardContent>
  </Card>
}

function ConceptCard({ concept, isSelected, onSelect }: { concept: Concept; isSelected: boolean; onSelect: () => void }) {
  const risk = RISK_LABEL[concept.riskLevel]
  return <Card className={cn('group overflow-hidden cursor-pointer transition-all border-2 hover:shadow-md', isSelected ? 'border-fuchsia-500 ring-2 ring-fuchsia-200 dark:ring-fuchsia-900' : 'border-border')} onClick={onSelect}>
    <div className="aspect-[4/5] bg-muted relative overflow-hidden"><img src={getConceptThumbnail(concept)} alt={`${concept.name} 예시 썸네일`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/15" /><div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1"><Badge variant="secondary" className="text-[10px] h-5">{CATEGORY_LABELS[concept.category]}</Badge><Badge variant={risk.variant} className="text-[10px] h-5">{risk.label}</Badge></div>{isSelected && <div className="absolute top-2 right-2"><div className="w-6 h-6 rounded-full bg-fuchsia-600 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-white" /></div></div>}<div className="absolute bottom-0 inset-x-0 p-3 text-white"><h3 className="font-bold text-sm">{concept.name}</h3><p className="text-[10px] opacity-80 line-clamp-1 mt-0.5">{concept.styleTags.join(' · ')}</p></div></div>
    <CardContent className="pt-3 pb-3 px-3 space-y-2"><p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{concept.description}</p><div className="flex flex-wrap gap-1">{concept.styleTags.slice(0, 3).map((tag) => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>)}</div><div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t"><span>추천: {concept.useCase}</span><span className="font-semibold text-fuchsia-600">{concept.creditCost} 크레딧</span></div>{concept.riskLevel !== 'safe' && <div className="flex items-start gap-1 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded p-1.5"><ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" /><span>{concept.notRecommendedFor || '사용 전 안내 문구가 표시됩니다.'}</span></div>}</CardContent>
  </Card>
}
