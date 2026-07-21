import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';
import { CyborgBot, ProxyCommand } from '../bot';

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
    this.app.use(express.static('frontend/dist'));
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