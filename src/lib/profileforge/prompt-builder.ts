/**
 * ProfileForge AI - 프롬프트 빌더
 * 컨셉 + 사용자 커스터마이즈 선택 → identity-lock 프롬프트 + negative prompt 구성
 */
import { Concept } from './concepts'

export interface CustomizeOptions {
  /** 0=보수적, 50=균형, 100=창의적 */
  creativity: number
  /** 얼굴 보존 강도 0~100 */
  identityLockStrength: number
  aspectRatio: '1:1' | '4:5' | '3:4' | '16:9'
  resultCount: number
  /** 표정 오버라이드 */
  expression?: string
  /** 의상 오버라이드 */
  outfit?: string
  /** 배경 오버라이드 */
  background?: string
  /** 조명 오버라이드 */
  lighting?: string
  /** 피부 보정 강도 */
  skinRetouch: 'natural' | 'medium' | 'strong'
  /** AI 생성 라벨/워터마크 포함 여부 */
  aiLabel: boolean
}

export const DEFAULT_NEGATIVE_PROMPT =
  'changed identity, different person, copied source pose, copied hand-under-chin pose, distorted face, over-smoothed skin, asymmetrical eyes, crossed eyes, duplicate face, extra limbs, blurry, low resolution, watermark, text, logo, bad anatomy, awkward crop, cropped forehead, cropped chin, extra fingers, deformed hands, malformed spellcasting hands, fused fingers, broken wrists, mismatched earrings, cartoonish skin, plastic skin, uncanny valley, copyrighted character, franchise logo, exact costume replica, recognizable mascot creature, school crest, team logo, club logo, national team logo, celebrity likeness, trademark symbol'

const ID_LOCK_LEVELS: Record<string, string> = {
  low: 'Use the uploaded image as a loose identity reference while allowing creative transformation.',
  medium:
    'Preserve the same person: facial structure, age range, skin tone, hairline, glasses if present, and distinctive facial features.',
  high:
    'Strong identity preservation: keep the person clearly recognizable while changing only styling, pose, wardrobe, background, and lighting.',
}

const CREATIVITY_HINTS: Record<string, string> = {
  conservative:
    'Conservative mode: prioritize realism, natural expression, and professional credibility.',
  balanced:
    'Balanced mode: preserve identity while clearly adapting wardrobe, setting, lighting, and mood to the selected concept.',
  creative:
    'Creative mode: preserve recognizable identity while strongly transforming wardrobe, environment, camera angle, pose, and cinematic styling.',
}

const SKIN_LEVELS: Record<string, string> = {
  natural: 'Natural realistic skin texture; preserve pores and facial character.',
  medium: 'Light natural retouching while keeping realistic skin texture.',
  strong: 'Polished retouching, but avoid plastic skin or doll-like smoothing.',
}

const ASPECT_TO_SIZE: Record<string, string> = {
  '1:1': '1024x1024',
  '4:5': '864x1152',
  '3:4': '864x1152',
  '16:9': '1152x864',
}

export const aspectToSize = (aspect: string): string =>
  ASPECT_TO_SIZE[aspect] || '1024x1024'

const creativityBucket = (v: number): keyof typeof CREATIVITY_HINTS => {
  if (v < 33) return 'conservative'
  if (v < 66) return 'balanced'
  return 'creative'
}

const identityBucket = (v: number): keyof typeof ID_LOCK_LEVELS => {
  if (v < 40) return 'low'
  if (v < 75) return 'medium'
  return 'high'
}

const COMPOSITION_BY_CATEGORY: Record<Concept['category'], string> = {
  Professional:
    'Camera and composition: eye-level camera angle, shoulders angled 20 to 45 degrees, upper-chest or waist-up portrait framing, 85mm portrait lens, shallow depth of field, balanced headroom, professional editorial headshot.',
  Social:
    'Camera and composition: candid lifestyle portrait, choose one varied setup such as three-quarter angle, slight side profile, walking pose, seated-at-table pose, or environmental portrait; medium close-up or half-body framing, natural interaction with the setting.',
  'ID-style':
    'Camera and composition: front-facing chest-up portrait, eye-level camera angle, centered symmetrical composition, uniform lighting, simple clean background, conservative official-document-inspired framing.',
  Editorial:
    'Camera and composition: editorial fashion portrait, choose a distinctive angle such as low angle, high angle, three-quarter body framing, dramatic close crop, off-center composition, or rule-of-thirds framing.',
  Creator:
    'Camera and composition: creator profile portrait, dynamic half-body or medium close-up framing, expressive gesture, desk setup, prop interaction, over-the-shoulder angle, or presenter-style pose.',
  Cosplay:
    'Camera and composition: cinematic cosplay portrait, three-quarter body or full costume framing, action-ready pose, character-inspired stance, visible costume silhouette, dramatic depth.',
  Fantasy:
    'Camera and composition: fantasy cinematic portrait, three-quarter body or environmental portrait framing, heroic stance, side profile or low-angle perspective, atmospheric foreground and background depth.',
  'Sci-Fi':
    'Camera and composition: sci-fi cinematic portrait, side-lit three-quarter angle, medium shot or action pose, futuristic environment, neon rim light, holographic or technological background depth.',
  'Art/Avatar':
    'Camera and composition: stylized avatar portrait, graphic bust framing, asymmetrical crop, illustrated silhouette, clean icon-readable composition, expressive but identity-preserving face shape.',
}

const USE_CASE_BY_CATEGORY: Record<Concept['category'], string> = {
  Professional: 'professional profile, resume, LinkedIn, company bio, and personal branding',
  Social: 'social profile, blog profile, community avatar, and lifestyle personal branding',
  'ID-style': 'unofficial ID-style reference, resume photo, badge photo, and clean formal profile',
  Editorial: 'editorial profile, magazine-style portrait, portfolio image, and concept profile',
  Creator: 'creator profile, channel avatar, thumbnail profile, and personal media brand',
  Cosplay: 'original cosplay-inspired profile, fandom avatar, and character-style profile',
  Fantasy: 'fantasy profile, game avatar, roleplay portrait, and cinematic personal concept image',
  'Sci-Fi': 'sci-fi profile, futuristic avatar, cyberpunk portrait, and cinematic concept image',
  'Art/Avatar': 'stylized avatar, illustrated profile, art portrait, and community profile image',
}

const DIVERSITY_INSTRUCTION =
  "Use the uploaded image only as the identity reference. Do not copy the source photo's pose, hand-under-chin gesture, monochrome tone, crop, clothing, background, or camera angle unless explicitly requested. Create a new photoshoot-like image with a distinct pose, angle, framing, scene, wardrobe, and lighting that fits the selected concept."

const CONCEPT_DETAIL_PROMPTS: Record<string, string> = {
  'pro-corporate-navy':
    'Concept-specific direction: classic corporate portrait with a navy suit, shoulders angled about 25 degrees, head turned back to camera, upper-chest framing, soft gray studio background, subtle confident smile, clean executive LinkedIn style.',
  'pro-black-blazer':
    'Concept-specific direction: clean black blazer portrait on a pure white or soft off-white background, centered square profile composition, direct eye contact, slight natural smile, crisp even lighting, minimal distractions.',
  'pro-executive-dark':
    'Concept-specific direction: premium executive portrait with charcoal suit styling, dark textured backdrop, dramatic side light from camera left, calm authoritative expression, body angled 45 degrees, cinematic upper torso framing.',
  'pro-founder-pr':
    'Concept-specific direction: startup founder PR portrait in a modern office with blurred background, relaxed standing posture, waist-up framing, natural window light, confident approachable expression, editorial business photography.',
  'pro-startup-casual':
    'Concept-specific direction: smart-casual startup profile, open workspace background, slight lean or seated desk pose, casual button-up styling, natural daylight, friendly energetic smile, square profile crop.',
  'pro-minimal-white':
    'Concept-specific direction: minimalist white-background portrait, neutral top, calm expression, strong negative space, slightly above eye-level camera angle, clean modern portfolio style, symmetrical but not passport-like.',
  'pro-linkedin-keynote':
    'Concept-specific direction: keynote speaker-style profile with warm stage bokeh, blazer styling, confident energetic smile, slightly low camera angle, upper torso framing, subtle spotlight, polished public-speaker mood.',
  'pro-consultant-warm':
    'Concept-specific direction: warm consultant portrait in a softly blurred office or meeting room, navy blazer with open collar, seated three-quarter pose, trustworthy calm smile, warm key light, approachable advisory mood.',

  'social-lifestyle-coffee':
    'Concept-specific direction: candid coffee shop lifestyle portrait, seated near a window with cup or table subtly visible, three-quarter angle, medium close-up, warm window light, relaxed approachable look, natural social profile mood.',
  'social-outdoor-nature':
    'Concept-specific direction: outdoor nature portrait with greenery bokeh, walking or standing casually, body angled away with head turned toward camera, soft daylight, relaxed candid smile, environmental half-body framing.',
  'social-autumn-city':
    'Concept-specific direction: autumn city portrait with coat and scarf styling, street bokeh and warm leaves, gentle side glance, medium close-up, cinematic warm light, natural urban lifestyle atmosphere.',
  'social-night-market':
    'Concept-specific direction: night market portrait with neon and lantern bokeh, lively background depth, half-body candid framing, face lit by warm stall light, relaxed curious expression, social travel profile mood.',
  'social-beach-summer':
    'Concept-specific direction: beach summer portrait with casual linen styling, sea breeze, golden-hour backlight, three-quarter walking pose, wide environmental crop, relaxed confident smile, bright lifestyle profile feeling.',
  'social-gallery-opening':
    'Concept-specific direction: gallery opening portrait with modern art wall background, smart casual outfit, off-center rule-of-thirds composition, thoughtful expression, soft indoor gallery lighting, refined social profile mood.',

  'id-passport-style':
    'Concept-specific direction: unofficial passport-style reference only, front-facing chest-up portrait, neutral expression, clean light background, even lighting, no dramatic pose, clearly not an official document guarantee.',
  'id-badge-corporate':
    'Concept-specific direction: corporate badge-style portrait, front-facing or very slight shoulder angle, clean office-white background, professional neutral smile, even lighting, chest-up framing, simple trustworthy look.',
  'id-school-portrait':
    'Concept-specific direction: clean school portrait style, simple blue or gray backdrop, direct eye contact, gentle smile, centered chest-up framing, soft even light, formal but friendly mood.',
  'id-resume-clean':
    'Concept-specific direction: resume-friendly clean portrait, light neutral background, neat attire, eye-level camera, slight shoulder angle, upper chest framing, subtle confident expression, natural retouching only.',

  'editorial-magazine-cover':
    'Concept-specific direction: magazine cover-style editorial portrait, statement outfit, dramatic fashion lighting, strong direct gaze, low-angle or off-center composition, upper torso to three-quarter body framing, high-end fashion energy.',
  'editorial-mono-noir':
    'Concept-specific direction: monochrome noir editorial portrait, hard side light, deep shadows, side profile or three-quarter angle, smoky dark background, intense expression, cinematic black-and-white mood distinct from the source photo.',
  'editorial-beauty-closeup':
    'Concept-specific direction: beauty editorial close-up, clean skin texture, sharp eyes, dramatic crop, slightly above eye-level camera, soft beauty dish lighting, elegant expression, refined magazine retouching without plastic skin.',
  'editorial-cinematic-warm':
    'Concept-specific direction: warm cinematic editorial portrait, golden practical lights in the background, three-quarter seated pose, medium close-up, filmic color grading, soft rim light, introspective expression.',
  'editorial-vogue-style':
    'Concept-specific direction: high-fashion editorial portrait, designer styling, asymmetrical crop, elongated neck posture, confident gaze, studio seamless or sculptural background, dramatic but polished light.',

  'creator-neon-glow':
    'Concept-specific direction: creator profile with neon glow, colorful LED background, half-body framing, expressive hand gesture or presenter pose, sharp face visibility, energetic modern creator branding.',
  'creator-gaming-streamer':
    'Concept-specific direction: gaming streamer portrait with RGB desk setup and blurred monitors, headset or controller suggested but not covering face, dynamic seated pose, confident playful expression, cyan-magenta lighting.',
  'creator-home-studio':
    'Concept-specific direction: home studio creator portrait with microphone, camera, or softbox in the background, relaxed desk pose, medium close-up, warm practical light, approachable creative professional mood.',
  'creator-podcast-host':
    'Concept-specific direction: podcast host portrait with studio microphone near but not blocking face, seated three-quarter pose, acoustic panel background, warm key light, engaged conversational expression.',
  'creator-fitness-coach':
    'Concept-specific direction: fitness coach profile with athletic outfit, gym or outdoor training background, upright confident posture, half-body framing, energetic smile, clean natural light, healthy motivational mood.',
  'creator-food-blogger':
    'Concept-specific direction: food blogger profile in a cozy restaurant or kitchen setting, table scene softly visible, candid seated pose, warm smile, shallow depth of field, appetizing warm light without clutter.',

  'cosplay-anime-hero':
    'Concept-specific direction: original anime-inspired hero, not a copyrighted character. Use a dynamic heroic stance, wind-swept hair, layered costume panels, bold color accents, clean cel-animation-inspired realism, bright sky or city rooftop background, three-quarter body framing, energetic profile avatar composition.',
  'cosplay-fantasy-mage':
    'Concept-specific direction: cinematic battle mage cosplay with layered embroidered robes, leather belts, arcane jewelry, glowing runes around the hands, staff or spellbook partially visible, enchanted forest or ancient ruins background, blue-orange magical rim light, three-quarter angle, medium close-up with visible costume silhouette.',
  'cosplay-steampunk':
    'Concept-specific direction: steampunk explorer cosplay with brass goggles, leather coat, clockwork accessories, compass or mechanical gauntlet, warm gas-lamp lighting, brass workshop or airship cabin background, curious adventurous pose, waist-up environmental portrait, shallow depth of field.',
  'cosplay-cyber-warrior':
    'Concept-specific direction: original cyber warrior cosplay with tactical techwear, glowing circuit accents, armored jacket, neon alley background, magenta and cyan rim lighting, action-ready stance, side-lit three-quarter angle, cinematic medium shot, futuristic but realistic costume textures.',
  'cosplay-historical-noble':
    'Concept-specific direction: historical noble cosplay portrait with refined period attire, embroidered fabric, layered collar, subtle jewelry, palace interior or classic painted backdrop, painterly window light, elegant posture, three-quarter view, regal but natural expression.',

  'fantasy-knight':
    'Concept-specific direction: noble fantasy knight portrait with ornate plate armor, engraved shoulder pieces, cloak texture, castle hall or torch-lit stone corridor background, heroic low-angle or three-quarter body framing, warm torchlight rim, strong silhouette, dignified stance.',
  'fantasy-elf-archer':
    'Concept-specific direction: elven archer portrait with leather armor, forest cloak, bow strap or quiver visible, ancient forest with sunbeams and bokeh, side profile or three-quarter angle, calm alert expression, environmental medium close-up, natural green-gold color palette.',
  'fantasy-kdrama-romantic':
    'Concept-specific direction: cinematic romantic drama portrait with elegant modern hanbok-inspired styling, cherry blossom or rainy evening street background, soft golden-hour or pastel backlight, gentle side glance, medium close-up, dreamy shallow depth of field, emotionally warm atmosphere.',
  'fantasy-noir-detective':
    'Concept-specific direction: noir detective concept portrait with trench coat, fedora optional, rainy street at night, single street lamp, wet pavement reflections, moody side lighting, cigarette-free hardboiled atmosphere, three-quarter angle, dramatic shadow across the face, monochrome or muted cinematic color grading.',
  'fantasy-pirate-captain':
    'Concept-specific direction: adventurous pirate captain portrait with weathered captain coat, leather belts, sea-wind hair, ship deck at sunset, ropes and sails blurred in background, bold captain expression, low-angle heroic medium shot, warm sunset rim light.',
  'fantasy-vintage-royal':
    'Concept-specific direction: vintage royal portrait with ornate palace interior, velvet or brocade formalwear, subtle crown or jeweled accessory, renaissance-inspired painterly light, regal seated or standing pose, three-quarter view, classic oil-painting composition rendered as realistic portrait photography.',

  'scifi-astronaut':
    'Concept-specific direction: cinematic astronaut profile portrait with partial helmet or reflective visor held under arm, realistic space suit, spacecraft window or lunar base background, cool rim light, medium close-up, sharp face visibility, futuristic realism.',
  'scifi-cyberpunk-executive':
    'Concept-specific direction: cyberpunk executive portrait with tailored futuristic suit, neon city window, holographic interface glow, magenta-cyan rim light, confident leadership pose, side-lit three-quarter angle, sleek high-end profile image.',
  'scifi-robot-engineer':
    'Concept-specific direction: future robotics engineer portrait with utility jacket, robotic arm or drone components in blurred foreground, clean high-tech lab background, cool white and blue lighting, medium close-up environmental portrait, thoughtful technical expression.',
  'scifi-mars-colonist':
    'Concept-specific direction: Mars colonist portrait with practical habitat suit, red desert colony background, dusty warm atmosphere, helmet under arm or shoulder gear, resilient expression, cinematic environmental medium shot.',
  'scifi-future-lab':
    'Concept-specific direction: future lab scientist portrait with sleek lab coat or technical uniform, transparent displays, bioluminescent or holographic lab background, clean sci-fi lighting, eye-level medium close-up, credible science profile mood.',

  'art-watercolor-portrait':
    'Concept-specific direction: watercolor-style identity portrait, soft translucent washes, gentle asymmetrical bust framing, light paper texture, calm expression, recognizable facial silhouette and glasses preserved, airy artistic profile image.',
  'art-oil-painting':
    'Concept-specific direction: classical oil painting portrait, painterly brush texture, three-quarter seated pose, dark warm studio background, Rembrandt-inspired light, refined expression, realistic identity-preserving painted portrait.',
  'art-pixar-3d':
    'Concept-specific direction: friendly 3D animated avatar, stylized but recognizable face shape and glasses, rounded features, expressive smile, clean colorful background, icon-readable bust framing, soft cinematic animation lighting.',
  'art-minimal-line-art':
    'Concept-specific direction: minimal line-art avatar, simplified recognizable facial outline, glasses and hairstyle cues preserved, elegant sparse composition, clean negative space, profile icon readability, monochrome or limited palette.',
  'art-pop-art':
    'Concept-specific direction: bold pop-art avatar, vivid color blocks, comic-inspired halftone texture, confident expression, graphic close-up crop, clean silhouette, energetic creator profile style while preserving recognizable identity cues.',

  'anime-monster-partner-adventurer':
    'Concept-specific direction: original late-90s monster-partner adventure anime inspired profile, not based on any existing character. Adventure goggles-inspired headwear without copying franchise designs, layered camp jacket, fingerless travel gloves, compact backpack, bright summer adventure field, small original companion-creature silhouette blurred in background that does not resemble any known mascot, energetic three-quarter or full-body expedition pose, warm daylight and abstract digital sparkle atmosphere. No franchise logo, no exact character outfit, no recognizable creature.',
  'anime-stadium-trainer':
    'Concept-specific direction: original creature-trainer adventure protagonist concept, full-body confident stadium pose, sporty travel jacket, simple cap-like silhouette without copying famous hats, backpack strap, clean sneakers, bright outdoor arena or route-stadium background, dramatic sunlight, energetic champion mood. No franchise logo, no mascot creature, no exact costume.',
  'fantasy-wizard-school':
    'Concept-specific direction: original wizard-school student portrait, tailored robe-like academic coat, layered neutral scarf, wand-like prop held naturally, candlelit stone library or grand study hall, floating dust motes, warm magical rim light, curious intelligent expression, three-quarter angle. No house crest, no lightning scar, no exact school uniform, no franchise symbols.',
  'fantasy-arcane-professor':
    'Concept-specific direction: original adult magic academy professor portrait, long tailored coat, refined academic layers, ancient library with floating books and arcane diagrams, warm candlelight mixed with cool moonlight, thoughtful mentor expression, three-quarter seated or standing pose, cinematic depth of field.',
  'wedding-full-shot-classic':
    'Concept-specific direction: elegant full-body wedding portrait concept, formal wedding attire suited to the subject, refined suit or wedding dress styling, floral arch and soft daylight venue, graceful standing pose, hands naturally placed, romantic dignified expression, full-body 4:5 composition, premium wedding photography.',
  'wedding-night-garden-full-shot':
    'Concept-specific direction: cinematic night garden wedding full-body portrait, formal evening wedding attire, elegant standing pose under warm garden lights, bokeh lanterns, floral path, dark emerald and gold color palette, soft rim light, romantic confident expression, full-body framing with balanced headroom and visible outfit silhouette.',
  'sports-football-player-full-shot':
    'Concept-specific direction: original football athlete full-body profile portrait, generic football kit with no club or national team logo, athletic stance on a stadium pitch or tunnel entrance, ball prop near foot, dramatic stadium lights, confident focused expression, full-body sports poster framing, realistic fabric texture, no brand marks, no team emblem.',
  'sports-football-captain-poster':
    'Concept-specific direction: original football captain poster concept, generic captain-style sports uniform, no club logos, armband without text, heroic full-body stance, stadium floodlights, misty tunnel background, cinematic rim lighting, strong leadership expression, sports magazine poster composition.',
  'idol-stage-full-shot':
    'Concept-specific direction: original K-pop inspired idol stage full-body portrait, modern performance outfit, LED stage background, dance-ready pose, confident charismatic expression, colorful concert lighting, full-body composition with visible silhouette and stage floor reflections, polished entertainment profile image. No real group logo, no exact idol outfit, no text.',
  'idol-album-jacket':
    'Concept-specific direction: original idol album-jacket editorial portrait, fashion-forward styling, glossy studio set, soft neon or pastel backdrop, controlled beauty lighting, confident gaze, half-body or three-quarter body framing, premium album-cover mood without any text or label logo, modern entertainment photography.',
  'model-runway-full-shot':
    'Concept-specific direction: high-fashion runway model full-body portrait, original designer-inspired black or neutral statement outfit, catwalk pose, long clean silhouette, runway lights, low-angle fashion camera, dramatic shadows, full-body framing, luxury editorial lookbook quality. No brand logo, no text, no copied designer trademark.',
  'model-lookbook-editorial':
    'Concept-specific direction: premium fashion lookbook editorial portrait, clean studio or architectural backdrop, curated layered outfit, full-body or three-quarter pose, off-center composition, calm model expression, high-end catalog lighting, strong clothing silhouette, modern magazine styling, no logos or text.',
}

const MODEL_CONCEPT_NAMES: Record<string, string> = {
  'id-passport-style': 'Passport-style unofficial reference',
}

export interface BuildResult {
  positive: string
  negative: string
  aspectRatio: string
  size: string
  safetyNote?: string
}

export const buildPrompts = (
  concept: Concept,
  options: CustomizeOptions,
): BuildResult => {
  const idLock = ID_LOCK_LEVELS[identityBucket(options.identityLockStrength)]
  const creativity = CREATIVITY_HINTS[creativityBucket(options.creativity)]
  const skin = SKIN_LEVELS[options.skinRetouch]

  const outfit = options.outfit?.trim() || concept.outfit
  const background = options.background?.trim() || concept.background
  const lighting = options.lighting?.trim() || concept.lighting
  const expression = options.expression?.trim() || concept.expression

  const styleLine = [outfit, background, lighting, expression]
    .filter(Boolean)
    .join(', ')

  const idStylePrefix =
    options.identityLockStrength >= 75
      ? 'Use the uploaded image as the primary identity reference. '
      : 'Use the uploaded image as the identity reference, with room for concept-driven styling. '

  const aiLabelClause = options.aiLabel
    ? 'Include a small, subtle, natural-looking "AI" label or watermark only if it does not distract from the portrait. '
    : ''

  const composition = concept.composition === 'full-body'
    ? `${COMPOSITION_BY_CATEGORY[concept.category]} Required framing: full-body portrait, visible complete outfit silhouette, head-to-toe pose, balanced headroom and foot room.`
    : concept.composition === 'three-quarter'
      ? `${COMPOSITION_BY_CATEGORY[concept.category]} Required framing: three-quarter body portrait with visible outfit silhouette and dynamic pose.`
      : COMPOSITION_BY_CATEGORY[concept.category]
  const useCase = USE_CASE_BY_CATEGORY[concept.category]
  const modelConceptName = MODEL_CONCEPT_NAMES[concept.id] || concept.name
  const ipSafety = concept.inspirationPolicy === 'inspired-original'
    ? 'Inspired-original safety: do not reproduce copyrighted characters, franchise logos, exact costumes, recognizable mascots, school crests, or trademarked symbols; create a legally distinct original concept with a similar broad adventure mood.'
    : ''
  const positive = [
    idStylePrefix,
    `${idLock} ${creativity}`,
    DIVERSITY_INSTRUCTION,
    CONCEPT_DETAIL_PROMPTS[concept.id],
    ipSafety,
    `Create a ${useCase} image in the concept style: "${modelConceptName}".`,
    `Wardrobe or costume: ${outfit}.`,
    `Setting or background: ${background}.`,
    `Expression and mood: ${expression}.`,
    `Lighting direction: ${lighting}.`,
    composition,
    skin,
    `Output: ${options.aspectRatio} aspect ratio, high-resolution realistic portrait, sharp focus on the eyes.`,
    aiLabelClause,
    'Avoid watermarks unless explicitly requested, text, logos, face distortion, and excessive beauty retouching.',
  ]
    .filter(Boolean)
    .join(' ')

  let safetyNote: string | undefined
  if (concept.category === 'ID-style') {
    safetyNote =
      '⚠️ 본 이미지는 AI로 생성된 “여권/증명사진 스타일” 참고용이며, 공식 여권·비자·주민등록증·운전면허증 제출용으로 사용할 수 없습니다.'
  }
  if (concept.riskLevel === 'restricted') {
    safetyNote =
      '⚠️ 본 컨셉은 안전 정책에 따라 제한적 생성됩니다. 본인 외 인물, 유명인, 미성년자, 기만적 의상/제복은 허용되지 않습니다.'
  }

  return {
    positive,
    negative: DEFAULT_NEGATIVE_PROMPT,
    aspectRatio: options.aspectRatio,
    size: aspectToSize(options.aspectRatio),
    safetyNote,
  }
}
