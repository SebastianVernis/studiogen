'use server';
/**
 * @fileOverview Applies an artistic style to an image generation prompt.
 *
 * - applyArtisticStyleToImage - A function that takes a prompt and an artistic style and returns a styled image.
 * - ApplyArtisticStyleToImageInput - The input type for the applyArtisticStyleToImage function.
 * - ApplyArtisticStyleToImageOutput - The return type for the applyArtisticStyleToImage function.
 */

import {applyArtisticStyleToImage as applyArtisticStyleDirect} from '@/ai/genkit';
import {z} from 'zod';

const ApplyArtisticStyleToImageInputSchema = z.object({
  prompt: z.string().describe('The base prompt for image generation.'),
  artStyle: z.string().describe('The artistic style to apply to the image.'),
});
export type ApplyArtisticStyleToImageInput = z.infer<typeof ApplyArtisticStyleToImageInputSchema>;

const ApplyArtisticStyleToImageOutputSchema = z.object({
  image: z.string().describe('The generated image with applied artistic style as a data URI.'),
});
export type ApplyArtisticStyleToImageOutput = z.infer<typeof ApplyArtisticStyleToImageOutputSchema>;

export async function applyArtisticStyleToImage(input: ApplyArtisticStyleToImageInput): Promise<ApplyArtisticStyleToImageOutput> {
  return applyArtisticStyleDirect(input);
}
