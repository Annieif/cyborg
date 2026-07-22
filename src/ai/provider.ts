import { AIProvider, AIResponse, ChatMessage, BotTool, ToolCall } from './types';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';

export class OpenAIProvider implements AIProvider {
  readonly name: string = 'openai';
  readonly models: string[] = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];

  protected apiKey: string;
  protected baseUrl: string;
  private model: string;
  private visionModel: string;
  private temperature: number;
  private visionEnabled: boolean;

  constructor() {
    const config = getConfig();
    this.apiKey = config.ai.apiKey;
    this.baseUrl = config.ai.baseUrl;
    this.model = config.ai.model;
    this.visionModel = config.ai.visionModel;
    this.temperature = config.ai.temperature;
    this.visionEnabled = config.ai.vision;
  }

  async chat(messages: ChatMessage[], tools?: BotTool[]): Promise<AIResponse> {
    const logger = getLogger();
    const url = `${this.baseUrl}/chat/completions`;

    // 检测是否有视觉内容，自动切换视觉模型
    const hasVision = this.visionEnabled && messages.some(
      (m) => Array.isArray(m.content) && m.content.some((c) => c.type === 'image_url')
    );
    const effectiveModel = hasVision ? this.visionModel : this.model;

    const body: Record<string, unknown> = {
      model: effectiveModel,
      messages,
      temperature: this.temperature,
    };

    if (hasVision) {
      body.max_tokens = 4096; // 视觉模式响应可能较长
    }

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

    logger.debug('AI request', { model: effectiveModel, msgCount: messages.length, vision: hasVision });

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

/** Claude API 提供商 (Anthropic Messages API 原生格式) */
export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  readonly models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor() {
    const config = getConfig();
    this.apiKey = config.ai.apiKey;
    this.baseUrl = config.ai.baseUrl;
    this.model = config.ai.model;
    this.temperature = config.ai.temperature;
    this.maxTokens = 1024;
  }

  async chat(messages: ChatMessage[], tools?: BotTool[]): Promise<AIResponse> {
    const logger = getLogger();

    // 分离 system prompt 和普通消息
    let systemPrompt = '';
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string | Array<Record<string, unknown>> }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n' : '') + (typeof msg.content === 'string' ? msg.content : '');
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        const content = typeof msg.content === 'string' ? msg.content : '';
        // 处理已有的 tool_calls（assistant 消息中的工具调用）
        if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
          const contentBlocks: Array<Record<string, unknown>> = [];
          if (content) {
            contentBlocks.push({ type: 'text', text: content });
          }
          for (const tc of msg.tool_calls) {
            contentBlocks.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments),
            });
          }
          anthropicMessages.push({ role: 'assistant', content: contentBlocks });
        } else if (msg.role === 'user' && msg.tool_call_id) {
          // tool result message
          anthropicMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: msg.tool_call_id,
              content: content,
            }],
          });
        } else {
          anthropicMessages.push({ role: msg.role as 'user' | 'assistant', content });
        }
      }
    }

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: anthropicMessages,
      temperature: this.temperature,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    logger.debug('Claude API request', { model: this.model, msgCount: anthropicMessages.length });

    const url = `${this.baseUrl}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Claude API error', { status: response.status, error: errorText });
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as {
      content: Array<{
        type: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
      }>;
      stop_reason: string;
      usage?: {
        input_tokens: number;
        output_tokens: number;
      };
    };

    // 提取文本和工具调用
    let textContent = '';
    const toolCalls: ToolCall[] = [];

    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id || '',
          type: 'function',
          function: {
            name: block.name || '',
            arguments: JSON.stringify(block.input || {}),
          },
        });
      }
    }

    const result: AIResponse = {
      message: {
        role: 'assistant',
        content: textContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      },
      finishReason: data.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    };

    logger.debug('Claude API response', {
      finishReason: result.finishReason,
      tokens: result.usage?.totalTokens,
    });

    return result;
  }
}

/** 自定义 OpenAI 兼容提供商 */
export class CustomProvider extends OpenAIProvider {
  readonly name = 'custom';
  readonly models = ['custom-model'];
}

/** Ollama 本地模型提供商（OpenAI 兼容） */
export class OllamaProvider extends OpenAIProvider {
  readonly name = 'ollama';
  readonly models = [
    'llama3.2', 'llama3.1', 'qwen2.5', 'qwen3',
    'deepseek-r1', 'deepseek-coder', 'mistral', 'mixtral',
    'gemma3', 'phi4', 'codellama', 'dolphin3',
  ];

  constructor() {
    super();
    const config = getConfig();
    this.baseUrl = config.ai.baseUrl || 'http://localhost:11434/v1';
    // Ollama 不需要 API Key，但需要非空值才能通过 Authorization header
    if (!config.ai.apiKey) {
      this.apiKey = 'ollama';
    }
  }
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
    case 'ollama':
      return new OllamaProvider();
    default:
      throw new Error(`Unknown AI provider: ${config.ai.provider}`);
  }
}