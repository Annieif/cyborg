import { AIProvider, AIResponse, ChatMessage, BotTool, ToolCall } from './types';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';

export class OpenAIProvider implements AIProvider {
  readonly name: string = 'openai';
  readonly models: string[] = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];

  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private temperature: number;

  constructor() {
    const config = getConfig();
    this.apiKey = config.ai.apiKey;
    this.baseUrl = config.ai.baseUrl;
    this.model = config.ai.model;
    this.temperature = config.ai.temperature;
  }

  async chat(messages: ChatMessage[], tools?: BotTool[]): Promise<AIResponse> {
    const logger = getLogger();
    const url = `${this.baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: this.temperature,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
      body.tool_choice = 'auto';
    }

    logger.debug('AI request', { model: this.model, msgCount: messages.length });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('AI API error', { status: response.status, error: errorText });
      throw new Error(`AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          role: string;
          content: string | null;
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason: string;
      }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    const choice = data.choices[0];
    if (!choice) {
      throw new Error('AI API returned empty choices');
    }

    const result: AIResponse = {
      message: {
        role: choice.message.role as ChatMessage['role'],
        content: choice.message.content || '',
        tool_calls: choice.message.tool_calls?.map((tc): ToolCall => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      },
      finishReason: choice.finish_reason as AIResponse['finishReason'],
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };

    logger.debug('AI response', {
      finishReason: result.finishReason,
      tokens: result.usage?.totalTokens,
    });

    return result;
  }
}

/** Claude API 提供商 (兼容 OpenAI 格式) */
export class ClaudeProvider extends OpenAIProvider {
  readonly name = 'claude';
  readonly models = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
}

/** 自定义 OpenAI 兼容提供商 */
export class CustomProvider extends OpenAIProvider {
  readonly name = 'custom';
  readonly models = ['custom-model'];
}

/** 创建 AI 提供商实例 */
export function createAIProvider(): AIProvider {
  const config = getConfig();
  switch (config.ai.provider) {
    case 'openai':
      return new OpenAIProvider();
    case 'claude':
      return new ClaudeProvider();
    case 'custom':
      return new CustomProvider();
    default:
      throw new Error(`Unknown AI provider: ${config.ai.provider}`);
  }
}