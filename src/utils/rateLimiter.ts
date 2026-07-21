/**
 * 速率限制器
 * 防止 Bot 在短时间内发送过多消息
 */
export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 5, windowMs: number = 10000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /** 检查是否允许操作 */
  allow(key: string): boolean {
    const now = Date.now();
    let timestamps = this.timestamps.get(key);

    if (!timestamps) {
      timestamps = [];
      this.timestamps.set(key, timestamps);
    }

    // 清理过期记录
    const windowStart = now - this.windowMs;
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    timestamps.push(now);
    this.timestamps.set(key, timestamps);
    return true;
  }

  /** 获取剩余可请求次数 */
  remaining(key: string): number {
    const now = Date.now();
    const timestamps = this.timestamps.get(key) || [];
    const windowStart = now - this.windowMs;
    const active = timestamps.filter((t) => t > windowStart);
    return Math.max(0, this.maxRequests - active.length);
  }

  /** 重置指定 key */
  reset(key: string): void {
    this.timestamps.delete(key);
  }
}