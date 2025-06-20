import { NextRequest, NextResponse } from 'next/server';
import { generateImageFromPrompt } from '@/ai/flows/generate-image-from-prompt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, artStyle, provider, model } = body;

    if (!prompt || !artStyle || !provider || !model) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await generateImageFromPrompt({
      prompt,
      artStyle,
      provider,
      model
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
