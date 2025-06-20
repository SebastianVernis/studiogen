import { NextRequest, NextResponse } from 'next/server';
import { extractPromptsFromText } from '@/ai/flows/extract-prompts-from-text-flow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { textBlock, provider, model } = body;

    if (!textBlock || !provider || !model) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await extractPromptsFromText({
      textBlock,
      provider,
      model
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error extracting prompts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract prompts' },
      { status: 500 }
    );
  }
}
