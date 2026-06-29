'use client'

import { useProfileStore } from '@/store/profile-store'
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

export default function Home() {
  const step = useProfileStore((s) => s.step)

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
