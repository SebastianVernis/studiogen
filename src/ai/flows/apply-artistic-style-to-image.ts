'use server';
/**
 * @fileOverview Applies an artistic style to an image based on a text prompt.
 *
 * - applyArtisticStyleToImage - A function that takes a prompt and style and returns a data URI of the generated image.
 * - ApplyArtisticStyleToImageInput - The input type for the applyArtisticStyleToImage function.
 * - ApplyArtisticStyleToImageOutput - The return type for the applyArtisticStyleToImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ApplyArtisticStyleToImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt for the image.'),
  artStyle: z.string().describe('The artistic style to apply to the image.'),
});
export type ApplyArtisticStyleToImageInput = z.infer<typeof ApplyArtisticStyleToImageInputSchema>;

const ApplyArtisticStyleToImageOutputSchema = z.object({
  image: z.string().describe(
    'The generated image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'.
  ),
});
export type ApplyArtisticStyleToImageOutput = z.infer<typeof ApplyArtisticStyleToImageOutputSchema>;

export async function applyArtisticStyleToImage(input: ApplyArtisticStyleToImageInput): Promise<ApplyArtisticStyleToImageOutput> {
  return applyArtisticStyleToImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'applyArtisticStyleToImagePrompt',
  input: {schema: ApplyArtisticStyleToImageInputSchema},
  output: {schema: ApplyArtisticStyleToImageOutputSchema},
  prompt: `Generate an image based on the following prompt, applying the specified artistic style.

Prompt: {{{prompt}}}
Artistic Style: {{{artStyle}}}

Output the image as a data URI.
`,
});

const applyArtisticStyleToImageFlow = ai.defineFlow(
  {
    name: 'applyArtisticStyleToImageFlow',
    inputSchema: ApplyArtisticStyleToImageInputSchema,
    outputSchema: ApplyArtisticStyleToImageOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      // IMPORTANT: ONLY the googleai/gemini-2.0-flash-exp model is able to generate images. You MUST use exactly this model to generate images.
      model: 'googleai/gemini-2.0-flash-exp',

      prompt: input.prompt + ', ' + input.artStyle,

      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
      },
    });
    return {image: media.url!};
  }
);
