'use server';
/**
 * @fileOverview An image generation AI agent with multi-provider support.
 *
 * - generateImageFromPrompt - A function that handles the image generation process.
 * - GenerateImageFromPromptInput - The input type for the generateImageFromPrompt function.
 * - GenerateImageFromPromptOutput - The return type for the generateImageFromPrompt function.
 */

import { aiProviderService } from '@/ai/ai-provider-service';
import { z } from 'genkit';

const GenerateImageFromPromptInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate an image from.'),
  provider: z.string().optional().describe('The AI provider to use (google, openai, etc.)'),
  model: z.string().optional().describe('The specific model to use'),
});
export type GenerateImageFromPromptInput = z.infer<typeof GenerateImageFromPromptInputSchema>;

const GenerateImageFromPromptOutputSchema = z.object({
  imageUrl: z.string().describe('The generated image as a data URI.'),
});
export type GenerateImageFromPromptOutput = z.infer<typeof GenerateImageFromPromptOutputSchema>;

export async function generateImageFromPrompt(input: GenerateImageFromPromptInput): Promise<GenerateImageFromPromptOutput> {
  const response = await aiProviderService.generateImage({
    prompt: input.prompt,
    provider: input.provider,
    model: input.model
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to generate image');
  }

  return { imageUrl: response.data.imageUrl };
}
