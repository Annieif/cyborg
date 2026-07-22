/** AI 对话消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }>;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/** AI 工具调用 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** AI 响应 */
export interface AIResponse {
  message: ChatMessage;
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** Bot 可用工具定义 */
export interface BotTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

/** AI 提供商接口 */
export interface AIProvider {
  /** 发送对话请求 */
  chat(messages: ChatMessage[], tools?: BotTool[]): Promise<AIResponse>;
  /** 获取提供商名称 */
  readonly name: string;
  /** 支持的模型列表 */
  readonly models: string[];
}