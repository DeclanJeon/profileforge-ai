'use client'

import { useProfileStore } from '@/store/profile-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Search,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CONCEPTS,
  ConceptCategory,
  Concept,
} from '@/lib/profileforge/concepts'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

const RISK_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  safe: { label: '안전', variant: 'secondary' },
  notice: { label: '고지 필요', variant: 'outline' },
  restricted: { label: '제한적', variant: 'destructive' },
}


function getConceptThumbnail(concept: Concept) {
  return `/concept-thumbnails/${concept.id}.webp`
}

export function ConceptGallery() {
  const {
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    selectConcept,
    selectedConceptId,
    setStep,
    resetCustomizeForConcept,
    uploads,
  } = useProfileStore()

  const filtered = useMemo(() => {
    let list = CONCEPTS
    if (categoryFilter !== 'All') {
      list = list.filter((c) => c.category === categoryFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.useCase.toLowerCase().includes(q) ||
          c.styleTags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    return list
  }, [categoryFilter, searchQuery])

  const handleSelect = (concept: Concept) => {
    selectConcept(concept)
    resetCustomizeForConcept(concept)
  }

  const handleNext = () => {
    if (selectedConceptId) setStep('customize')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">컨셉 선택</h2>
          <p className="text-sm text-muted-foreground mt-1">
            9개 카테고리 · {CONCEPTS.length}개 핵심 컨셉 중 원하는 스타일을 선택하세요.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
          <Sparkles className="w-3 h-3" />
          총 {CONCEPTS.length}개 컨셉
        </div>
      </div>

      {/* 업로드 요약 */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3 flex items-center gap-3">
          <div className="flex -space-x-2">
            {uploads.slice(0, 3).map((u) => (
              <img
                key={u.id}
                src={u.previewUrl}
                alt={u.fileName}
                className="w-8 h-8 rounded-full object-cover border-2 border-background"
              />
            ))}
          </div>
          <div className="text-xs">
            <p className="font-medium">업로드된 사진 {uploads.length}장</p>
            <p className="text-muted-foreground">대표 사진을 기준으로 생성됩니다</p>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setStep('upload')}>
            변경
          </Button>
        </CardContent>
      </Card>

      {/* Search + Category tabs */}
      <div className="space-y-3 sticky top-[120px] z-20 bg-background/95 backdrop-blur py-2 -mx-4 px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="컨셉 검색 (예: LinkedIn, 판타지, 코스프레)"
            className="pl-9 h-10"
          />
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-1.5 pb-1">
            <CategoryChip
              active={categoryFilter === 'All'}
              onClick={() => setCategoryFilter('All')}
              label={`전체 (${CONCEPTS.length})`}
            />
            {CATEGORY_ORDER.map((cat) => {
              const count = CONCEPTS.filter((c) => c.category === cat).length
              return (
                <CategoryChip
                  key={cat}
                  active={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat)}
                  label={`${CATEGORY_LABELS[cat]} (${count})`}
                />
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Concept grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            검색 결과가 없습니다. 다른 키워드로 시도해보세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filtered.map((concept) => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              isSelected={concept.id === selectedConceptId}
              onSelect={() => handleSelect(concept)}
            />
          ))}
        </div>
      )}

      {/* Bottom action */}
      <div className="sticky bottom-4 bg-background/95 backdrop-blur border rounded-xl p-3 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {selectedConceptId ? (
              <span className="flex items-center gap-1 text-fuchsia-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {CONCEPTS.find((c) => c.id === selectedConceptId)?.name} 선택됨
              </span>
            ) : (
              <span>컨셉을 선택해주세요</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              이전
            </Button>
            <Button
              size="sm"
              disabled={!selectedConceptId}
              onClick={handleNext}
              className="bg-gradient-to-r from-fuchsia-600 to-rose-500"
            >
              커스터마이즈
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background hover:bg-muted border-border',
      )}
    >
      {label}
    </button>
  )
}

function ConceptCard({
  concept,
  isSelected,
  onSelect,
}: {
  concept: Concept
  isSelected: boolean
  onSelect: () => void
}) {
  const risk = RISK_LABEL[concept.riskLevel]
  const gradient = getGradientForCategory(concept.category)

  return (
    <Card
      className={cn(
        'group overflow-hidden cursor-pointer transition-all border-2 hover:shadow-md',
        isSelected ? 'border-fuchsia-500 ring-2 ring-fuchsia-200 dark:ring-fuchsia-900' : 'border-border',
      )}
      onClick={onSelect}
    >
      <div className="aspect-[4/5] bg-muted relative overflow-hidden">
        <img
          src={getConceptThumbnail(concept)}
          alt={`${concept.name} 예시 썸네일`}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/15" />
        <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', gradient)} />
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
          <Badge variant="secondary" className="text-[10px] h-5">
            {CATEGORY_LABELS[concept.category]}
          </Badge>
          <Badge variant={risk.variant} className="text-[10px] h-5">
            {risk.label}
          </Badge>
        </div>

        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 rounded-full bg-fuchsia-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 p-3 text-white">
          <h3 className="font-bold text-sm">{concept.name}</h3>
          <p className="text-[10px] opacity-80 line-clamp-1 mt-0.5">{concept.styleTags.join(' · ')}</p>
        </div>
      </div>

      <CardContent className="pt-3 pb-3 px-3 space-y-2">
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {concept.description}
        </p>

        <div className="flex flex-wrap gap-1">
          {concept.styleTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
          <span>추천: {concept.useCase}</span>
          <span className="font-semibold text-fuchsia-600">{concept.creditCost} 크레딧</span>
        </div>

        {concept.riskLevel !== 'safe' && (
          <div className="flex items-start gap-1 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded p-1.5">
            <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{concept.notRecommendedFor || '사용 전 안내 문구가 표시됩니다.'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getGradientForCategory(cat: ConceptCategory): string {
  const map: Record<ConceptCategory, string> = {
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
  return map[cat]
}
