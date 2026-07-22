import type { BotStatus } from '../App';

interface StatusPanelProps {
  status: BotStatus;
  connected: boolean;
  reconnecting?: boolean;
  wsError?: boolean;
}

export function StatusPanel({ status, connected, reconnecting, wsError }: StatusPanelProps) {
  const healthPercent = status.health
    ? Math.round((status.health / 20) * 100)
    : 0;

  const gameTime = status.time
    ? `${Math.floor(((status.time / 1000 + 6) % 24))}:${String(Math.floor((status.time % 1000) / 1000 * 60)).padStart(2, '0')}`
    : '--:--';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <svg className="sidebar-logo" viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="8" fill="var(--accent)" opacity="0.15" />
          <circle cx="18" cy="14" r="6" stroke="var(--accent)" strokeWidth="2" fill="none" />
          <path
            d="M8 30c0-5.5 4.5-10 10-10s10 4.5 10 10"
            stroke="var(--accent)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="24" cy="26" r="2" fill="var(--accent)" />
          <circle cx="12" cy="26" r="2" fill="var(--accent)" />
        </svg>
        <div>
          <div className="sidebar-title">AI赛博人</div>
          <div className="sidebar-subtitle">控制面板</div>
        </div>
      </div>

      <div className="stat-card">
        <h3>连接状态</h3>
        <div className={`stat-value ${status.online ? 'online' : 'offline'}`}>
          {reconnecting ? '重连中...' : status.online ? '在线' : '离线'}
        </div>
        {status.online && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {status.username} | {status.dimension || 'overworld'}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          仪表盘: {wsError ? '连接失败' : connected ? '已连接' : '未连接'}
        </div>
        {reconnecting && (
          <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 2 }}>
            正在重连...
          </div>
        )}
        {status.proxyMode && (
          <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 2 }}>
            代理模式开启
          </div>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <h3>生命值</h3>
          <div className="stat-value" style={{ color: healthPercent > 50 ? 'var(--accent)' : 'var(--danger)' }}>
            {healthPercent}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {status.health?.toFixed(0) ?? '--'} / 20
          </div>
        </div>
        <div className="stat-card">
          <h3>饥饿值</h3>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {status.food?.toFixed(0) ?? '--'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>/ 20</div>
        </div>
        <div className="stat-card">
          <h3>玩家</h3>
          <div className="stat-value">{status.players ?? '--'}</div>
        </div>
        <div className="stat-card">
          <h3>实体</h3>
          <div className="stat-value">{status.entities ?? '--'}</div>
        </div>
      </div>

      <div className="stat-card">
        <h3>游戏时间</h3>
        <div className="stat-value" style={{ fontSize: 20 }}>{gameTime}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {status.isRaining ? '下雨中' : '晴天'}
        </div>
      </div>

      {status.position && (
        <div className="stat-card">
          <h3>坐标</h3>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div>X: {status.position.x.toFixed(1)}</div>
            <div>Y: {status.position.y.toFixed(1)}</div>
            <div>Z: {status.position.z.toFixed(1)}</div>
          </div>
        </div>
      )}

      <div className="stat-card">
        <h3>对话轮数</h3>
        <div className="stat-value" style={{ fontSize: 20 }}>{status.messageCount ?? 0}</div>
      </div>
    </aside>
  );
}