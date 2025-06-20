
export const MAX_PROMPTS_OVERALL = 50;
export const MAX_PROCESSING_JOBS = 10;
export const TITLE_WORD_THRESHOLD = 6;
export const DOWNLOAD_DELAY_MS = 1500;

// AI Provider Configuration
export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'cohere';
  models: AIModel[];
  requiresApiKey: boolean;
  supportsImageGeneration: boolean;
  supportsTextGeneration: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  type: 'text' | 'image' | 'multimodal';
  maxTokens?: number;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'google',
    name: 'Google Gemini',
    type: 'google',
    models: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', type: 'multimodal' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', type: 'multimodal' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', type: 'multimodal' }
    ],
    requiresApiKey: true,
    supportsImageGeneration: true,
    supportsTextGeneration: true
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', type: 'multimodal' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', type: 'text' },
      { id: 'dall-e-3', name: 'DALL-E 3', type: 'image' }
    ],
    requiresApiKey: true,
    supportsImageGeneration: true,
    supportsTextGeneration: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    type: 'anthropic',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', type: 'multimodal' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', type: 'multimodal' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', type: 'text' }
    ],
    requiresApiKey: true,
    supportsImageGeneration: false,
    supportsTextGeneration: true
  },
  {
    id: 'cohere',
    name: 'Cohere',
    type: 'cohere',
    models: [
      { id: 'command-r-plus', name: 'Command R+', type: 'text' },
      { id: 'command-r', name: 'Command R', type: 'text' }
    ],
    requiresApiKey: true,
    supportsImageGeneration: false,
    supportsTextGeneration: true
  }
];

export const DEFAULT_AI_PROVIDER = 'google';
export const DEFAULT_AI_MODEL = 'gemini-2.0-flash-exp';

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
