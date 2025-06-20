import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CohereApi } from 'cohere-ai';
import { ai } from './genkit';
import { AI_PROVIDERS, AIProvider, AIModel, DEFAULT_AI_PROVIDER, DEFAULT_AI_MODEL } from '@/lib/artbot-config';

export interface AIProviderConfig {
  provider: string;
  model: string;
  apiKey?: string;
}

export interface GenerateImageRequest {
  prompt: string;
  provider?: string;
  model?: string;
}

export interface GenerateTextRequest {
  prompt: string;
  provider?: string;
  model?: string;
  maxTokens?: number;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class AIProviderService {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private cohereClient: CohereApi | null = null;
  private currentConfig: AIProviderConfig;

  constructor() {
    this.currentConfig = {
      provider: DEFAULT_AI_PROVIDER,
      model: DEFAULT_AI_MODEL
    };
  }

  setConfiguration(config: AIProviderConfig) {
    this.currentConfig = config;
    this.initializeClients();
  }

  private initializeClients() {
    // Initialize OpenAI client
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Initialize Anthropic client
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // Initialize Cohere client
    if (process.env.COHERE_API_KEY) {
      this.cohereClient = new CohereApi({
        token: process.env.COHERE_API_KEY,
      });
    }
  }

  async generateImage(request: GenerateImageRequest): Promise<AIResponse> {
    const provider = request.provider || this.currentConfig.provider;
    const model = request.model || this.currentConfig.model;

    try {
      switch (provider) {
        case 'google':
          return await this.generateImageWithGoogle(request.prompt, model);
        case 'openai':
          return await this.generateImageWithOpenAI(request.prompt, model);
        default:
          return {
            success: false,
            error: `Provider ${provider} does not support image generation`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error generating image: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async generateText(request: GenerateTextRequest): Promise<AIResponse> {
    const provider = request.provider || this.currentConfig.provider;
    const model = request.model || this.currentConfig.model;

    try {
      switch (provider) {
        case 'google':
          return await this.generateTextWithGoogle(request.prompt, model);
        case 'openai':
          return await this.generateTextWithOpenAI(request.prompt, model, request.maxTokens);
        case 'anthropic':
          return await this.generateTextWithAnthropic(request.prompt, model, request.maxTokens);
        case 'cohere':
          return await this.generateTextWithCohere(request.prompt, model, request.maxTokens);
        default:
          return {
            success: false,
            error: `Unsupported provider: ${provider}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error generating text: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async generateImageWithGoogle(prompt: string, model: string): Promise<AIResponse> {
    try {
      const { media } = await ai.generate({
        model: `googleai/${model}`,
        prompt: prompt + ", imagen 4",
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

      if (!media || !media.url) {
        throw new Error('No media returned from Google AI model');
      }

      return {
        success: true,
        data: { imageUrl: media.url }
      };
    } catch (error) {
      throw error;
    }
  }

  private async generateImageWithOpenAI(prompt: string, model: string): Promise<AIResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized. Please check your API key.');
    }

    const response = await this.openaiClient.images.generate({
      model: model === 'dall-e-3' ? 'dall-e-3' : 'dall-e-2',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url'
    });

    return {
      success: true,
      data: { imageUrl: response.data[0].url }
    };
  }

  private async generateTextWithGoogle(prompt: string, model: string): Promise<AIResponse> {
    const { text } = await ai.generate({
      model: `googleai/${model}`,
      prompt: prompt,
    });

    return {
      success: true,
      data: { text }
    };
  }

  private async generateTextWithOpenAI(prompt: string, model: string, maxTokens?: number): Promise<AIResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized. Please check your API key.');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens || 1000,
    });

    return {
      success: true,
      data: { text: response.choices[0].message.content }
    };
  }

  private async generateTextWithAnthropic(prompt: string, model: string, maxTokens?: number): Promise<AIResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized. Please check your API key.');
    }

    const response = await this.anthropicClient.messages.create({
      model: model,
      max_tokens: maxTokens || 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      success: true,
      data: { text: response.content[0].type === 'text' ? response.content[0].text : '' }
    };
  }

  private async generateTextWithCohere(prompt: string, model: string, maxTokens?: number): Promise<AIResponse> {
    if (!this.cohereClient) {
      throw new Error('Cohere client not initialized. Please check your API key.');
    }

    const response = await this.cohereClient.generate({
      model: model,
      prompt: prompt,
      maxTokens: maxTokens || 1000,
    });

    return {
      success: true,
      data: { text: response.generations[0].text }
    };
  }

  getAvailableProviders(): AIProvider[] {
    return AI_PROVIDERS;
  }

  getCurrentConfig(): AIProviderConfig {
    return this.currentConfig;
  }
}

export const aiProviderService = new AIProviderService();
