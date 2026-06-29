'use client'

import { useProfileStore, WizardStep } from '@/store/profile-store'
import { cn } from '@/lib/utils'
import { Sparkles, Upload, Images, SlidersHorizontal, Wand2, CheckCircle2 } from 'lucide-react'

const STEPS: { id: WizardStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upload', label: '업로드', icon: Upload },
  { id: 'concept', label: '컨셉 선택', icon: Images },
  { id: 'customize', label: '커스터마이즈', icon: SlidersHorizontal },
  { id: 'generate', label: '생성', icon: Wand2 },
  { id: 'results', label: '결과', icon: CheckCircle2 },
]

const STEP_ORDER: WizardStep[] = ['landing', 'upload', 'concept', 'customize', 'generate', 'results']

export function Stepper() {
  const { step, setStep, selectedConcept, uploads } = useProfileStore()

  // 랜딩에서는 스테퍼 숨김
  if (step === 'landing') return null

  const currentIndex = STEP_ORDER.indexOf(step)

  const canNavigate = (target: WizardStep) => {
    if (target === 'landing') return true
    if (target === 'upload') return true
    if (target === 'concept') return uploads.length > 0
    if (target === 'customize') return uploads.length > 0 && selectedConcept !== null
    if (target === 'generate') return uploads.length > 0 && selectedConcept !== null
    if (target === 'results') return uploads.length > 0 && selectedConcept !== null
    return false
  }

  return (
    <div className="w-full bg-background/80 backdrop-blur-sm border-b sticky top-[57px] z-30">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {STEPS.map((s, idx) => {
            const stepIdx = STEP_ORDER.indexOf(s.id)
            const isActive = step === s.id
            const isComplete = currentIndex > stepIdx
            const canGo = canNavigate(s.id)
            const Icon = s.icon
            return (
              <button
                key={s.id}
                type="button"
                disabled={!canGo}
                onClick={() => canGo && setStep(s.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : isComplete
                      ? 'bg-primary/10 text-primary hover:bg-primary/15'
                      : 'text-muted-foreground hover:text-foreground',
                  !canGo && 'opacity-40 cursor-not-allowed',
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold',
                    isActive
                      ? 'bg-primary-foreground/20'
                      : isComplete
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                  )}
                >
                  {isComplete ? '✓' : idx + 1}
                </span>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
