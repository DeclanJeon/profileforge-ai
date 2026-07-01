'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useProfileStore, WizardStep } from '@/store/profile-store'
import { Header } from '@/components/profileforge/header'
import { Footer } from '@/components/profileforge/footer'
import { Stepper } from '@/components/profileforge/stepper'
import { Landing } from '@/components/profileforge/landing'
import { UploadStep } from '@/components/profileforge/upload-step'
import { ConceptGallery } from '@/components/profileforge/concept-gallery'
import { CustomizeStep } from '@/components/profileforge/customize-step'
import { GenerateStep } from '@/components/profileforge/generate-step'
import { ResultsStep } from '@/components/profileforge/results-step'
import { EditorDialog } from '@/components/profileforge/editor-dialog'
import { PolicyDialog } from '@/components/profileforge/policy-dialog'

export const STEP_PATHS: Record<WizardStep, string> = {
  landing: '/',
  upload: '/upload',
  concept: '/concepts',
  customize: '/customize',
  generate: '/generate',
  results: '/results',
}

export function stepFromPath(pathname: string): WizardStep {
  const normalized = pathname.replace(/\/$/, '') || '/'
  const match = (Object.entries(STEP_PATHS) as Array<[WizardStep, string]>).find(([, path]) => path === normalized)
  return match?.[0] ?? 'landing'
}

export function ProfileForgeApp({ initialStep = 'landing' }: { initialStep?: WizardStep }) {
  const router = useRouter()
  const pathname = usePathname()
  const step = useProfileStore((s) => s.step)
  const setStep = useProfileStore((s) => s.setStep)
  void initialStep
  const skipNavigation = useRef(true)

  useEffect(() => {
    const routeStep = stepFromPath(pathname)
    skipNavigation.current = true
    setStep(routeStep)
  }, [pathname, setStep])

  useEffect(() => {
    if (skipNavigation.current) {
      skipNavigation.current = false
      return
    }

    const target = STEP_PATHS[step]
    if (target !== pathname) router.push(target)
  }, [pathname, router, step])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <Stepper />
      <main className="flex-1">
        {step === 'landing' && <Landing />}
        {step === 'upload' && <UploadStep />}
        {step === 'concept' && <ConceptGallery />}
        {step === 'customize' && <CustomizeStep />}
        {step === 'generate' && <GenerateStep />}
        {step === 'results' && <ResultsStep />}
      </main>
      <Footer />
      <EditorDialog />
      <PolicyDialog />
    </div>
  )
}
