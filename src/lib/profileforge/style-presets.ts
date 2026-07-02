import { Concept } from './concepts'
import { GENERATED_FASHION_PRESETS, GENERATED_HAIR_PRESETS } from './generated-style-presets'

export type StyleMode = 'profile' | 'fashion' | 'hair' | 'makeover'
export type StyleIntensity = 'subtle' | 'balanced' | 'strong'

export interface StyleModeOption { id: StyleMode; label: string; shortLabel: string; description: string }
export interface StylePreset { id: string; mode: Exclude<StyleMode, 'profile'>; name: string; category: string; description: string; tags: string[]; prompt: string; negative?: string; intensity: StyleIntensity; thumbnailPath?: string; sourceId?: string }
export interface CameraShotPreset { id: string; name: string; category: string; description: string; tags: string[]; prompt: string; negative?: string; recommendedAspect?: '1:1' | '4:5' | '3:4' | '16:9' }

export const STYLE_MODES: StyleModeOption[] = [
  { id: 'profile', label: '프로필 컨셉', shortLabel: '프로필', description: '기존 ProfileForge 컨셉으로 프로필 이미지를 생성합니다.' },
  { id: 'fashion', label: '패션 변경', shortLabel: '패션', description: '얼굴과 헤어는 유지하고 의상 스타일을 확실히 바꿉니다.' },
  { id: 'hair', label: '헤어스타일 변경', shortLabel: '헤어', description: '얼굴 정체성은 유지하고 헤어 길이, 볼륨, 컬러를 바꿉니다.' },
  { id: 'makeover', label: '풀 메이크오버', shortLabel: '메이크오버', description: '패션과 헤어를 함께 바꾸고 카메라 구도까지 연출합니다.' },
]

const baseStyleSeed = (name: string, style: string) => `Use the uploaded image as the only face and identity reference while creating a '${name}' styling portrait. ${style} Preserve recognizable identity, natural skin texture, and realistic photography.`

export const BASE_STYLE_CONCEPTS: Record<Exclude<StyleMode, 'profile'>, Concept> = {
  fashion: { id: 'style-fashion', category: 'Professional', name: 'Fashion Try-On', description: '얼굴과 헤어를 유지하면서 의상만 분명하게 바꾸는 패션 스타일링', useCase: '패션 시뮬레이션, 프로필 스타일링', riskLevel: 'safe', styleTags: ['패션 변경', '의상 중심', '정체성 보존'], outfit: 'selected fashion preset outfit', background: 'clean editorial studio or lifestyle background', lighting: 'realistic soft editorial lighting', expression: 'natural confident expression', defaultAspect: '4:5', composition: 'three-quarter', defaultCreativity: 35, thumbnailPrompt: 'AI fashion try-on portrait, realistic outfit change, no text, no watermark', promptSeed: baseStyleSeed('Fashion Try-On', 'Change only the outfit according to the selected preset.'), creditCost: 2 },
  hair: { id: 'style-hair', category: 'Social', name: 'Hairstyle Try-On', description: '얼굴과 의상은 유지하면서 헤어스타일만 분명하게 바꾸는 스타일링', useCase: '헤어스타일 시뮬레이션, SNS 프로필', riskLevel: 'safe', styleTags: ['헤어 변경', '얼굴 보존', '스타일 테스트'], outfit: 'current or simple neutral outfit', background: 'clean portrait background', lighting: 'soft flattering portrait light', expression: 'natural direct expression', defaultAspect: '1:1', composition: 'headshot', defaultCreativity: 30, thumbnailPrompt: 'AI hairstyle try-on portrait, realistic hair change, no text, no watermark', promptSeed: baseStyleSeed('Hairstyle Try-On', 'Change only the hairstyle according to the selected preset.'), creditCost: 2 },
  makeover: { id: 'style-makeover', category: 'Editorial', name: 'Full Makeover', description: '의상과 헤어를 함께 바꾸는 전체 스타일링', useCase: '패션 화보, SNS 프로필, 스타일 제안', riskLevel: 'safe', styleTags: ['의상+헤어', '화보', '종합 스타일링'], outfit: 'selected fashion preset outfit', background: 'editorial photoshoot background', lighting: 'premium editorial lighting', expression: 'confident magazine portrait expression', defaultAspect: '4:5', composition: 'three-quarter', defaultCreativity: 45, thumbnailPrompt: 'AI full makeover portrait, fashion and hairstyle transformation, no text, no watermark', promptSeed: baseStyleSeed('Full Makeover', 'Change the outfit and hairstyle according to the selected presets.'), creditCost: 3 },
}

export const FASHION_PRESETS: StylePreset[] = GENERATED_FASHION_PRESETS

export const HAIR_PRESETS: StylePreset[] = GENERATED_HAIR_PRESETS

export const CAMERA_SHOT_PRESETS: CameraShotPreset[] = [
  { id: 'camera-close-headshot', name: '클로즈업 헤드샷', category: 'Portrait', description: '얼굴 중심의 선명한 프로필 구도', tags: ['클로즈업', '프로필', '얼굴 중심'], prompt: 'close-up headshot framing, sharp focus on the eyes, balanced headroom, natural portrait crop', recommendedAspect: '1:1' },
  { id: 'camera-half-body-editorial', name: '하프바디 에디토리얼', category: 'Editorial', description: '상반신과 스타일이 잘 보이는 화보형 구도', tags: ['상반신', '화보', '스타일 강조'], prompt: 'half-body editorial portrait, visible torso and outfit silhouette, slight three-quarter angle, magazine-style composition', recommendedAspect: '4:5' },
  { id: 'camera-walking-three-quarter', name: '워킹 무빙샷', category: 'Motion', description: '걷는 순간을 포착한 역동적인 3/4 구도', tags: ['무빙샷', '워킹', '역동적'], prompt: 'dynamic walking motion shot, three-quarter body framing, natural stride, subtle motion energy without blur, visible outfit movement', negative: 'extreme blur, duplicated legs, impossible walking pose', recommendedAspect: '4:5' },
  { id: 'camera-full-body-editorial', name: '풀샷 에디토리얼', category: 'Full shot', description: '머리부터 발끝까지 전체 실루엣이 보이는 풀샷', tags: ['풀샷', '전신', '실루엣'], prompt: 'full-body editorial portrait, head-to-toe framing, complete outfit silhouette visible, confident standing pose, plausible anatomy', negative: 'missing feet, duplicated limbs, distorted full body anatomy', recommendedAspect: '3:4' },
  { id: 'camera-low-angle-hero', name: '로우앵글 히어로샷', category: 'Cinematic', description: '아래에서 올려다보는 자신감 있는 시네마틱 구도', tags: ['로우앵글', '시네마틱', '강한 인상'], prompt: 'subtle low-angle hero portrait, confident posture, cinematic editorial framing, natural perspective without distortion', negative: 'distorted neck, oversized head, extreme wide-angle face warp', recommendedAspect: '4:5' },
]

export function getBaseStyleConcept(mode: StyleMode): Concept | null { return mode === 'profile' ? null : BASE_STYLE_CONCEPTS[mode] }
export function findFashionPreset(id?: string | null) { return id ? FASHION_PRESETS.find((preset) => preset.id === id) ?? null : null }
export function findHairPreset(id?: string | null) { return id ? HAIR_PRESETS.find((preset) => preset.id === id) ?? null : null }
export function findCameraShotPreset(id?: string | null) { return id ? CAMERA_SHOT_PRESETS.find((preset) => preset.id === id) ?? null : null }
export function isStyleMode(value: unknown): value is StyleMode { return value === 'profile' || value === 'fashion' || value === 'hair' || value === 'makeover' }
export const ALL_STYLE_CONCEPTS = Object.values(BASE_STYLE_CONCEPTS)
