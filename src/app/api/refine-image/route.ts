import { NextRequest, NextResponse } from 'next/server';
import { refineImage } from '@/ai/flows/refine-image-flow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalImageUri, refinementPrompt, provider, model } = body;

    if (!originalImageUri || !refinementPrompt || !provider || !model) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await refineImage({
      originalImageUri,
      refinementPrompt,
      provider,
      model
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error refining image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refine image' },
      { status: 500 }
    );
  }
}
