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

  // 全局错误捕获：防止未处理错误导致进程崩溃
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err.message);
    // 不退出，保持 Web 服务器运行
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
  });

  // 创建 Bot
  const bot = new CyborgBot();

  // 创建 Web 服务器
  const server = new WebServer();

  // 绑定 Bot 到服务器
  server.bindBot(bot);

  // 启动 Web 服务器
  server.start();

  // 启动 Bot（不阻塞，连接失败时自动重试）
  bot.start().then(() => {
    logger.info('Bot connected successfully!');
  }).catch((err) => {
    logger.error('Failed to start bot:', err.message);
    logger.info('Bot will retry automatically. Web dashboard is available for configuration.');
  });

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

main();