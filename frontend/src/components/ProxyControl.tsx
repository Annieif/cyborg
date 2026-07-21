import type { BotStatus } from '../App';

interface ProxyControlProps {
  proxyMode: boolean;
  onToggle: () => void;
  onCommand: (action: string, params: Record<string, unknown>) => void;
  result: string;
  status: BotStatus;
}

const DIRECTION_KEYS = [
  { key: 'forward', label: 'W', icon: '↑', desc: '前进' },
  { key: 'back', label: 'S', icon: '↓', desc: '后退' },
  { key: 'left', label: 'A', icon: '←', desc: '左移' },
  { key: 'right', label: 'D', icon: '→', desc: '右移' },
  { key: 'jump', label: '空格', icon: '⤊', desc: '跳跃' },
  { key: 'sprint', label: 'Ctrl', icon: '⟿', desc: '疾跑' },
  { key: 'sneak', label: 'Shift', icon: '⇣', desc: '潜行' },
];

const ACTIONS = [
  { action: 'dig', label: '挖掘', icon: '⛏' },
  { action: 'place', label: '放置', icon: '🧱' },
  { action: 'attack', label: '攻击', icon: '⚔' },
  { action: 'use', label: '使用', icon: '🖐' },
  { action: 'drop', label: '丢弃', icon: '🗑' },
  { action: 'collect', label: '收集', icon: '📦' },
];

export function ProxyControl({ proxyMode, onToggle, onCommand, result, status }: ProxyControlProps) {
  return (
    <div className="panel-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>真人代理模式</h3>
        <button
          onClick={onToggle}
          style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius)',
            border: 'none',
            background: proxyMode ? 'var(--accent)' : 'var(--bg-card-hover)',
            color: proxyMode ? '#000' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {proxyMode ? '已开启' : '已关闭'}
        </button>
      </div>

      {!proxyMode && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          开启后可通过网页操控 Bot 移动、挖掘、攻击等，无需 Minecraft 客户端即可玩服务器。
        </p>
      )}

      {proxyMode && (
        <>
          {/* WASD 移动 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>移动控制</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {DIRECTION_KEYS.map((d) => (
                <button
                  key={d.key}
                  onMouseDown={() => onCommand('move', { direction: d.key })}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    userSelect: 'none',
                  }}
                  title={d.desc}
                >
                  {d.icon} {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 交互按钮 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>交互</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {ACTIONS.map((a) => (
                <button
                  key={a.action}
                  onClick={() => onCommand(a.action, {})}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* 快捷操作 */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const player = prompt('跟随哪个玩家？');
                if (player) onCommand('follow', { player });
              }}
              style={quickBtnStyle}
            >
              👣 跟随
            </button>
            <button
              onClick={() => {
                const x = prompt('X坐标？', status.position?.x?.toFixed(0) || '0');
                const y = prompt('Y坐标？', status.position?.y?.toFixed(0) || '64');
                const z = prompt('Z坐标？', status.position?.z?.toFixed(0) || '0');
                if (x && y && z) onCommand('goto', { x: Number(x), y: Number(y), z: Number(z) });
              }}
              style={quickBtnStyle}
            >
              📍 前往
            </button>
          </div>

          {/* 操作结果 */}
          {result && (
            <div style={{
              marginTop: 8, padding: '6px 8px',
              background: 'var(--bg-card)', borderRadius: 'var(--radius)',
              fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
            }}>
              {result}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const quickBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 11,
};