
export const MAX_PROMPTS_OVERALL = 50;
export const MAX_PROCESSING_JOBS = 20;
export const TITLE_WORD_THRESHOLD = 6;
export const DOWNLOAD_DELAY_MS = 1500;

export interface ArtStyle {
  name: string;
  value: string;
  promptSuffix: string;
}

export const artStyles: ArtStyle[] = [
  { name: "Cyberpunk (Predeterminado)", value: "cyberpunk", promptSuffix: ", estilo cyberpunk futurista, paleta de colores rosa neón y lila, cualquier texto debe ser claramente legible, alta definición." },
  { name: "Realista", value: "realistic", promptSuffix: ", fotografía realista, fotorrealista, detallado, 8k, alta resolución." },
  { name: "Vaporwave", value: "vaporwave", promptSuffix: ", estilo vaporwave, colores pastel neón, estatuas romanas, rejillas, atardecer, cualquier texto debe ser claramente legible, alta definición." },
  { name: "Synthwave", value: "synthwave", promptSuffix: ", estilo synthwave, rejilla de neón, palmeras, sol retro, colores vibrantes, cualquier texto debe ser claramente legible, alta definición." },
  { name: "Fantasía Oscura", value: "dark_fantasy", promptSuffix: ", estilo fantasía oscura, épico, atmosférico, detallado, cualquier texto debe ser claramente legible, alta definición." },
  { name: "Pixel Art", value: "pixel_art", promptSuffix: ", estilo pixel art, 16-bit, colores vibrantes, cualquier texto debe ser claramente legible." },
  { name: "Anime de los 90", value: "90s_anime", promptSuffix: ", estilo anime de los 90, cel shading, colores vibrantes, estético, alta definición." },
  { name: "Cómic Americano", value: "comic_book", promptSuffix: ", estilo cómic americano, arte lineal audaz, colores planos, puntos de semitono, dinámico, alta definición." },
  { name: "Fotografía Cinematográfica", value: "cinematic_photo", promptSuffix: ", fotografía cinematográfica, toma de película, iluminación dramática, colores profundos, ultra detallado, 8k." },
  { name: "Pintura de Acuarela", value: "watercolor", promptSuffix: ", pintura de acuarela vibrante, trazos sueltos, salpicaduras de pintura, papel texturizado, artístico." },
  { name: "Steampunk", value: "steampunk", promptSuffix: ", estilo steampunk, intrincados engranajes y relojes, tonos sepia y bronce, estética victoriana, detallado." },
  { name: "Arte Lineal Minimalista", value: "line_art", promptSuffix: ", arte lineal minimalista, contornos limpios, un solo color sobre fondo blanco, simple, moderno." }
];

export interface DisplayItemBase {
  id: number;
  type: 'title_comment' | 'external_image' | 'skipped_prompt' | 'prompt';
}

export interface TitleItem extends DisplayItemBase {
  type: 'title_comment';
  text: string;
}

export interface ExternalImageItem extends DisplayItemBase {
  type: 'external_image';
  imageUrl: string;
}

export interface SkippedPromptItem extends DisplayItemBase {
  type: 'skipped_prompt';
  text: string;
  reason: string;
}

export interface PromptJob extends DisplayItemBase {
  type: 'prompt';
  originalPrompt: string;
  styledPrompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refining';
  imageUrl: string | null;
  error: string | null;
  artStyleUsed: string;
}

export type DisplayItem = TitleItem | ExternalImageItem | SkippedPromptItem | PromptJob;
