
'use server';
/**
 * @fileOverview Refines an existing image based on a text prompt with multi-provider support.
 *
 * - refineImage - A function that takes an original image URI and a refinement prompt, and returns a data URI of the refined image.
 * - RefineImageInput - The input type for the refineImage function.
 * - RefineImageOutput - The return type for the refineImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RefineImageInputSchema = z.object({
  originalImageUri: z.string().describe(
    "The original image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  refinementPrompt: z.string().describe('The text prompt to guide the image refinement.'),
  provider: z.string().optional().describe('The AI provider to use for image refinement'),
  model: z.string().optional().describe('The specific model to use'),
});
export type RefineImageInput = z.infer<typeof RefineImageInputSchema>;

const RefineImageOutputSchema = z.object({
  refinedImageUri: z.string().describe(
    "The refined image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type RefineImageOutput = z.infer<typeof RefineImageOutputSchema>;

export async function refineImage(input: RefineImageInput): Promise<RefineImageOutput> {
  // For now, image refinement is only supported by Google's multimodal models
  // Other providers may be added in the future when they support image input
  const provider = input.provider || 'google';
  const model = input.model || 'gemini-2.0-flash-exp';

  if (provider !== 'google') {
    throw new Error('Image refinement is currently only supported by Google Gemini models');
  }

  const { media } = await ai.generate({
    model: `googleai/${model}`,
    prompt: [
      { media: { url: input.originalImageUri } },
      { text: input.refinementPrompt + ", imagen 4" },
    ],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    },
  });

  if (!media?.url) {
    throw new Error('La mejora de la imagen no pudo producir una nueva imagen.');
  }
  return { refinedImageUri: media.url };
}
