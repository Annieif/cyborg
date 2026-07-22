import { ChatMessage, BotTool } from './types';
import { createAIProvider } from './provider';
import type { AIProvider } from './types';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';

/** 估算消息的 token 数（中英文混合） */
function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(char)) {
      tokens += 1.5; // 中文字符约 1.5 token
    } else {
      tokens += 0.25; // 英文字符约 0.25 token
    }
  }
  return Math.ceil(tokens);
}

/** 获取消息的文本内容 */
function getMessageText(msg: ChatMessage): string {
  if (typeof msg.content === 'string') return msg.content;
  return msg.content.map((c) => (c.type === 'text' ? c.text : '[图片]')).join('');
}

/** AI 对话管理器 */
export class ConversationManager {
  private provider: AIProvider;
  private messages: ChatMessage[] = [];
  private tools: BotTool[] = [];
  private maxMessages: number;
  private maxTokens: number;
  private expPrompt: string = '';
  private visionEnabled: boolean;

  constructor(persona?: string, expPrompt?: string) {
    const config = getConfig();
    this.provider = createAIProvider();
    this.maxMessages = config.ai.maxContextMessages;
    this.maxTokens = config.ai.maxTokens;
    this.visionEnabled = config.ai.vision;

    this.expPrompt = expPrompt || '';

    const systemContent = (persona || config.ai.persona) + (this.expPrompt ? '\n\n' + this.expPrompt : '');
    this.messages.push({
      role: 'system',
      content: systemContent,
    });
  }

  /** 更新经验记忆提示 */
  updateExpPrompt(expPrompt: string): void {
    this.expPrompt = expPrompt;
    const config = getConfig();
    this.messages[0].content = (config.ai.persona) + (expPrompt ? '\n\n' + expPrompt : '');
  }

  /** 注册工具 */
  registerTool(tool: BotTool): void {
    this.tools.push(tool);
    getLogger().info(`Tool registered: ${tool.name}`);
  }

  /** 注册多个工具 */
  registerTools(tools: BotTool[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /** 估算当前上下文总 token 数 */
  estimateContextTokens(): number {
    let total = 0;
    for (const msg of this.messages) {
      total += estimateTokens(getMessageText(msg));
    }
    return total;
  }

  /** 添加用户消息并获取 AI 回复 */
  async sendMessage(userMessage: string, playerName?: string, imageBase64?: string): Promise<string> {
    const logger = getLogger();

    // 构建用户消息
    const content: ChatMessage['content'] = imageBase64 && this.visionEnabled
      ? [
          { type: 'text', text: playerName ? `[${playerName}]: ${userMessage}` : userMessage },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}`, detail: 'low' } },
        ]
      : (playerName ? `[${playerName}]: ${userMessage}` : userMessage);

    const msg: ChatMessage = {
      role: 'user',
      content,
    };
    this.messages.push(msg);

    // 裁剪上下文
    this.trimContext();

    // 选择模型（视觉模式切换到视觉模型）
    const response = await this.provider.chat(this.messages, this.tools);

    // 处理工具调用循环
    let loopCount = 0;
    const maxLoops = 5;
    let finalResponse = response;

    while (finalResponse.finishReason === 'tool_calls' && finalResponse.message.tool_calls && loopCount < maxLoops) {
      loopCount++;
      logger.info(`Processing tool calls (loop ${loopCount})`);

      this.messages.push(finalResponse.message);

      for (const toolCall of finalResponse.message.tool_calls) {
        const tool = this.tools.find((t) => t.name === toolCall.function.name);
        if (tool) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            logger.debug(`Executing tool: ${toolCall.function.name}`, args);
            const result = await tool.execute(args);
            this.messages.push({
              role: 'tool',
              content: result,
              tool_call_id: toolCall.id,
            });
          } catch (err) {
            logger.error(`Tool execution error: ${toolCall.function.name}`, err);
            this.messages.push({
              role: 'tool',
              content: `Error: ${err}`,
              tool_call_id: toolCall.id,
            });
          }
        }
      }

      finalResponse = await this.provider.chat(this.messages, this.tools);
    }

    const reply = finalResponse.message.content
      ? (typeof finalResponse.message.content === 'string' ? finalResponse.message.content : '')
      : '（无响应）';
    this.messages.push(finalResponse.message);
    this.trimContext();

    return reply;
  }

  /** 裁剪消息上下文（智能摘要 + 窗口裁剪） */
  private trimContext(): void {
    const systemMsg = this.messages[0];
    const nonSystem = this.messages.slice(1);

    const totalTokens = this.estimateContextTokens();
    const logger = getLogger();

    // 如果总 token 超过预算，尝试摘要压缩
    if (totalTokens > this.maxTokens && nonSystem.length > 6) {
      logger.debug('Context token budget exceeded, summarizing...', {
        tokens: totalTokens,
        budget: this.maxTokens,
      });
      this.summarizeOldMessages();
    }

    // 再按消息数裁剪
    if (nonSystem.length > this.maxMessages) {
      const trimmed = nonSystem.slice(-this.maxMessages);
      this.messages = [systemMsg, ...trimmed];
      logger.debug('Context trimmed by count', {
        before: nonSystem.length + 1,
        after: this.messages.length,
      });
    }
  }

  /** 摘要压缩：将最早的几轮对话合并为一条摘要消息 */
  private summarizeOldMessages(): void {
    const systemMsg = this.messages[0];
    const nonSystem = this.messages.slice(1);

    // 取前 4 条非系统消息（约 2 轮对话）进行摘要
    const oldMsgs = nonSystem.slice(0, 4);
    const newMsgs = nonSystem.slice(4);

    if (oldMsgs.length < 2) return;

    const summary = oldMsgs
      .map((m) => {
        const text = getMessageText(m);
        const preview = text.length > 80 ? text.slice(0, 80) + '...' : text;
        return `[${m.role}] ${preview}`;
      })
      .join(' | ');

    const summaryMsg: ChatMessage = {
      role: 'system',
      content: `[对话摘要] 之前的对话内容概要: ${summary}`,
    };

    this.messages = [systemMsg, summaryMsg, ...newMsgs];
    getLogger().debug('Context summarized', {
      oldMsgs: oldMsgs.length,
      remaining: newMsgs.length,
    });
  }

  /** 清空对话历史 */
  reset(): void {
    const systemMsg = this.messages[0];
    this.messages = [systemMsg];
    getLogger().info('Conversation reset');
  }

  /** 获取对话历史 */
  getHistory(): ChatMessage[] {
    return [...this.messages];
  }

  /** 获取消息数量 */
  get messageCount(): number {
    return this.messages.length;
  }
}