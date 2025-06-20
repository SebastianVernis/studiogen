'use server';
/**
 * @fileOverview Extracts image prompts from a text block.
 *
 * - extractPromptsFromText - A function that takes a text block and returns an array of image prompts.
 * - ExtractPromptsFromTextInput - The input type for the extractPromptsFromText function.
 * - ExtractPromptsFromTextOutput - The return type for the extractPromptsFromText function.
 */

import {extractPromptsFromText as extractPromptsDirect} from '@/ai/genkit';
import {z} from 'zod';

const ExtractPromptsFromTextInputSchema = z.object({
  textBlock: z.string().describe('The text block to extract prompts from.'),
});
export type ExtractPromptsFromTextInput = z.infer<typeof ExtractPromptsFromTextInputSchema>;

const ExtractPromptsFromTextOutputSchema = z.object({
  prompts: z.array(z.string()).describe('An array of image prompts extracted from the text.'),
});
export type ExtractPromptsFromTextOutput = z.infer<typeof ExtractPromptsFromTextOutputSchema>;

export async function extractPromptsFromText(input: ExtractPromptsFromTextInput): Promise<ExtractPromptsFromTextOutput> {
  return extractPromptsDirect(input);
}
