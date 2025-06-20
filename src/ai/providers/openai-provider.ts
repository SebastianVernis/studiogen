import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function generateImageFromPrompt(input: GenerateImageInput): Promise<GenerateImageOutput> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: input.prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No se pudo generar la imagen');
    }

    return { imageUrl };
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Error al generar la imagen con OpenAI');
  }
}

export async function extractPromptsFromText(input: ExtractPromptsInput): Promise<ExtractPromptsOutput> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Analiza el siguiente texto y extrae frases o oraciones distintas que serían buenos prompts para generar imágenes. Cada prompt debe ser una idea autocontenida adecuada para un generador de imágenes. Devuelve los prompts como una lista JSON de strings. Asegúrate de que cada prompt sea conciso y se enfoque en un solo concepto visual. No devuelvas más de 10 prompts, incluso si encuentras más. Responde solo con el array JSON, sin texto adicional."
        },
        {
          role: "user",
          content: input.textBlock
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No se pudo extraer prompts del texto');
    }

    try {
      const prompts = JSON.parse(content);
      return { prompts: Array.isArray(prompts) ? prompts : [] };
    } catch {
      // If JSON parsing fails, try to extract prompts manually
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      return { prompts: lines.slice(0, 10) };
    }
  } catch (error) {
    console.error('Error extracting prompts:', error);
    throw new Error('Error al extraer prompts del texto');
  }
}

export async function refineImage(input: RefineImageInput): Promise<RefineImageOutput> {
  try {
    // OpenAI doesn't support image editing with DALL-E 3 in the same way
    // We'll generate a new image based on the refinement prompt
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${input.refinementPrompt} (refinement of existing image)`,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No se pudo refinar la imagen');
    }

    return { refinedImageUri: imageUrl };
  } catch (error) {
    console.error('Error refining image:', error);
    throw new Error('Error al refinar la imagen');
  }
}

export async function applyArtisticStyleToImage(input: ApplyArtisticStyleInput): Promise<ApplyArtisticStyleOutput> {
  try {
    const combinedPrompt = `${input.prompt}, ${input.artStyle}`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: combinedPrompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No se pudo aplicar el estilo artístico');
    }

    return { image: imageUrl };
  } catch (error) {
    console.error('Error applying artistic style:', error);
    throw new Error('Error al aplicar el estilo artístico');
  }
}
