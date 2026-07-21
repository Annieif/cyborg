import type { BotStatus } from '../App';

interface PlayerListProps {
  players: string[];
  status: BotStatus;
}

export function PlayerList({ players, status }: PlayerListProps) {
  return (
    <aside className="right-panel">
      <div className="panel-section">
        <h3>在线玩家 ({players.length})</h3>
        {status.username && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--accent)',
              marginBottom: 8,
              padding: '4px 0',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: '0 0 6px var(--accent-glow)',
              }}
            />
            {status.username} (Bot)
          </div>
        )}
        {players.length === 0 ? (
          <div className="no-data">暂无其他玩家</div>
        ) : (
          <ul className="player-list">
            {players.map((player) => (
              <li key={player} className="player-item">
                <div className="player-dot" />
                {player}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel-section">
        <h3>Bot 工具</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ToolItem icon="M12 2L2 7l10 5 10-5-10-5z" label="移动" desc="移动到指定坐标" />
          <ToolItem icon="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z" label="聊天" desc="在游戏内发送消息" />
          <ToolItem icon="M3 3h18v18H3z" label="挖掘" desc="挖掘指定方块" />
          <ToolItem icon="M12 2L2 22h20L12 2z" label="放置" desc="放置方块" />
          <ToolItem icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" label="背包" desc="查看和管理物品" />
          <ToolItem icon="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z" label="感知" desc="获取附近玩家/方块" />
          <ToolItem icon="M13 2L3 14h9l-1 8 10-12h-9l1-8z" label="战斗" desc="攻击敌对生物" />
        </div>
      </div>
    </aside>
  );
}

function ToolItem({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
        fontSize: 13,
        color: 'var(--text-secondary)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      <div>
        <div style={{ fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
      </div>
    </div>
  );
}