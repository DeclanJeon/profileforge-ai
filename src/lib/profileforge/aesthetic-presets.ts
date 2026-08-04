/**
 * Lexica-inspired aesthetic axes for ProfileForge.
 * Lighting + color mood presets that compose with concepts without copying third-party prompts.
 */

export type AestheticIntensity = 'subtle' | 'balanced' | 'strong'

export interface LightingPreset {
  id: string
  name: string
  category: string
  description: string
  tags: string[]
  prompt: string
  negative?: string
  intensity: AestheticIntensity
}

export interface MoodPreset {
  id: string
  name: string
  category: string
  description: string
  tags: string[]
  prompt: string
  negative?: string
  intensity: AestheticIntensity
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'light-rembrandt',
    name: '렘브란트 라이팅',
    category: 'Studio',
    description: '한쪽 볼에 삼각 하이라이트가 생기는 클래식 초상 조명',
    tags: ['스튜디오', '클래식', '드라마'],
    prompt:
      'Rembrandt portrait lighting: key light about 45 degrees off camera, soft triangular highlight on the far cheek, gentle falloff into shadow, natural catchlights in the eyes',
    negative: 'flat lighting, overexposed face, harsh clipped highlights',
    intensity: 'balanced',
  },
  {
    id: 'light-butterfly',
    name: '버터플라이 뷰티',
    category: 'Beauty',
    description: '코 아래 나비형 그림자의 뷰티 포트레이트 조명',
    tags: ['뷰티', '정면', '클린'],
    prompt:
      'butterfly beauty lighting from slightly above camera, soft even key, subtle nose shadow, flattering cheek definition, clean beauty-portrait look',
    negative: 'uneven color cast, muddy shadows under eyes',
    intensity: 'subtle',
  },
  {
    id: 'light-golden-hour',
    name: '골든아워',
    category: 'Natural',
    description: '해질녘 따뜻한 측면광과 부드러운 림라이트',
    tags: ['야외', '따뜻함', '시네마틱'],
    prompt:
      'golden-hour natural light, warm low sun as key, soft rim light on hair and shoulders, gentle lens bloom, outdoor portrait atmosphere',
    negative: 'cold fluorescent cast, harsh midday overhead sun',
    intensity: 'balanced',
  },
  {
    id: 'light-blue-hour',
    name: '블루아워',
    category: 'Natural',
    description: '해진 직후 차가운 대기광과 은은한 도시 빛',
    tags: ['저녁', '쿨톤', '도시'],
    prompt:
      'blue-hour ambient light, cool twilight sky fill, subtle warm practical lights in background, calm evening portrait mood',
    negative: 'daytime sunny look, neon overload',
    intensity: 'balanced',
  },
  {
    id: 'light-neon-rim',
    name: '네온 림라이트',
    category: 'Cinematic',
    description: '컬러 림라이트로 윤곽을 살린 시네마틱 조명',
    tags: ['네온', '야경', '엣지'],
    prompt:
      'cinematic neon rim lighting with restrained magenta and cyan edge lights, controlled face exposure, stylish night-city portrait without drowning identity in color',
    negative: 'face fully covered in neon color, unreadable features',
    intensity: 'strong',
  },
  {
    id: 'light-softbox-beauty',
    name: '소프트박스 뷰티',
    category: 'Beauty',
    description: '크고 부드러운 확산광의 상업 뷰티 조명',
    tags: ['상업', '소프트', '광고'],
    prompt:
      'large softbox beauty lighting, smooth wraparound diffusion, minimal hard shadows, commercial clean-skin portrait light',
    negative: 'speckled harsh flash, raccoon eye shadows',
    intensity: 'subtle',
  },
  {
    id: 'light-high-key',
    name: '하이키 화이트',
    category: 'Studio',
    description: '밝고 깨끗한 하이키 스튜디오 룩',
    tags: ['밝음', '미니멀', '화이트'],
    prompt:
      'high-key studio lighting on bright near-white backdrop, airy exposure, soft shadows almost lifted, clean modern headshot',
    negative: 'crushed blacks, gloomy underexposure',
    intensity: 'subtle',
  },
  {
    id: 'light-low-key-noir',
    name: '로우키 느와르',
    category: 'Cinematic',
    description: '깊은 그림자 중심의 무디한 로우키 조명',
    tags: ['느와르', '대비', '무드'],
    prompt:
      'low-key noir lighting, deep negative fill, single directional key, dramatic shadow play while keeping eyes readable',
    negative: 'flat gray muddiness, lost facial identity in pure black',
    intensity: 'strong',
  },
  {
    id: 'light-window-soft',
    name: '윈도우 소프트',
    category: 'Natural',
    description: '창가 자연광의 부드러운 실내 초상',
    tags: ['실내', '자연광', '라이프스타일'],
    prompt:
      'soft window light from camera left, gentle indoor ambient bounce, realistic room falloff, lifestyle portrait lighting',
    negative: 'mixed ugly green indoor cast, blown window highlight on face',
    intensity: 'subtle',
  },
  {
    id: 'light-practical-warm',
    name: '프랙티컬 웜',
    category: 'Cinematic',
    description: '램프·간접 조명 같은 따뜻한 생활 광원',
    tags: ['램프', '따뜻함', '실내'],
    prompt:
      'warm practical lamp lighting, cozy indoor key with soft falloff, subtle background practicals, intimate evening portrait',
    negative: 'orange skin clipping, unnaturally red face',
    intensity: 'balanced',
  },
]

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'mood-teal-orange',
    name: '틸-오렌지 시네마틱',
    category: 'Cinematic',
    description: '영화 포스터 느낌의 틸-오렌지 색보정',
    tags: ['시네마틱', '대비', '영화'],
    prompt:
      'teal-and-orange cinematic color grade, controlled contrast, rich but natural skin tones, film-still finishing',
    negative: 'cartoonish HDR, neon skin, overcooked orange face',
    intensity: 'balanced',
  },
  {
    id: 'mood-warm-film',
    name: '웜 필름',
    category: 'Film',
    description: '따뜻한 필름 감성의 소프트 그레이딩',
    tags: ['필름', '따뜻함', '아날로그'],
    prompt:
      'warm film color grade, gentle halation, slight grain, nostalgic amber highlights with printable skin',
    negative: 'heavy vintage filter covering face, sepia wash',
    intensity: 'subtle',
  },
  {
    id: 'mood-cool-editorial',
    name: '쿨 에디토리얼',
    category: 'Editorial',
    description: '매거진 화보의 차가운 세련된 톤',
    tags: ['화보', '쿨톤', '세련'],
    prompt:
      'cool editorial color grade, clean desaturated shadows, crisp midtones, modern magazine finish',
    negative: 'sickly cyan skin, lifeless gray face',
    intensity: 'balanced',
  },
  {
    id: 'mood-soft-pastel',
    name: '소프트 파스텔',
    category: 'Beauty',
    description: '부드럽고 밝은 파스텔 무드',
    tags: ['파스텔', '소프트', '라이트'],
    prompt:
      'soft pastel color mood, airy lifted shadows, gentle pink-cream highlights, flattering beauty grade',
    negative: 'oversaturated candy colors, plastic skin',
    intensity: 'subtle',
  },
  {
    id: 'mood-high-contrast-bw',
    name: '하이 콘트라스트 B&W',
    category: 'Mono',
    description: '강한 대비의 흑백 포트레이트',
    tags: ['흑백', '대비', '아트'],
    prompt:
      'high-contrast black-and-white portrait grade, deep blacks, bright eye highlights, classic mono photography finish',
    negative: 'color tint remaining, muddy mid-gray only',
    intensity: 'strong',
  },
  {
    id: 'mood-creamy-beauty',
    name: '크리미 뷰티',
    category: 'Beauty',
    description: '크리미한 피부 톤의 상업 뷰티 그레이드',
    tags: ['뷰티', '크리미', '광고'],
    prompt:
      'creamy beauty color grade, smooth luminous skin rendering, soft highlight roll-off, commercial clean finish while keeping pores natural',
    negative: 'wax doll skin, poreless plastic face',
    intensity: 'subtle',
  },
  {
    id: 'mood-moody-desat',
    name: '무디 디셋',
    category: 'Cinematic',
    description: '채도를 낮춘 차분하고 무거운 무드',
    tags: ['무드', '디셋', '시네마'],
    prompt:
      'moody desaturated grade, restrained palette, soft contrast curve, contemplative cinematic portrait finish',
    negative: 'washed-out identity, green muddy skin',
    intensity: 'balanced',
  },
  {
    id: 'mood-fresh-daylight',
    name: '프레시 데이라이트',
    category: 'Natural',
    description: '맑고 생기 있는 주간 자연광 톤',
    tags: ['주간', '프레시', '내추럴'],
    prompt:
      'fresh daylight color grade, clean whites, healthy natural skin, bright but not blown lifestyle portrait finish',
    negative: 'yellow indoor cast, dull underexposure',
    intensity: 'subtle',
  },
]

export function findLightingPreset(id?: string | null) {
  return id ? LIGHTING_PRESETS.find((preset) => preset.id === id) ?? null : null
}

export function findMoodPreset(id?: string | null) {
  return id ? MOOD_PRESETS.find((preset) => preset.id === id) ?? null : null
}
