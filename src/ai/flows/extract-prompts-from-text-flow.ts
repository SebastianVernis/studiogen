'use server';
/**
 * @fileOverview Extracts potential image generation prompts from a block of text with multi-provider support.
 *
 * - extractPromptsFromText - A function that analyzes text and returns a list of prompts.
 * - ExtractPromptsFromTextInput - The input type for the extractPromptsFromText function.
 * - ExtractPromptsFromTextOutput - The return type for the extractPromptsFromText function.
 */

import { aiProviderService } from '@/ai/ai-provider-service';
import { z } from 'genkit';

const ExtractPromptsFromTextInputSchema = z.object({
  textBlock: z.string().describe('A block of text to analyze for image generation prompts.'),
  provider: z.string().optional().describe('The AI provider to use for text analysis'),
  model: z.string().optional().describe('The specific model to use'),
});
export type ExtractPromptsFromTextInput = z.infer<typeof ExtractPromptsFromTextInputSchema>;

const ExtractPromptsFromTextOutputSchema = z.object({
  prompts: z.array(z.string()).describe('A list of extracted image generation prompts.'),
});
export type ExtractPromptsFromTextOutput = z.infer<typeof ExtractPromptsFromTextOutputSchema>;

export async function extractPromptsFromText(input: ExtractPromptsFromTextInput): Promise<ExtractPromptsFromTextOutput> {
  const promptText = `Analyze the following text and extract distinct phrases or sentences that would make good image generation prompts.
  Each prompt should be a self-contained idea suitable for an image generator.
  Return the prompts as a JSON array of strings. Ensure each prompt is concise and focuses on a single visual concept.
  Do not return more than 10 prompts, even if more are found.

  Text to analyze:
  ${input.textBlock}
  
  Return only a JSON array of strings, no other text.`;

  const response = await aiProviderService.generateText({
    prompt: promptText,
    provider: input.provider,
    model: input.model,
    maxTokens: 1000
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to extract prompts from text');
  }

  try {
    // Try to parse the response as JSON
    const prompts = JSON.parse(response.data.text);
    if (Array.isArray(prompts)) {
      return { prompts: prompts.slice(0, 10) }; // Limit to 10 prompts
    } else {
      // Fallback: split by lines and clean up
      const lines = response.data.text.split('
').filter(line => line.trim().length > 0);
      return { prompts: lines.slice(0, 10) };
    }
  } catch (error) {
    // Fallback: split by lines and clean up
    const lines = response.data.text.split('
').filter(line => line.trim().length > 0);
    return { prompts: lines.slice(0, 10) };
  }
}
