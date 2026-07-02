/**
 * ProfileForge AI - 메인 상태 스토어
 * 위자드의 단계, 업로드 정보, 선택 컨셉, 커스터마이즈 옵션, 생성 결과 관리
 */
'use client'

import { create } from 'zustand'
import { Concept, ConceptCategory } from '@/lib/profileforge/concepts'
import { CustomizeOptions } from '@/lib/profileforge/prompt-builder'
import { StyleMode } from '@/lib/profileforge/style-presets'

export type WizardStep =
  | 'landing'
  | 'upload'
  | 'concept'
  | 'customize'
  | 'generate'
  | 'results'

export interface UploadedFile {
  id: string
  file: File
  previewUrl: string
  fileName: string
  fileSize: number
  width?: number
  height?: number
  /** 0~100 품질 점수 (업로드 API 응답) */
  qualityScore?: number
  faceCount?: number
  warnings?: string[]
  /** 업로드 후 서버가 반환한 저장 ID */
  serverId?: string
  serverUrl?: string
}

export interface GeneratedResult {
  id: string
  imageUrl: string
  thumbnailUrl: string
  likenessScore: number
  qualityScore: number
  conceptFitScore: number
  seed: number
  feedback?: string
}

interface ProfileState {
  // 현재 단계
  step: WizardStep
  setStep: (step: WizardStep) => void

  // 사용자
  sessionId: string
  credits: number
  deductCredits: (n: number) => void
  contactEmail: string
  setContactEmail: (email: string) => void

  // 업로드
  uploads: UploadedFile[]
  selectedUploadId: string | null
  consentAgreed: boolean
  setConsent: (v: boolean) => void
  addUpload: (u: UploadedFile) => void
  removeUpload: (id: string) => void
  clearUploads: () => void
  updateUpload: (id: string, patch: Partial<UploadedFile>) => void
  selectUpload: (id: string) => void

  // 컨셉
  selectedConceptId: string | null
  selectedConcept: Concept | null
  selectConcept: (concept: Concept | null) => void

  // 커스터마이즈
  customize: CustomizeOptions
  setCustomize: (patch: Partial<CustomizeOptions>) => void
  setStyleMode: (mode: StyleMode) => void
  resetCustomizeForConcept: (concept: Concept) => void

  // 생성
  jobId: string | null
  generationStatus: 'succeeded' | 'partially_succeeded' | 'failed' | null
  results: GeneratedResult[]
  selectedResultId: string | null
  setJobId: (id: string | null) => void
  setGenerationStatus: (status: ProfileState['generationStatus']) => void
  setResults: (r: GeneratedResult[]) => void
  addResult: (r: GeneratedResult) => void
  selectResult: (id: string | null) => void
  setResultFeedback: (id: string, feedback: string) => void

  // 정책 모달
  policyOpen: boolean
  setPolicyOpen: (v: boolean) => void

  // 에디터
  editorOpen: boolean
  editorResultId: string | null
  openEditor: (id: string) => void
  closeEditor: () => void

  // 카테고리 필터
  categoryFilter: ConceptCategory | 'All'
  searchQuery: string
  setCategoryFilter: (c: ConceptCategory | 'All') => void
  setSearchQuery: (q: string) => void

  // 전체 초기화 (처음으로)
  resetAll: () => void
}

const DEFAULT_CUSTOMIZE: CustomizeOptions = {
  styleMode: 'profile',
  creativity: 30,
  identityLockStrength: 75,
  aspectRatio: '4:5',
  resultCount: 1,
  skinRetouch: 'natural',
  aiLabel: false,
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  step: 'landing',
  setStep: (step) => set({ step }),

  sessionId:
    typeof window !== 'undefined'
      ? sessionStorage.getItem('pf_session') ||
        (() => {
          const id = 'sess_' + Math.random().toString(36).slice(2, 10)
          sessionStorage.setItem('pf_session', id)
          return id
        })()
      : 'sess_server',
  credits: 20,
  deductCredits: (n) => set({ credits: Math.max(0, get().credits - n) }),
  contactEmail:
    typeof window !== 'undefined'
      ? sessionStorage.getItem('pf_contact_email') || ''
      : '',
  setContactEmail: (email) => {
    if (typeof window !== 'undefined') sessionStorage.setItem('pf_contact_email', email)
    set({ contactEmail: email })
  },

  uploads: [],
  selectedUploadId: null,
  consentAgreed: false,
  setConsent: (v) => set({ consentAgreed: v }),
  addUpload: (u) =>
    set((s) => ({
      uploads: [...s.uploads, u],
      selectedUploadId: s.selectedUploadId ?? u.id,
    })),
  removeUpload: (id) =>
    set((s) => {
      const uploads = s.uploads.filter((u) => u.id !== id)
      const selectedUploadId =
        s.selectedUploadId === id
          ? uploads[0]?.id ?? null
          : s.selectedUploadId
      return { uploads, selectedUploadId }
    }),
  clearUploads: () => set({ uploads: [], selectedUploadId: null }),
  updateUpload: (id, patch) =>
    set((s) => ({
      uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    })),
  selectUpload: (id) => set({ selectedUploadId: id }),

  selectedConceptId: null,
  selectedConcept: null,
  selectConcept: (concept) =>
    set({
      selectedConcept: concept,
      selectedConceptId: concept?.id ?? null,
    }),

  customize: DEFAULT_CUSTOMIZE,
  setCustomize: (patch) =>
    set((s) => ({ customize: { ...s.customize, ...patch } })),
  setStyleMode: (mode) =>
    set((s) => ({
      customize: {
        ...s.customize,
        styleMode: mode,
        fashionPresetId: mode === 'fashion' || mode === 'makeover' ? s.customize.fashionPresetId : undefined,
        hairPresetId: mode === 'hair' || mode === 'makeover' ? s.customize.hairPresetId : undefined,
        cameraShotId: mode === 'profile' ? undefined : s.customize.cameraShotId ?? 'camera-half-body-editorial',
      },
    })),
  resetCustomizeForConcept: (concept) =>
    set({
      customize: {
        ...DEFAULT_CUSTOMIZE,
        styleMode: get().customize.styleMode,
        fashionPresetId: get().customize.fashionPresetId,
        hairPresetId: get().customize.hairPresetId,
        cameraShotId: get().customize.cameraShotId,
        customStyleNote: get().customize.customStyleNote,
        creativity: concept.defaultCreativity,
        aspectRatio: concept.defaultAspect,
      },
    }),

  jobId: null,
  generationStatus: null,
  results: [],
  selectedResultId: null,
  setJobId: (id) => set({ jobId: id }),
  setGenerationStatus: (status) => set({ generationStatus: status }),
  setResults: (r) => set({ results: r, selectedResultId: r[0]?.id ?? null }),
  addResult: (r) => set((s) => ({ results: [...s.results, r] })),
  selectResult: (id) => set({ selectedResultId: id }),
  setResultFeedback: (id, feedback) =>
    set((s) => ({
      results: s.results.map((r) =>
        r.id === id ? { ...r, feedback } : r,
      ),
    })),

  policyOpen: false,
  setPolicyOpen: (v) => set({ policyOpen: v }),

  editorOpen: false,
  editorResultId: null,
  openEditor: (id) => set({ editorOpen: true, editorResultId: id }),
  closeEditor: () => set({ editorOpen: false, editorResultId: null }),

  categoryFilter: 'All',
  searchQuery: '',
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  resetAll: () =>
    set({
      step: 'landing',
      uploads: [],
      selectedUploadId: null,
      selectedConceptId: null,
      selectedConcept: null,
      customize: DEFAULT_CUSTOMIZE,
      jobId: null,
      generationStatus: null,
      results: [],
      selectedResultId: null,
      consentAgreed: false,
      contactEmail: '',
    }),
}))
