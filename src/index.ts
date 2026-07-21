import { loadConfig } from './config';
import { createLogger } from './utils/logger';
import { CyborgBot } from './bot';
import { WebServer } from './server';

async function main(): Promise<void> {
  // 加载配置
  const config = loadConfig();
  const logger = createLogger();

  logger.info('=== 我的世界AI赛博人 启动中 ===');
  logger.info(`Minecraft: ${config.minecraft.host}:${config.minecraft.port}`);
  logger.info(`AI: ${config.ai.provider} / ${config.ai.model}`);
  logger.info(`Web: http://${config.web.host}:${config.web.port}`);

  // 创建 Bot
  const bot = new CyborgBot();

  // 创建 Web 服务器
  const server = new WebServer();

  // 绑定 Bot 到服务器
  server.bindBot(bot);

  // 启动 Web 服务器
  server.start();

  // 启动 Bot
  try {
    await bot.start();
    logger.info('Bot connected successfully!');
  } catch (err) {
    logger.error('Failed to start bot:', err);
    logger.info('Web dashboard still available for configuration.');
  }

  // 优雅关闭
  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await bot.shutdown();
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await bot.shutdown();
    await server.shutdown();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});