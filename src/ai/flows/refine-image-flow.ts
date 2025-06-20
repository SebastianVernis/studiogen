
'use server';
/**
 * @fileOverview Refines an existing image based on a refinement prompt.
 *
 * - refineImage - A function that takes an image and a refinement prompt and returns a refined image.
 * - RefineImageInput - The input type for the refineImage function.
 * - RefineImageOutput - The return type for the refineImage function.
 */

import {refineImage as refineImageDirect} from '@/ai/genkit';
import {z} from 'zod';

const RefineImageInputSchema = z.object({
  originalImageUri: z.string().describe('The original image as a data URI.'),
  refinementPrompt: z.string().describe('The prompt to refine the image with.'),
});
export type RefineImageInput = z.infer<typeof RefineImageInputSchema>;

const RefineImageOutputSchema = z.object({
  refinedImageUri: z.string().describe('The refined image as a data URI.'),
});
export type RefineImageOutput = z.infer<typeof RefineImageOutputSchema>;

export async function refineImage(input: RefineImageInput): Promise<RefineImageOutput> {
  return refineImageDirect(input);
}
