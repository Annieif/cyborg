import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  minecraft: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().int().positive().default(25565),
    username: z.string().default('AI_Cyborg'),
    version: z.string().default('1.20.1'),
    auth: z.enum(['offline', 'microsoft']).default('offline'),
  }),
  ai: z.object({
    provider: z.enum(['openai', 'claude', 'custom', 'ollama', 'free']).default('openai'),
    apiKey: z.string().default(''),
    model: z.string().default('gpt-4o'),
    baseUrl: z.string().default('https://api.openai.com/v1'),
    persona: z.string().default('你是一个友善的Minecraft AI赛博人。你可以与玩家聊天、帮助他们建造、探索世界。你的名字是赛博人。重要：你可以使用 doActionChain 工具一次性规划并执行多步动作（如"先移动到坐标，再挖掘方块，再收集掉落物"），这比多次单独调用工具效率更高。'),
    maxContextMessages: z.coerce.number().int().positive().default(20),
    maxTokens: z.coerce.number().int().positive().default(8000),
    temperature: z.coerce.number().min(0).max(2).default(0.7),
    vision: z.coerce.boolean().default(false),
    visionModel: z.string().default('gpt-4o'),
    autonomous: z.coerce.boolean().default(false),
    autonomousIdleTimeout: z.coerce.number().int().positive().default(60),
    autonomousInterval: z.coerce.number().int().positive().default(30),
    autonomousAiDriven: z.coerce.boolean().default(false),
    /** 免费 API 模式：工具调用最大循环次数（节约请求） */
    maxToolLoops: z.coerce.number().int().min(1).max(10).default(5),
    /** 动作链：AI 可一次性规划多步动作并顺序执行 */
    actionChain: z.coerce.boolean().default(true),
  }),
  web: z.object({
    port: z.coerce.number().int().positive().default(3000),
    host: z.string().default('localhost'),
  }),
  vpt: z.object({
    enabled: z.coerce.boolean().default(false),
    bridgeUrl: z.string().default('http://127.0.0.1:8765'),
    modelPath: z.string().default(''),
    weightsPath: z.string().default(''),
    visualAutonomous: z.coerce.boolean().default(false),
    autonomousInterval: z.coerce.number().int().positive().default(200),
    stochastic: z.coerce.boolean().default(true),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    file: z.string().default('logs/bot.log'),
  }),
});

export type Config = z.infer<typeof configSchema>;

let _config: Config | null = null;

export function loadConfig(): Config {
  if (_config) return _config;

  const raw = {
    minecraft: {
      host: process.env.MC_HOST,
      port: process.env.MC_PORT,
      username: process.env.MC_USERNAME,
      version: process.env.MC_VERSION,
      auth: process.env.MC_AUTH,
    },
    ai: {
      provider: process.env.AI_PROVIDER,
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL,
      baseUrl: process.env.AI_BASE_URL,
      persona: process.env.AI_PERSONA,
      maxContextMessages: process.env.AI_MAX_CONTEXT,
      maxTokens: process.env.AI_MAX_TOKENS,
      temperature: process.env.AI_TEMPERATURE,
      vision: process.env.AI_VISION,
      visionModel: process.env.AI_VISION_MODEL,
      autonomous: process.env.AI_AUTONOMOUS,
      autonomousIdleTimeout: process.env.AI_AUTONOMOUS_IDLE_TIMEOUT,
      autonomousInterval: process.env.AI_AUTONOMOUS_INTERVAL,
      autonomousAiDriven: process.env.AI_AUTONOMOUS_AI_DRIVEN,
      maxToolLoops: process.env.AI_MAX_TOOL_LOOPS,
      actionChain: process.env.AI_ACTION_CHAIN,
    },
    web: {
      port: process.env.WEB_PORT,
      host: process.env.WEB_HOST,
    },
    vpt: {
      enabled: process.env.VPT_ENABLED,
      bridgeUrl: process.env.VPT_BRIDGE_URL,
      modelPath: process.env.VPT_MODEL_PATH,
      weightsPath: process.env.VPT_WEIGHTS_PATH,
      visualAutonomous: process.env.VPT_VISUAL_AUTONOMOUS,
      autonomousInterval: process.env.VPT_AUTONOMOUS_INTERVAL,
      stochastic: process.env.VPT_STOCHASTIC,
    },
    logging: {
      level: process.env.LOG_LEVEL,
      file: process.env.LOG_FILE,
    },
  };

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    console.error('Config validation failed:', result.error.format());
    throw new Error('Invalid configuration. Check your .env file.');
  }

  _config = result.data;

  // 免费 API 自动调整：按请求次数限制，不限制 token
  if (_config.ai.provider === 'free') {
    applyFreeProviderDefaults(_config);
  }

  return _config;
}

/** 免费 API 模式自动调整：以节约请求次数为最高优先级 */
function applyFreeProviderDefaults(config: Config): void {
  // ChatAnywhere 免费 API 默认配置
  if (!process.env.AI_API_KEY) config.ai.apiKey = '';
  if (!process.env.AI_BASE_URL) config.ai.baseUrl = 'https://api.chatanywhere.tech/v1';
  if (!process.env.AI_MODEL) config.ai.model = 'gpt-4o-mini';

  // 不限制 token，保留更多上下文
  config.ai.maxTokens = 32000;
  config.ai.maxContextMessages = 40;

  // 强制关闭视觉（多一次请求）
  config.ai.vision = false;

  // 强制关闭自主模式（消耗请求过多）
  config.ai.autonomous = false;
  config.ai.autonomousAiDriven = false;

  // 工具调用最多 2 轮（节约请求）
  config.ai.maxToolLoops = 2;

  // 降低温度，减少随机性导致的不必要工具调用
  config.ai.temperature = 0.5;

  console.log('[Free API] Auto-adjusted settings for request-saving mode');
  console.log(`  baseUrl: ${config.ai.baseUrl}`);
  console.log(`  model: ${config.ai.model}`);
  console.log(`  maxTokens: ${config.ai.maxTokens}`);
  console.log(`  maxContextMessages: ${config.ai.maxContextMessages}`);
  console.log(`  maxToolLoops: ${config.ai.maxToolLoops}`);
  console.log(`  autonomous: off, vision: off`);
}

export function getConfig(): Config {
  if (!_config) return loadConfig();
  return _config;
}