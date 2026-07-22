import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';
import { CyborgBot, ProxyCommand } from '../bot';
import { getFrontendAssets } from '../frontendAssets';

export class WebServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private bot: CyborgBot | null = null;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());

    // 检测是否为编译后的二进制（无 frontend/dist 目录）
    const hasFrontendDist = fs.existsSync('frontend/dist');

    if (hasFrontendDist) {
      // 开发/Docker 模式：从磁盘读取
      this.app.use(express.static('frontend/dist'));
    } else {
      // 二进制模式：从内存读取
      const assets = getFrontendAssets();
      this.app.use((req, res, next) => {
        // 只处理非 API 请求
        if (req.path.startsWith('/api/')) return next();

        let filePath = req.path === '/' ? '/index.html' : req.path;
        filePath = filePath.replace(/^\//, '');

        const asset = assets.get(filePath);
        if (asset) {
          res.setHeader('Content-Type', asset.contentType);
          res.send(asset.content);
        } else {
          // SPA fallback: 返回 index.html
          const indexAsset = assets.get('index.html');
          if (indexAsset) {
            res.setHeader('Content-Type', indexAsset.contentType);
            res.send(indexAsset.content);
          } else {
            next();
          }
        }
      });
    }
  }

  private setupRoutes(): void {
    this.app.get('/api/status', (_req, res) => {
      if (!this.bot) return res.json({ online: false });
      res.json(this.bot.getStatus());
    });

    this.app.post('/api/chat', (req, res) => {
      const { message } = req.body;
      if (!message || !this.bot) return res.status(400).json({ error: 'Invalid request' });
      this.bot.chat(message);
      res.json({ success: true });
    });

    this.app.get('/api/history', (_req, res) => {
      if (!this.bot?.getConversation()) return res.json({ messages: [] });
      const history = this.bot.getConversation()!.getHistory();
      res.json({ messages: history });
    });

    this.app.get('/api/health', (_req, res) => {
      const report = this.bot?.getHealth()?.getReport();
      res.json({
        status: report?.status ?? 'unknown',
        timestamp: new Date().toISOString(),
        ...report && report,
      });
    });

    // === 版本信息 ===
    this.app.get('/api/version', (_req, res) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pkg = require('../../package.json');
      res.json({
        version: pkg.version,
        name: pkg.name,
        node: process.version,
        uptime: process.uptime(),
      });
    });

    // === 真人代理 API ===
    this.app.post('/api/proxy/enable', (_req, res) => {
      if (!this.bot) return res.status(400).json({ error: 'Bot not running' });
      this.bot.enableProxyMode();
      res.json({ success: true, proxyMode: true });
    });

    this.app.post('/api/proxy/disable', (_req, res) => {
      if (!this.bot) return res.status(400).json({ error: 'Bot not running' });
      this.bot.disableProxyMode();
      res.json({ success: true, proxyMode: false });
    });

    this.app.post('/api/proxy/command', async (req, res) => {
      if (!this.bot) return res.status(400).json({ error: 'Bot not running' });
      const cmd = req.body as ProxyCommand;
      if (!cmd.action) return res.status(400).json({ error: 'Missing action' });
      const result = await this.bot.executeProxyCommand(cmd);
      res.json({ success: true, result });
    });

    // === 配置向导 API ===
    this.app.get('/api/config/check', (_req, res) => {
      const config = getConfig();
      const configured = config.ai.apiKey !== '' || config.ai.provider === 'free' || config.ai.provider === 'ollama';
      res.json({ configured });
    });

    this.app.post('/api/config/save', async (req, res) => {
      try {
        const { aiProvider, aiApiKey, aiModel, aiBaseUrl, mcHost, mcPort, mcUsername, mcVersion } = req.body;

        // 输入校验：防止 .env 注入
        const sanitize = (val: unknown, fallback: string): string => {
          if (typeof val !== 'string') return fallback;
          // 移除换行符和回车符，防止注入额外的配置行
          return val.replace(/[\r\n]/g, '').trim() || fallback;
        };
        const allowedProviders = ['openai', 'claude', 'custom', 'ollama', 'free'];
        const safeProvider = allowedProviders.includes(aiProvider) ? aiProvider : 'openai';
        const safeApiKey = sanitize(aiApiKey, '');
        const safeModel = sanitize(aiModel, 'gpt-4o-mini');
        const safeBaseUrl = sanitize(aiBaseUrl, 'https://api.openai.com/v1');
        const safeHost = sanitize(mcHost, 'localhost');
        const safePort = (typeof mcPort === 'number' && mcPort > 0 && mcPort < 65536) ? mcPort : 25565;
        const safeUsername = sanitize(mcUsername, 'AI_Cyborg').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 16);
        const safeVersion = sanitize(mcVersion, '1.20.1');

        const envContent = [
          `# AI Cyborg v1.2.1 配置`,
          `# 由 Web 配置向导自动生成`,
          ``,
          `# AI 后端`,
          `AI_PROVIDER=${safeProvider}`,
          `AI_API_KEY=${safeApiKey}`,
          `AI_MODEL=${safeModel}`,
          `AI_BASE_URL=${safeBaseUrl}`,
          ``,
          `# Minecraft 服务器`,
          `MC_HOST=${safeHost}`,
          `MC_PORT=${safePort}`,
          `MC_USERNAME=${safeUsername}`,
          `MC_VERSION=${safeVersion}`,
          `MC_AUTH=offline`,
          ``,
          `# 其他设置（使用默认值）`,
          `AI_MAX_CONTEXT=20`,
          `AI_MAX_TOKENS=8000`,
          `AI_TEMPERATURE=0.7`,
          `AI_ACTION_CHAIN=true`,
          `AI_VISION=false`,
          `AI_AUTONOMOUS=false`,
          `AI_MAX_TOOL_LOOPS=5`,
          `AI_PERSONA=你是一个友善的Minecraft AI赛博人。`,
          ``,
          `# Web 服务`,
          `WEB_PORT=3000`,
          `WEB_HOST=0.0.0.0`,
          `LOG_LEVEL=info`,
        ].join('\n');

        const envPath = path.join(process.cwd(), '.env');
        fs.writeFileSync(envPath, envContent, 'utf-8');

        getLogger().info('Config saved via web wizard');
        res.json({ success: true, message: '配置已保存，请重启服务生效' });
      } catch (e: any) {
        getLogger().error('Failed to save config:', e);
        res.status(500).json({ success: false, error: e.message });
      }
    });

    // === 经验记忆 API ===
    this.app.get('/api/exp', (_req, res) => {
      if (!this.bot) return res.status(400).json({ error: 'Bot not running' });
      res.json({ content: this.bot.getExpMemory().getContent() });
    });

    this.app.post('/api/exp/record', (req, res) => {
      if (!this.bot) return res.status(400).json({ error: 'Bot not running' });
      const { type, key, value } = req.body;
      const exp = this.bot.getExpMemory();
      switch (type) {
        case 'player': exp.recordPlayer(key, value); break;
        case 'landmark': exp.recordLandmark(key, value); break;
        case 'rule': exp.addRule(value); break;
        case 'event': exp.recordEvent(value); break;
        case 'notes': exp.appendNotes(value); break;
        default: return res.status(400).json({ error: 'Unknown type' });
      }
      res.json({ success: true });
    });
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      getLogger().info(`Web client connected: ${socket.id}`);

      if (this.bot) {
        socket.emit('status', this.bot.getStatus());
      }

      socket.on('chat', (message: string) => {
        if (this.bot) this.bot.chat(message);
      });

      // 真人代理 WebSocket 指令
      socket.on('proxy:enable', () => {
        if (this.bot) { this.bot.enableProxyMode(); socket.emit('status', this.bot.getStatus()); }
      });

      socket.on('proxy:disable', () => {
        if (this.bot) { this.bot.disableProxyMode(); socket.emit('status', this.bot.getStatus()); }
      });

      socket.on('proxy:command', async (cmd: ProxyCommand) => {
        if (this.bot) {
          const result = await this.bot.executeProxyCommand(cmd);
          socket.emit('proxy:result', { action: cmd.action, result });
        }
      });

      socket.on('disconnect', () => {
        getLogger().info(`Web client disconnected: ${socket.id}`);
      });
    });
  }

  bindBot(bot: CyborgBot): void {
    this.bot = bot;

    bot.on('chat', (username, message) => {
      this.io.emit('chat', { username, message, timestamp: Date.now() });
    });

    bot.on('playerJoined', (username) => {
      this.io.emit('playerJoin', { username, timestamp: Date.now() });
    });

    bot.on('playerLeft', (username) => {
      this.io.emit('playerLeave', { username, timestamp: Date.now() });
    });

    bot.on('death', () => {
      this.io.emit('death', { timestamp: Date.now() });
    });

    bot.on('reconnecting', (attempt, max) => {
      this.io.emit('reconnecting', { attempt, maxAttempts: max });
    });

    setInterval(() => {
      if (this.bot) {
        this.io.emit('status', this.bot.getStatus());
      }
    }, 500); // 500ms 刷新率，方便代理模式实时操控
  }

  start(): void {
    const config = getConfig();
    const logger = getLogger();
    this.server.listen(config.web.port, config.web.host, () => {
      logger.info(`Web server running at http://${config.web.host}:${config.web.port}`);
    });
  }

  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close();
      this.server.close(() => resolve());
    });
  }
}