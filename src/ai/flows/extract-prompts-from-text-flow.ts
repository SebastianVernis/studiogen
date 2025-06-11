'use server';
/**
 * @fileOverview Extracts potential image generation prompts from a block of text.
 *
 * - extractPromptsFromText - A function that analyzes text and returns a list of prompts.
 * - ExtractPromptsFromTextInput - The input type for the extractPromptsFromText function.
 * - ExtractPromptsFromTextOutput - The return type for the extractPromptsFromText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractPromptsFromTextInputSchema = z.object({
  textBlock: z.string().describe('A block of text to analyze for image generation prompts.'),
});
export type ExtractPromptsFromTextInput = z.infer<typeof ExtractPromptsFromTextInputSchema>;

const ExtractPromptsFromTextOutputSchema = z.object({
  prompts: z.array(z.string()).describe('A list of extracted image generation prompts.'),
});
export type ExtractPromptsFromTextOutput = z.infer<typeof ExtractPromptsFromTextOutputSchema>;

export async function extractPromptsFromText(input: ExtractPromptsFromTextInput): Promise<ExtractPromptsFromTextOutput> {
  return extractPromptsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractPromptsFromTextPrompt',
  input: {schema: ExtractPromptsFromTextInputSchema},
  output: {schema: ExtractPromptsFromTextOutputSchema},
  prompt: `Analyze the following text and extract distinct phrases or sentences that would make good image generation prompts.
  Each prompt should be a self-contained idea suitable for an image generator.
  Return the prompts as a list of strings. Ensure each prompt is concise and focuses on a single visual concept.
  Do not return more than 10 prompts, even if more are found.

  Text to analyze:
  {{{textBlock}}}
  `,
});

const extractPromptsFlow = ai.defineFlow(
  {
    name: 'extractPromptsFlow',
    inputSchema: ExtractPromptsFromTextInputSchema,
    outputSchema: ExtractPromptsFromTextOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
