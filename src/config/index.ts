import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

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
    provider: z.enum(['openai', 'claude', 'custom']).default('openai'),
    apiKey: z.string().min(1, 'AI API Key is required'),
    model: z.string().default('gpt-4o'),
    baseUrl: z.string().url().default('https://api.openai.com/v1'),
    persona: z.string().default('你是一个友善的Minecraft AI赛博人。'),
    maxContextMessages: z.coerce.number().int().positive().default(20),
    maxTokens: z.coerce.number().int().positive().default(8000),
    temperature: z.coerce.number().min(0).max(2).default(0.7),
    vision: z.coerce.boolean().default(false),
    visionModel: z.string().default('gpt-4o'),
    autonomous: z.coerce.boolean().default(false),
    autonomousIdleTimeout: z.coerce.number().int().positive().default(60),
    autonomousInterval: z.coerce.number().int().positive().default(30),
    autonomousAiDriven: z.coerce.boolean().default(false),
  }),
  web: z.object({
    port: z.coerce.number().int().positive().default(3000),
    host: z.string().default('localhost'),
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
    },
    web: {
      port: process.env.WEB_PORT,
      host: process.env.WEB_HOST,
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
  return _config;
}

export function getConfig(): Config {
  if (!_config) return loadConfig();
  return _config;
}