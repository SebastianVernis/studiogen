export interface GenerateImageInput {
  prompt: string;
}

export interface GenerateImageOutput {
  imageUrl: string;
}

export interface ExtractPromptsInput {
  textBlock: string;
}

export interface ExtractPromptsOutput {
  prompts: string[];
}

export interface RefineImageInput {
  originalImageUri: string;
  refinementPrompt: string;
}

export interface RefineImageOutput {
  refinedImageUri: string;
}

export interface ApplyArtisticStyleInput {
  prompt: string;
  artStyle: string;
}

export interface ApplyArtisticStyleOutput {
  image: string;
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

async function makeAnthropicRequest(messages: any[]) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function makeStabilityRequest(endpoint: string, body: any) {
  const response = await fetch(`https://api.stability.ai/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STABILITY_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Stability AI API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function generateImageFromPrompt(input: GenerateImageInput): Promise<GenerateImageOutput> {
  try {
    const response = await makeStabilityRequest('generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      text_prompts: [
        {
          text: input.prompt,
          weight: 1
        }
      ],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
      steps: 30,
    });

    const imageBase64 = response.artifacts?.[0]?.base64;
    if (!imageBase64) {
      throw new Error('No se pudo generar la imagen');
    }

    const imageUrl = `data:image/png;base64,${imageBase64}`;
    return { imageUrl };
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Error al generar la imagen con Stability AI');
  }
}

export async function extractPromptsFromText(input: ExtractPromptsInput): Promise<ExtractPromptsOutput> {
  try {
    const response = await makeAnthropicRequest([
      {
        role: 'user',
        content: `Analiza el siguiente texto y extrae frases o oraciones distintas que serían buenos prompts para generar imágenes. Cada prompt debe ser una idea autocontenida adecuada para un generador de imágenes. Devuelve los prompts como una lista JSON de strings. Asegúrate de que cada prompt sea conciso y se enfoque en un solo concepto visual. No devuelvas más de 10 prompts, incluso si encuentras más. Responde solo con el array JSON, sin texto adicional.

Texto a analizar:
${input.textBlock}`
      }
    ]);

    const content = response.content?.[0]?.text;
    if (!content) {
      throw new Error('No se pudo extraer prompts del texto');
    }

    try {
      const prompts = JSON.parse(content);
      return { prompts: Array.isArray(prompts) ? prompts : [] };
    } catch {
      // If JSON parsing fails, try to extract prompts manually
      const lines = content.split('\n').filter((line: string) => line.trim().length > 0);
      return { prompts: lines.slice(0, 10) };
    }
  } catch (error) {
    console.error('Error extracting prompts:', error);
    throw new Error('Error al extraer prompts del texto');
  }
}

export async function refineImage(input: RefineImageInput): Promise<RefineImageOutput> {
  try {
    // For image refinement, we'll use image-to-image with Stability AI
    const base64Data = input.originalImageUri.split(',')[1];
    
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
      },
      body: (() => {
        const formData = new FormData();
        formData.append('init_image', new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type: 'image/png' }));
        formData.append('text_prompts[0][text]', input.refinementPrompt);
        formData.append('text_prompts[0][weight]', '1');
        formData.append('cfg_scale', '7');
        formData.append('image_strength', '0.35');
        formData.append('samples', '1');
        formData.append('steps', '30');
        return formData;
      })(),
    });

    if (!response.ok) {
      throw new Error(`Stability AI API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const imageBase64 = result.artifacts?.[0]?.base64;
    
    if (!imageBase64) {
      throw new Error('La mejora de la imagen no pudo producir una nueva imagen.');
    }

    const imageUrl = `data:image/png;base64,${imageBase64}`;
    return { refinedImageUri: imageUrl };
  } catch (error) {
    console.error('Error refining image:', error);
    throw new Error('Error al refinar la imagen');
  }
}

export async function applyArtisticStyleToImage(input: ApplyArtisticStyleInput): Promise<ApplyArtisticStyleOutput> {
  try {
    const combinedPrompt = `${input.prompt}, ${input.artStyle}`;
    
    const response = await makeStabilityRequest('generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      text_prompts: [
        {
          text: combinedPrompt,
          weight: 1
        }
      ],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
      steps: 30,
    });

    const imageBase64 = response.artifacts?.[0]?.base64;
    if (!imageBase64) {
      throw new Error('No se pudo aplicar el estilo artístico');
    }

    const imageUrl = `data:image/png;base64,${imageBase64}`;
    return { image: imageUrl };
  } catch (error) {
    console.error('Error applying artistic style:', error);
    throw new Error('Error al aplicar el estilo artístico');
  }
}
