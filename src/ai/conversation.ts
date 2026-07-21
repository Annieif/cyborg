import { ChatMessage, BotTool } from './types';
import { createAIProvider } from './provider';
import type { AIProvider } from './types';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';

/** AI 对话管理器 */
export class ConversationManager {
  private provider: AIProvider;
  private messages: ChatMessage[] = [];
  private tools: BotTool[] = [];
  private maxMessages: number;
  private expPrompt: string = '';

  constructor(persona?: string, expPrompt?: string) {
    const config = getConfig();
    this.provider = createAIProvider();
    this.maxMessages = config.ai.maxContextMessages;

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
    // 更新 system message
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

  /** 添加用户消息并获取 AI 回复 */
  async sendMessage(userMessage: string, playerName?: string): Promise<string> {
    const logger = getLogger();

    // 添加用户消息
    const msg: ChatMessage = {
      role: 'user',
      content: playerName ? `[${playerName}]: ${userMessage}` : userMessage,
    };
    this.messages.push(msg);

    // 裁剪上下文
    this.trimContext();

    // 发送请求
    let response = await this.provider.chat(this.messages, this.tools);

    // 处理工具调用循环
    let loopCount = 0;
    const maxLoops = 5;

    while (response.finishReason === 'tool_calls' && response.message.tool_calls && loopCount < maxLoops) {
      loopCount++;
      logger.info(`Processing tool calls (loop ${loopCount})`);

      // 添加 assistant 消息
      this.messages.push(response.message);

      // 执行工具调用
      for (const toolCall of response.message.tool_calls) {
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

      // 继续对话
      response = await this.provider.chat(this.messages, this.tools);
    }

    const reply = response.message.content || '（无响应）';
    this.messages.push(response.message);
    this.trimContext();

    return reply;
  }

  /** 裁剪消息上下文 */
  private trimContext(): void {
    // 保留 system message，裁剪最早的非 system 消息
    const systemMsg = this.messages[0];
    const nonSystem = this.messages.slice(1);

    if (nonSystem.length > this.maxMessages) {
      const trimmed = nonSystem.slice(-this.maxMessages);
      this.messages = [systemMsg, ...trimmed];
      getLogger().debug('Context trimmed', {
        before: nonSystem.length + 1,
        after: this.messages.length,
      });
    }
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