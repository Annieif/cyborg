import { getLogger } from './logger';
import { getConfig } from '../config';

/**
 * 健康监控
 * 跟踪 Bot 运行状态指标
 */
export class HealthMonitor {
  private startTime: number;
  private chatCount = 0;
  private aiCallCount = 0;
  private errorCount = 0;
  private reconnectCount = 0;
  private lastActivity: number;
  private lastError: Error | null = null;

  constructor() {
    this.startTime = Date.now();
    this.lastActivity = Date.now();
  }

  recordChat(): void {
    this.chatCount++;
    this.lastActivity = Date.now();
  }

  recordAICall(): void {
    this.aiCallCount++;
    this.lastActivity = Date.now();
  }

  recordError(err: Error): void {
    this.errorCount++;
    this.lastError = err;
    getLogger().error('HealthMonitor error:', err);
  }

  recordReconnect(): void {
    this.reconnectCount++;
  }

  /** 获取健康报告 */
  getReport(): HealthReport {
    const config = getConfig();
    const uptime = Date.now() - this.startTime;
    const idleTime = Date.now() - this.lastActivity;

    return {
      status: this.errorCount > 10 ? 'degraded' : 'healthy',
      uptime: Math.floor(uptime / 1000),
      uptimeFormatted: this.formatDuration(uptime),
      idleTime: Math.floor(idleTime / 1000),
      stats: {
        chatCount: this.chatCount,
        aiCallCount: this.aiCallCount,
        errorCount: this.errorCount,
        reconnectCount: this.reconnectCount,
      },
      config: {
        provider: config.ai.provider,
        model: config.ai.model,
        mcHost: config.minecraft.host,
        mcPort: config.minecraft.port,
      },
      lastError: this.lastError?.message || null,
    };
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  }
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  uptimeFormatted: string;
  idleTime: number;
  stats: {
    chatCount: number;
    aiCallCount: number;
    errorCount: number;
    reconnectCount: number;
  };
  config: {
    provider: string;
    model: string;
    mcHost: string;
    mcPort: number;
  };
  lastError: string | null;
}