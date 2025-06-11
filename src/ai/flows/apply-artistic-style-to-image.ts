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
    'The generated image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
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
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: input.prompt + ', ' + input.artStyle + ", imagen 4",
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
    return {image: media.url!};
  }
);
