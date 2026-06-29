'use client'

import { useProfileStore } from '@/store/profile-store'
import { Button } from '@/components/ui/button'
import { Sparkles, Shield, Coins, RotateCcw } from 'lucide-react'

export function Header() {
  const { credits, setStep, resetAll, setPolicyOpen } = useProfileStore()

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-6xl mx-auto px-4 h-[57px] flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            resetAll()
            setStep('landing')
          }}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight text-left">
            <span className="font-bold text-sm">ProfileForge AI</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              AI 프로필 자동 생성
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300">
            <Coins className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold tabular-nums">{credits}</span>
            <span className="text-[10px] opacity-70">크레딧</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex"
            onClick={() => setPolicyOpen(true)}
          >
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            정책
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetAll()
              setStep('landing')
            }}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            처음으로
          </Button>
        </div>
      </div>
    </header>
  )
}
