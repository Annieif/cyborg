import fs from 'fs';
import path from 'path';
import { getLogger } from './logger';

const EXP_DIR = path.resolve(process.cwd(), 'experience');

/**
 * AI 经验记忆管理器
 * 为每个服务器维护独立的 exp.md 文件，存储 AI 对服务器的认知
 */
export class ExperienceMemory {
  private filePath: string;
  private memory: ServerMemory;
  private logger = getLogger();

  constructor(host: string, port: number) {
    if (!fs.existsSync(EXP_DIR)) {
      fs.mkdirSync(EXP_DIR, { recursive: true });
    }

    const safeName = `${host}_${port}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    this.filePath = path.join(EXP_DIR, `${safeName}.md`);
    this.memory = this.load();
  }

  /** 加载经验文件 */
  private load(): ServerMemory {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return this.parse(content);
      }
    } catch (err) {
      this.logger.warn(`Failed to load exp: ${this.filePath}`);
    }
    return this.createDefault();
  }

  /** 解析经验文件 */
  private parse(content: string): ServerMemory {
    const memory: ServerMemory = this.createDefault();

    // 提取服务器基本信息
    const nameMatch = content.match(/## 服务器信息\n\n- \*\*名称\*\*: (.+)/);
    if (nameMatch) memory.name = nameMatch[1];

    const versionMatch = content.match(/\*\*版本\*\*: (.+)/);
    if (versionMatch) memory.version = versionMatch[1];

    const modeMatch = content.match(/\*\*模式\*\*: (.+)/);
    if (modeMatch) memory.mode = modeMatch[1];

    // 提取玩家列表
    const playersSection = content.match(/## 已知玩家\n([\s\S]*?)(?=\n## |$)/);
    if (playersSection) {
      const playerLines = playersSection[1].match(/- \*\*(.+?)\*\*: (.+)/g);
      if (playerLines) {
        for (const line of playerLines) {
          const m = line.match(/- \*\*(.+?)\*\*: (.+)/);
          if (m) {
            memory.players.set(m[1], m[2]);
          }
        }
      }
    }

    // 提取地标
    const landmarksSection = content.match(/## 重要地标\n([\s\S]*?)(?=\n## |$)/);
    if (landmarksSection) {
      const lines = landmarksSection[1].match(/- \*\*(.+?)\*\*: (.+)/g);
      if (lines) {
        for (const line of lines) {
          const m = line.match(/- \*\*(.+?)\*\*: (.+)/);
          if (m) memory.landmarks[m[1]] = m[2];
        }
      }
    }

    // 提取规则
    const rulesSection = content.match(/## 服务器规则\n([\s\S]*?)(?=\n## |$)/);
    if (rulesSection) {
      const rules = rulesSection[1].match(/- (.+)/g);
      if (rules) memory.rules = rules.map((r) => r.replace('- ', ''));
    }

    // 提取事件
    const eventsSection = content.match(/## 重要事件\n([\s\S]*?)(?=\n## |$)/);
    if (eventsSection) {
      const events = eventsSection[1].match(/- \*\*(.+?)\*\*: (.+)/g);
      if (events) {
        for (const line of events) {
          const m = line.match(/- \*\*(.+?)\*\*: (.+)/);
          if (m) memory.events.push({ time: m[1], description: m[2] });
        }
      }
    }

    // 提取备注
    const notesSection = content.match(/## 备注\n([\s\S]*?)$/);
    if (notesSection) {
      memory.notes = notesSection[1].trim();
    }

    return memory;
  }

  private createDefault(): ServerMemory {
    return {
      name: '未知服务器',
      version: '未知',
      mode: '未知',
      players: new Map(),
      landmarks: {},
      rules: [],
      events: [],
      notes: '',
    };
  }

  /** 记录服务器基本信息 */
  recordServerInfo(info: { name?: string; version?: string; mode?: string }): void {
    if (info.name) this.memory.name = info.name;
    if (info.version) this.memory.version = info.version;
    if (info.mode) this.memory.mode = info.mode;
    this.save();
  }

  /** 记录玩家 */
  recordPlayer(name: string, description: string): void {
    this.memory.players.set(name, description);
    this.save();
  }

  /** 移除玩家 */
  removePlayer(name: string): void {
    this.memory.players.delete(name);
    this.save();
  }

  /** 记录地标 */
  recordLandmark(name: string, description: string): void {
    this.memory.landmarks[name] = description;
    this.save();
  }

  /** 记录规则 */
  addRule(rule: string): void {
    if (!this.memory.rules.includes(rule)) {
      this.memory.rules.push(rule);
      this.save();
    }
  }

  /** 记录事件 */
  recordEvent(description: string): void {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    this.memory.events.push({ time: now, description });
    // 只保留最近 100 条事件
    if (this.memory.events.length > 100) {
      this.memory.events = this.memory.events.slice(-100);
    }
    this.save();
  }

  /** 记录聊天消息 */
  recordChatMessage(username: string, message: string): void {
    this.recordEvent(`${username}: ${message}`);
  }

  /** 更新备注 */
  setNotes(notes: string): void {
    this.memory.notes = notes;
    this.save();
  }

  /** 追加备注 */
  appendNotes(notes: string): void {
    this.memory.notes += (this.memory.notes ? '\n' : '') + notes;
    this.save();
  }

  /** 获取 AI 可用的系统提示 */
  getSystemPrompt(): string {
    const m = this.memory;
    let prompt = `## 服务器经验记忆\n`;
    prompt += `- 服务器: ${m.name} (${m.version}, ${m.mode})\n`;

    if (m.players.size > 0) {
      prompt += `- 已知玩家:\n`;
      for (const [name, desc] of m.players) {
        prompt += `  - ${name}: ${desc}\n`;
      }
    }

    if (Object.keys(m.landmarks).length > 0) {
      prompt += `- 重要地标:\n`;
      for (const [name, desc] of Object.entries(m.landmarks)) {
        prompt += `  - ${name}: ${desc}\n`;
      }
    }

    if (m.rules.length > 0) {
      prompt += `- 服务器规则:\n`;
      for (const rule of m.rules) {
        prompt += `  - ${rule}\n`;
      }
    }

    if (m.events.length > 0) {
      const recent = m.events.slice(-5);
      prompt += `- 最近事件:\n`;
      for (const e of recent) {
        prompt += `  - ${e.time}: ${e.description}\n`;
      }
    }

    return prompt;
  }

  /** 获取完整经验内容 */
  getContent(): string {
    return this.generate();
  }

  /** 保存经验文件 */
  private save(): void {
    try {
      fs.writeFileSync(this.filePath, this.generate(), 'utf-8');
      this.logger.debug(`Exp saved: ${this.filePath}`);
    } catch (err) {
      this.logger.error(`Failed to save exp: ${this.filePath}`, err);
    }
  }

  /** 生成 Markdown 内容 */
  private generate(): string {
    const m = this.memory;
    let content = `# 服务器经验记忆\n\n`;
    content += `> 自动生成于 ${new Date().toISOString().replace('T', ' ').slice(0, 19)}\n\n`;
    content += `## 服务器信息\n\n`;
    content += `- **名称**: ${m.name}\n`;
    content += `- **版本**: ${m.version}\n`;
    content += `- **模式**: ${m.mode}\n\n`;

    content += `## 已知玩家\n\n`;
    if (m.players.size === 0) {
      content += `（暂无记录）\n\n`;
    } else {
      for (const [name, desc] of m.players) {
        content += `- **${name}**: ${desc}\n`;
      }
      content += '\n';
    }

    content += `## 重要地标\n\n`;
    if (Object.keys(m.landmarks).length === 0) {
      content += `（暂无记录）\n\n`;
    } else {
      for (const [name, desc] of Object.entries(m.landmarks)) {
        content += `- **${name}**: ${desc}\n`;
      }
      content += '\n';
    }

    content += `## 服务器规则\n\n`;
    if (m.rules.length === 0) {
      content += `（暂无记录）\n\n`;
    } else {
      for (const rule of m.rules) {
        content += `- ${rule}\n`;
      }
      content += '\n';
    }

    content += `## 重要事件\n\n`;
    if (m.events.length === 0) {
      content += `（暂无记录）\n\n`;
    } else {
      for (const e of m.events) {
        content += `- **${e.time}**: ${e.description}\n`;
      }
      content += '\n';
    }

    content += `## 备注\n\n${m.notes || '（暂无）'}\n`;
    return content;
  }
}

interface ServerMemory {
  name: string;
  version: string;
  mode: string;
  players: Map<string, string>;
  landmarks: Record<string, string>;
  rules: string[];
  events: Array<{ time: string; description: string }>;
  notes: string;
}