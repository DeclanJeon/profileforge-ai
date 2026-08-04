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
  thumbnailPath?: string
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
  thumbnailPath?: string
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
    thumbnailPath: '/style-thumbnails/light/light-rembrandt.webp',
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
    thumbnailPath: '/style-thumbnails/light/light-butterfly.webp',
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
    thumbnailPath: '/style-thumbnails/light/light-golden-hour.webp',
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
    thumbnailPath: '/style-thumbnails/light/light-blue-hour.webp',
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
    thumbnailPath: '/style-thumbnails/light/light-neon-rim.webp',
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
    thumbnailPath: '/style-thumbnails/light/light-softbox-beauty.webp',
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
    thumbnailPath: '/style-thumbnails/light/light-high-key.webp',
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
    thumbnailPath: '/style-thumbnails/light/light-low-key-noir.webp',
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
    thumbnailPath: '/style-thumbnails/light/light-window-soft.webp',
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
    thumbnailPath: '/style-thumbnails/light/light-practical-warm.webp',
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
    thumbnailPath: '/style-thumbnails/mood/mood-teal-orange.webp',
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
    thumbnailPath: '/style-thumbnails/mood/mood-warm-film.webp',
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
    thumbnailPath: '/style-thumbnails/mood/mood-cool-editorial.webp',
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
    thumbnailPath: '/style-thumbnails/mood/mood-soft-pastel.webp',
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
    thumbnailPath: '/style-thumbnails/mood/mood-high-contrast-bw.webp',
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
    thumbnailPath: '/style-thumbnails/mood/mood-creamy-beauty.webp',
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
    thumbnailPath: '/style-thumbnails/mood/mood-moody-desat.webp',
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
    thumbnailPath: '/style-thumbnails/mood/mood-fresh-daylight.webp',
  },
]

export function findLightingPreset(id?: string | null) {
  return id ? LIGHTING_PRESETS.find((preset) => preset.id === id) ?? null : null
}

export function findMoodPreset(id?: string | null) {
  return id ? MOOD_PRESETS.find((preset) => preset.id === id) ?? null : null
}


export interface BackgroundPreset {
  id: string
  name: string
  category: string
  description: string
  tags: string[]
  prompt: string
  negative?: string
  intensity: AestheticIntensity
  thumbnailPath?: string
}

export interface MakeupPreset {
  id: string
  name: string
  category: string
  description: string
  tags: string[]
  prompt: string
  negative?: string
  intensity: AestheticIntensity
  thumbnailPath?: string
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'bg-studio-soft-gray',
    name: '소프트 그레이 스튜디오',
    category: 'Studio',
    description: '깔끔한 연회색 스튜디오 배경',
    tags: ['스튜디오', '미니멀', '프로'],
    prompt: 'clean soft gray seamless studio backdrop, subtle gradient, uncluttered professional portrait background',
    negative: 'busy clutter, text, logos',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/background/bg-studio-soft-gray.webp',
  },
  {
    id: 'bg-studio-high-key-white',
    name: '하이키 화이트 스튜디오',
    category: 'Studio',
    description: '밝고 깨끗한 화이트 스튜디오',
    tags: ['화이트', '하이키', '클린'],
    prompt: 'bright high-key near-white studio seamless, airy and clean, commercial headshot background',
    negative: 'gray muddy backdrop, clutter',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/background/bg-studio-high-key-white.webp',
  },
  {
    id: 'bg-studio-matte-black',
    name: '매트 블랙 스튜디오',
    category: 'Studio',
    description: '깊은 매트 블랙 스튜디오 배경',
    tags: ['블랙', '드라마', '미니멀'],
    prompt: 'matte black seamless studio backdrop, deep negative space, premium dark portrait environment',
    negative: 'crushed unreadable silhouette, clutter',
    intensity: 'balanced',
    thumbnailPath: '/style-thumbnails/background/bg-studio-matte-black.webp',
  },
  {
    id: 'bg-studio-warm-beige',
    name: '웜 베이지 스튜디오',
    category: 'Studio',
    description: '따뜻한 베이지 톤의 뷰티 스튜디오',
    tags: ['베이지', '뷰티', '웜'],
    prompt: 'warm beige beauty studio backdrop, soft neutral tones, flattering commercial portrait environment',
    negative: 'orange color cast on skin, busy props',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/background/bg-studio-warm-beige.webp',
  },
  {
    id: 'bg-studio-gradient-blue',
    name: '블루 그라데이션 스튜디오',
    category: 'Studio',
    description: '은은한 블루 그라데이션 배경',
    tags: ['블루', '그라데이션', '모던'],
    prompt: 'soft blue gradient studio backdrop, modern and calm, subtle depth without patterns',
    negative: 'neon overload, harsh banding',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/background/bg-studio-gradient-blue.webp',
  },
  {
    id: 'bg-cafe-window',
    name: '카페 윈도우',
    category: 'Lifestyle',
    description: '창가 카페의 라이프스타일 배경',
    tags: ['카페', '라이프', '실내'],
    prompt: 'sunlit cafe interior background with window light, soft bokeh cups and wood textures, lifestyle portrait setting',
    negative: 'readable brand logos, messy clutter dominating face',
    intensity: 'balanced',
    thumbnailPath: '/style-thumbnails/background/bg-cafe-window.webp',
  },
  {
    id: 'bg-city-sidewalk',
    name: '시티 사이드워크',
    category: 'Lifestyle',
    description: '도심 보도의 자연스러운 거리 배경',
    tags: ['도시', '스트릿', '야외'],
    prompt: 'modern city sidewalk background with soft street bokeh, natural urban depth, lifestyle environmental portrait setting',
    negative: 'readable store logos, crowded faces in background',
    intensity: 'balanced',
    thumbnailPath: '/style-thumbnails/background/bg-city-sidewalk.webp',
  },
  {
    id: 'bg-park-greenery',
    name: '파크 그린',
    category: 'Lifestyle',
    description: '공원 녹음 보케 배경',
    tags: ['공원', '자연', '그린'],
    prompt: 'park greenery bokeh background, soft leaves and natural daylight depth, fresh outdoor lifestyle setting',
    negative: 'insect closeups, messy trash, harsh sun flare covering face',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/background/bg-park-greenery.webp',
  },
  {
    id: 'bg-rooftop-golden',
    name: '루프탑 골든아워',
    category: 'Lifestyle',
    description: '해질녘 루프탑 시티 스카이라인',
    tags: ['루프탑', '골든아워', '시티'],
    prompt: 'rooftop golden-hour city skyline softly blurred, warm evening atmosphere, cinematic lifestyle background',
    negative: 'unreadable face in backlight, heavy lens dirt',
    intensity: 'balanced',
    thumbnailPath: '/style-thumbnails/background/bg-rooftop-golden.webp',
  },
  {
    id: 'bg-home-office',
    name: '홈 오피스',
    category: 'Lifestyle',
    description: '정돈된 재택 데스크 환경',
    tags: ['데스크', '리모트', '실내'],
    prompt: 'tidy home-office background with desk and soft window light, lightly blurred shelves, professional remote-work setting',
    negative: 'messy cables dominating frame, readable screen content',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/background/bg-home-office.webp',
  },
  {
    id: 'bg-neon-alley',
    name: '네온 앨리',
    category: 'Cinematic',
    description: '네온 야경 골목의 시네마틱 배경',
    tags: ['네온', '야경', '시네마'],
    prompt: 'rain-kissed neon alley background with magenta-cyan bokeh, cinematic night-city depth, stylish environmental portrait setting',
    negative: 'face drowned in neon, unreadable identity',
    intensity: 'strong',
    thumbnailPath: '/style-thumbnails/background/bg-neon-alley.webp',
  },
  {
    id: 'bg-library-warm',
    name: '웜 라이브러리',
    category: 'Cinematic',
    description: '따뜻한 서재/도서관 분위기',
    tags: ['서재', '책', '웜'],
    prompt: 'warm library or study interior background with soft book bokeh and practical lamp glow, intellectual cinematic atmosphere',
    negative: 'unreadable tiny text focus, dusty haze covering face',
    intensity: 'balanced',
    thumbnailPath: '/style-thumbnails/background/bg-library-warm.webp',
  },
]

export const MAKEUP_PRESETS: MakeupPreset[] = [
  {
    id: 'makeup-no-makeup',
    name: '노메이크업 메이크업',
    category: 'Natural',
    description: '거의 안 바른 듯 정돈된 자연 메이크업',
    tags: ['내추럴', '클린', '데일리'],
    prompt: 'no-makeup makeup look: even natural skin, soft brows, sheer lip tint, subtle lashes, realistic pores preserved, identity-first beauty finish',
    negative: 'heavy contour, cakey foundation, plastic skin',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/makeup/makeup-no-makeup.webp',
  },
  {
    id: 'makeup-soft-glam',
    name: '소프트 글램',
    category: 'Glam',
    description: '부드러운 광택의 데이-투-나잇 글램',
    tags: ['글램', '소프트', '광택'],
    prompt: 'soft glam makeup: luminous skin, softly blended neutral eyeshadow, defined lashes, softly tinted lips, elegant but wearable',
    negative: 'overdrawn heavy drag makeup, muddy eyeshadow',
    intensity: 'balanced',
    thumbnailPath: '/style-thumbnails/makeup/makeup-soft-glam.webp',
  },
  {
    id: 'makeup-smoky-evening',
    name: '스모키 이브닝',
    category: 'Glam',
    description: '저녁 행사에 맞는 절제된 스모키 룩',
    tags: ['스모키', '이브닝', '드라마'],
    prompt: 'refined smoky evening makeup: blended charcoal-brown eyes, clean skin base, softly matte or satin lip, elegant night-out finish without costume makeup',
    negative: 'messy fallout, raccoon eyes, halloween makeup',
    intensity: 'strong',
    thumbnailPath: '/style-thumbnails/makeup/makeup-smoky-evening.webp',
  },
  {
    id: 'makeup-fresh-dewy',
    name: '프레시 듀이',
    category: 'Natural',
    description: '촉촉하고 생기 있는 듀이 스킨',
    tags: ['듀이', '생기', '촉촉'],
    prompt: 'fresh dewy makeup: hydrated glow on high points, sheer healthy flush, clean brows, natural lip, youthful fresh finish with visible skin texture',
    negative: 'greasy shine, glitter overload, poreless plastic skin',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/makeup/makeup-fresh-dewy.webp',
  },
  {
    id: 'makeup-glass-skin',
    name: '글래스 스킨',
    category: 'K-beauty',
    description: '맑고 투명한 K-뷰티 글래스 스킨',
    tags: ['K뷰티', '글래스', '투명'],
    prompt: 'K-beauty glass-skin makeup: translucent luminous base, soft gradient lips, delicate blush, clean lashes, refined natural identity-preserving finish',
    negative: 'heavy western contour, matte cakey base',
    intensity: 'balanced',
    thumbnailPath: '/style-thumbnails/makeup/makeup-glass-skin.webp',
  },
  {
    id: 'makeup-clean-girl',
    name: '클린 걸',
    category: 'Natural',
    description: '정돈된 클린 걸 메이크업',
    tags: ['클린', '미니멀', '트렌드'],
    prompt: 'clean-girl makeup aesthetic: sleek natural base, brushed brows, glossy neutral lip, subtle cream blush, polished minimal finish',
    negative: 'heavy smoky eyes, overlined dramatic lips',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/makeup/makeup-clean-girl.webp',
  },
  {
    id: 'makeup-office-polished',
    name: '오피스 폴리시드',
    category: 'Professional',
    description: '직장/미팅에 어울리는 단정한 메이크업',
    tags: ['오피스', '단정', '프로'],
    prompt: 'office-polished makeup: even natural base, soft brown eye definition, nude-rose lip, tidy brows, professional credible finish',
    negative: 'party glitter, extreme contour',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/makeup/makeup-office-polished.webp',
  },
  {
    id: 'makeup-warm-bronze',
    name: '웜 브론즈',
    category: 'Glam',
    description: '따뜻한 브론즈 톤의 선탠 글램',
    tags: ['브론즈', '웜', '선탠'],
    prompt: 'warm bronze makeup: soft bronzed complexion, warm brown eyes, peachy nude lip, sun-kissed but realistic finish',
    negative: 'orange fake tan streaks, muddy bronzer patches',
    intensity: 'balanced',
    thumbnailPath: '/style-thumbnails/makeup/makeup-warm-bronze.webp',
  },
  {
    id: 'makeup-cool-rose',
    name: '쿨 로즈',
    category: 'Natural',
    description: '쿨톤 로즈 블러셔와 립의 세련된 룩',
    tags: ['쿨톤', '로즈', '세련'],
    prompt: 'cool rose makeup: soft rose blush, muted rose lip, clean cool-toned base, refined modern portrait finish',
    negative: 'overly pink cartoon blush, warm orange clash',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/makeup/makeup-cool-rose.webp',
  },
  {
    id: 'makeup-editorial-liner',
    name: '에디토리얼 라이너',
    category: 'Editorial',
    description: '절제된 그래픽 라이너의 화보 메이크업',
    tags: ['라이너', '화보', '에디토리얼'],
    prompt: 'editorial graphic liner makeup kept wearable: precise eyeliner accent, clean skin, soft lip, fashion-portrait finish without extreme avant-garde distortion',
    negative: 'face-obscuring avant-garde paint, costume face art',
    intensity: 'strong',
    thumbnailPath: '/style-thumbnails/makeup/makeup-editorial-liner.webp',
  },
  {
    id: 'makeup-red-lip-classic',
    name: '클래식 레드립',
    category: 'Glam',
    description: '클래식한 레드 립 포인트 메이크업',
    tags: ['레드립', '클래식', '포인트'],
    prompt: 'classic red-lip makeup: polished skin, softly defined eyes, precise classic red lip, timeless glam portrait finish',
    negative: 'smudged lipstick on teeth, uneven lip line',
    intensity: 'balanced',
    thumbnailPath: '/style-thumbnails/makeup/makeup-red-lip-classic.webp',
  },
  {
    id: 'makeup-mens-groomed',
    name: '맨즈 그루밍',
    category: 'Grooming',
    description: '자연스러운 맨즈 스킨/브로우 그루밍',
    tags: ['맨즈', '그루밍', '내추럴'],
    prompt: 'natural mens grooming finish: even skin tone, reduced redness, tidy brows, subtle matte-to-natural sheen, no feminine full-glam makeup look, identity-preserving',
    negative: 'heavy foundation mask, lipstick, dramatic eyeshadow',
    intensity: 'subtle',
    thumbnailPath: '/style-thumbnails/makeup/makeup-mens-groomed.webp',
  },
]

export function findBackgroundPreset(id?: string | null) {
  return id ? BACKGROUND_PRESETS.find((preset) => preset.id === id) ?? null : null
}

export function findMakeupPreset(id?: string | null) {
  return id ? MAKEUP_PRESETS.find((preset) => preset.id === id) ?? null : null
}
