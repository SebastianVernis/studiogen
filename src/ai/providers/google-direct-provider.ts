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

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

async function makeGoogleAIRequest(endpoint: string, body: any) {
  const response = await fetch(`${API_BASE_URL}/${endpoint}?key=${GOOGLE_AI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Google AI API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function generateImageFromPrompt(input: GenerateImageInput): Promise<GenerateImageOutput> {
  try {
    const requestBody = {
      contents: [{
        parts: [{
          text: input.prompt + ", imagen 4"
        }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }
    };

    const response = await makeGoogleAIRequest('models/gemini-2.0-flash-exp:generateContent', requestBody);
    
    // Extract image URL from response
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        return { imageUrl };
      }
    }

    throw new Error('No se pudo generar la imagen');
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Error al generar la imagen con Google AI');
  }
}

export async function extractPromptsFromText(input: ExtractPromptsInput): Promise<ExtractPromptsOutput> {
  try {
    const requestBody = {
      contents: [{
        parts: [{
          text: `Analiza el siguiente texto y extrae frases o oraciones distintas que serían buenos prompts para generar imágenes. Cada prompt debe ser una idea autocontenida adecuada para un generador de imágenes. Devuelve los prompts como una lista JSON de strings. Asegúrate de que cada prompt sea conciso y se enfoque en un solo concepto visual. No devuelvas más de 10 prompts, incluso si encuentras más. Responde solo con el array JSON, sin texto adicional.

Texto a analizar:
${input.textBlock}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
      }
    };

    const response = await makeGoogleAIRequest('models/gemini-2.0-flash-exp:generateContent', requestBody);
    
    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;
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
    const requestBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: input.originalImageUri.split(';')[0].split(':')[1],
              data: input.originalImageUri.split(',')[1]
            }
          },
          {
            text: input.refinementPrompt + ", imagen 4"
          }
        ]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }
    };

    const response = await makeGoogleAIRequest('models/gemini-2.0-flash-exp:generateContent', requestBody);
    
    // Extract image URL from response
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        return { refinedImageUri: imageUrl };
      }
    }

    throw new Error('La mejora de la imagen no pudo producir una nueva imagen.');
  } catch (error) {
    console.error('Error refining image:', error);
    throw new Error('Error al refinar la imagen');
  }
}

export async function applyArtisticStyleToImage(input: ApplyArtisticStyleInput): Promise<ApplyArtisticStyleOutput> {
  try {
    const combinedPrompt = `${input.prompt}, ${input.artStyle}, imagen 4`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: combinedPrompt
        }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }
    };

    const response = await makeGoogleAIRequest('models/gemini-2.0-flash-exp:generateContent', requestBody);
    
    // Extract image URL from response
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        return { image: imageUrl };
      }
    }

    throw new Error('No se pudo aplicar el estilo artístico');
  } catch (error) {
    console.error('Error applying artistic style:', error);
    throw new Error('Error al aplicar el estilo artístico');
  }
}
