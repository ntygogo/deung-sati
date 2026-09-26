/** Read-only appearance projection. Never awards points or rewrites birth DNA.
 * Freeze this catalog: add new families in a new version, not by reordering V1.
 */
export const APPEARANCE_VERSION = 1 as const;
export const PALETTES = [
  { id: 'soft_sakura', label: 'ชมพูไข่มุก', body: '#F4BACD', secondary: '#8BD3DD', lamp: '#FFD992', hue: 0, saturation: 1 },
  { id: 'jade_mint', label: 'หยกมิ้นต์', body: '#B8DFCF', secondary: '#C5B1DF', lamp: '#FFE6AB', hue: 165, saturation: .78 },
  { id: 'aurora_blue', label: 'น้ำเงินออโรรา', body: '#999BEB', secondary: '#85E0D2', lamp: '#E4DDFF', hue: 260, saturation: 1.15 },
  { id: 'golden_pink', label: 'พีชแชมเปญ', body: '#F1C49E', secondary: '#C7B4DB', lamp: '#FFE2AD', hue: 38, saturation: .82 },
  { id: 'lavender_pink', label: 'ม่วงลาเวนเดอร์', body: '#C5B1EF', secondary: '#ECA9D0', lamp: '#E6DFFF', hue: 300, saturation: .88 },
  { id: 'powder_blue', label: 'ฟ้าไข่มุก', body: '#AFCFED', secondary: '#E9B7CF', lamp: '#FFF1CE', hue: 215, saturation: .68 },
  { id: 'coral_pastel', label: 'พีชปะการัง', body: '#FFA07A', secondary: '#FBCFAF', lamp: '#FFE3B0', hue: 25, saturation: 1.12 },
  { id: 'electric_rose', label: 'ชมพูกุหลาบ', body: '#FF6584', secondary: '#DBB8F3', lamp: '#FFE2BF', hue: 350, saturation: 1.35 },
] as const;

export const TRAIT_CATALOG = {
  surface: { label: 'ผิว', options: [['pearl', 'มุกนุ่ม'], ['opal', 'โอปอล'], ['satin', 'ซาติน']] },
  gills: { label: 'เหงือก', options: [['triple_feather', 'ขนทะเล'], ['crystalline_leaf', 'ใบแก้ว'], ['starlight_streamers', 'ริบบิ้นแสง'], ['fluffy_cloud', 'เมฆนุ่ม']] },
  feelers: { label: 'หนวดข้างแก้ม', options: [['pearl_tips', 'ปลายไข่มุก'], ['dew_drops', 'หยดน้ำ'], ['branched_delicate', 'กิ่งละเอียด'], ['leaf_tips', 'ปลายใบไม้']] },
  eyes: { label: 'แววตา', options: [['sparkle_curious', 'ใคร่รู้'], ['gentle_crescent', 'อ่อนโยน'], ['playful_round', 'ขี้เล่น'], ['starry_wonder', 'ประกายดาว']] },
  cheeks: { label: 'แก้ม', options: [['rosy_soft', 'กุหลาบนุ่ม'], ['star_dust', 'ละอองดาว'], ['aurora_blush', 'สีเหลือบ'], ['coral_glow', 'ปะการังอุ่น']] },
  stalk: { label: 'ก้านโคม', options: [['gentle_arch', 'โค้งอ่อน'], ['swaying_arc', 'โค้งพลิ้ว'], ['curious_curve', 'โค้งเอน']] },
  lantern: { label: 'ปลายโคม', options: [['pearl_glow', 'ไข่มุก'], ['crystal_lotus', 'ดอกบัว'], ['star_beacon', 'ดาวมน'], ['cosmic_orb', 'ลูกแก้ว']] },
  tail: { label: 'ครีบหาง', options: [['swaying_fin', 'คลื่นพลิ้ว'], ['ribbon_flow', 'ริบบิ้น'], ['sparkle_fan', 'พัดประกาย']] },
  pattern: { label: 'ลายผิว', options: [['pearl_freckles', 'จุดไข่มุก'], ['starlight_speckles', 'กลุ่มดาว'], ['water_ripples', 'เส้นน้ำ'], ['petal_marks', 'กลีบดอก']] },
  aura: { label: 'ออรา', options: [['dreamy_glow', 'ประกายนุ่ม'], ['stardust_ring', 'วงดาว'], ['gentle_mist', 'ละอองใส'], ['warm_radiance', 'แสงหิ่งห้อย']] },
  motion: { label: 'จังหวะเคลื่อนไหว', options: [['serene_swaying', 'ลอยช้า'], ['curious_peek', 'เอียงหัวสำรวจ'], ['playful_bob', 'ลอยขี้เล่น'], ['dreamy_drift', 'พลิ้วพักใจ']] },
  keepsake: { label: 'ของคู่กาย', options: [['pearl_shell', 'เปลือกหอยมุก'], ['water_pebble', 'หยดน้ำแก้ว'], ['star_stone', 'หินดาว'], ['little_book', 'หนังสือเล่มเล็ก']] },
  habitat: { label: 'ห้องพักใจ', options: [['moonlit_pond', 'บ่อน้ำใต้แสงจันทร์'], ['misty_moss', 'สวนมอสส์'], ['crystal_cavern', 'ถ้ำผลึก'], ['zen_haven', 'บ้านไม้แสนสงบ']] },
} as const;
export type TraitKey = keyof typeof TRAIT_CATALOG;
export type Trait = { id: string; label: string; origin: 'birth' | 'legacy' | 'seed' };
export type SkillKey = 'emotionalAwareness' | 'somaticAwareness' | 'cognitiveClarity' | 'consciousAction';
export interface CompanionAppearanceSource { id?: string; seed?: number | string; dna?: unknown; snapshot?: unknown }
export interface CompanionAppearance {
  version: typeof APPEARANCE_VERSION;
  identity: string;
  palette: { id: string; label: string; body: string; secondary: string; lamp: string; hue: number; saturation: number };
  traits: Record<TraitKey, Trait>;
  skills: Record<SkillKey, number>;
  hasBirthSnapshot: boolean;
  patternSeed: number;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function scalar(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
}
export function appearanceHash(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}
function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
function colorHue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (!delta) return 0;
  return ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
}
const legacyFields: Partial<Record<TraitKey, string>> = {
  gills: 'gill_type', feelers: 'cheek_feeler_type', lantern: 'head_light_tip', tail: 'tail_type',
  pattern: 'body_pattern', motion: 'movement_personality', habitat: 'safe_space_theme',
};
const birthFields: Partial<Record<TraitKey, string>> = {
  pattern: 'bodyPattern', motion: 'movementPersonality', eyes: 'eyeShape', cheeks: 'cheekStyle', gills: 'gillStyle', lantern: 'lanternShape', tail: 'tailStyle', aura: 'auraStyle',
};
const aliases: Record<string, string> = {
  feathered_majestic: 'triple_feather', feathered: 'triple_feather', soft_feather: 'triple_feather',
  star_lantern: 'star_beacon', pearl: 'pearl_glow', rounded: 'pearl_glow', flowing: 'ribbon_flow',
  soft_speckles: 'pearl_freckles', gentle_float: 'serene_swaying', morning_garden: 'misty_moss',
  stargazing_balcony: 'moonlit_pond', reading_room: 'zen_haven', forest_stream: 'misty_moss',
};

export function resolveCompanionAppearance(source: CompanionAppearanceSource = {}): CompanionAppearance {
  const snapshot = record(source.snapshot), birth = record(snapshot.dna_json), legacy = record(source.dna);
  // Always start from the companion identity. A newly attached hatch snapshot must not
  // reroll seed-derived characteristics. Historical explicit birth traits take precedence.
  const seed = scalar(source.seed) ?? scalar(source.id) ?? scalar(snapshot.seed) ?? 'companion-default';
  const identity = `v1-${appearanceHash(seed).toString(16).padStart(8, '0')}`;
  const requestedColor = scalar(birth.primaryColor) ?? scalar(legacy.primary_pink_shade);
  const paletteBase = PALETTES.find(p => p.id === requestedColor) ?? PALETTES[0];
  const body = color(requestedColor, paletteBase.body);
  const palette = {
    ...paletteBase,
    body,
    secondary: color(birth.secondaryColor, color(legacy.secondary_color, paletteBase.secondary)),
    hue: body === paletteBase.body ? paletteBase.hue : (colorHue(body) - colorHue(PALETTES[0].body) + 360) % 360,
  };
  const traits = {} as Record<TraitKey, Trait>;
  for (const key of Object.keys(TRAIT_CATALOG) as TraitKey[]) {
    const options: readonly (readonly [string, string])[] = TRAIT_CATALOG[key].options;
    const born = scalar(birth[birthFields[key] ?? key]);
    const old = scalar(legacy[legacyFields[key] ?? key]) ?? (key === 'lantern' ? scalar(legacy.head_light_type) : undefined);
    const match = (id?: string) => options.find(([value]) => value === (id ? aliases[id] ?? id : undefined));
    const birthMatch = match(born), oldMatch = match(old);
    const chosen = birthMatch ?? oldMatch ?? options[appearanceHash(`${seed}:v1:${key}`) % options.length];
    traits[key] = { id: chosen[0], label: chosen[1], origin: birthMatch ? 'birth' : oldMatch ? 'legacy' : 'seed' };
  }
  const summary = record(birth.skillsSummary);
  const skills = {} as Record<SkillKey, number>;
  for (const key of ['emotionalAwareness', 'somaticAwareness', 'cognitiveClarity', 'consciousAction'] as const) {
    const value = summary[key];
    skills[key] = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  return { version: APPEARANCE_VERSION, identity, palette, traits, skills,
    hasBirthSnapshot: Object.keys(birth).length > 0, patternSeed: appearanceHash(`${seed}:pattern-position:v1`) };
}

/** Sandbox only; consumers never save this projection back as a Growth Event. */
export function previewAppearance(base: CompanionAppearance, overrides: Partial<Record<TraitKey | 'palette', string>>): CompanionAppearance {
  const traits = { ...base.traits };
  for (const key of Object.keys(TRAIT_CATALOG) as TraitKey[]) {
    const options: readonly (readonly [string, string])[] = TRAIT_CATALOG[key].options;
    const chosen = options.find(([id]) => id === overrides[key]);
    if (chosen) traits[key] = { id: chosen[0], label: chosen[1], origin: 'seed' };
  }
  const palette = PALETTES.find(p => p.id === overrides.palette);
  return { ...base, traits, palette: palette ? { ...palette } : base.palette };
}

export const VISIBLE_TRAITS: readonly TraitKey[] = ['surface', 'pattern', 'aura', 'motion'];
export const DEMO_COMPANIONS: readonly CompanionAppearanceSource[] = [
  { id: 'example-pearl', seed: 101, dna: { primary_pink_shade: 'soft_sakura', body_pattern: 'pearl_freckles', movement_personality: 'curious_peek', aura: 'dreamy_glow' } },
  { id: 'example-dew', seed: 202, dna: { primary_pink_shade: 'jade_mint', body_pattern: 'water_ripples', movement_personality: 'serene_swaying', aura: 'gentle_mist', surface: 'opal' } },
  { id: 'example-aurora', seed: 303, dna: { primary_pink_shade: 'aurora_blue', body_pattern: 'starlight_speckles', movement_personality: 'playful_bob', aura: 'stardust_ring' } },
  { id: 'example-petal', seed: 404, dna: { primary_pink_shade: 'golden_pink', body_pattern: 'petal_marks', movement_personality: 'dreamy_drift', aura: 'warm_radiance', surface: 'satin' } },
];
