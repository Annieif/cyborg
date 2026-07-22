import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { StatusPanel } from './components/StatusPanel';
import { ChatArea } from './components/ChatArea';
import { PlayerList } from './components/PlayerList';
import { ProxyControl } from './components/ProxyControl';
import { SetupWizard } from './components/SetupWizard';

export interface BotStatus {
  online: boolean;
  username?: string;
  health?: number;
  food?: number;
  position?: { x: number; y: number; z: number };
  yaw?: number;
  pitch?: number;
  dimension?: string;
  time?: number;
  isRaining?: boolean;
  players?: number;
  entities?: number;
  messageCount?: number;
  chatCount?: number;
  proxyMode?: boolean;
  reconnecting?: boolean;
}

export interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'bot';
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<BotStatus>({ online: false });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [proxyMode, setProxyMode] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [proxyResult, setProxyResult] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 检测是否首次运行（未配置）
  useEffect(() => {
    fetch('/api/config/check')
      .then(r => r.json())
      .then(data => {
        if (!data.configured) setShowWizard(true);
      })
      .catch(() => {}); // 后端未启动时忽略
  }, []);

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('status', (data: BotStatus) => {
      setStatus(data);
      if (data.proxyMode !== undefined) setProxyMode(data.proxyMode);
      if (data.reconnecting !== undefined) setReconnecting(data.reconnecting);
    });

    s.on('chat', (data: { username: string; message: string; timestamp: number }) => {
      setMessages((prev) => [
        ...prev,
        { ...data, type: data.username === status.username ? 'bot' : 'chat' },
      ]);
    });

    s.on('playerJoin', (data: { username: string }) => {
      setPlayers((prev) => [...prev, data.username]);
      setMessages((prev) => [...prev, {
        username: '系统', message: `${data.username} 加入了游戏`,
        timestamp: Date.now(), type: 'system',
      }]);
    });

    s.on('playerLeave', (data: { username: string }) => {
      setPlayers((prev) => prev.filter((p) => p !== data.username));
      setMessages((prev) => [...prev, {
        username: '系统', message: `${data.username} 离开了游戏`,
        timestamp: Date.now(), type: 'system',
      }]);
    });

    s.on('death', () => {
      setMessages((prev) => [...prev, {
        username: '系统', message: 'Bot 已死亡！',
        timestamp: Date.now(), type: 'system',
      }]);
    });

    s.on('reconnecting', (data: { attempt: number; maxAttempts: number }) => {
      setReconnecting(true);
      setMessages((prev) => [...prev, {
        username: '系统',
        message: `正在重连... (${data.attempt}/${data.maxAttempts})`,
        timestamp: Date.now(), type: 'system',
      }]);
    });

    s.on('proxy:result', (data: { action: string; result: string }) => {
      setProxyResult(data.result);
      setMessages((prev) => [...prev, {
        username: '代理', message: `[${data.action}] ${data.result}`,
        timestamp: Date.now(), type: 'system',
      }]);
    });

    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback((message: string) => {
    if (socket && message.trim()) {
      socket.emit('chat', message);
      setMessages((prev) => [...prev,
        { username: '你', message, timestamp: Date.now(), type: 'chat' },
      ]);
    }
  }, [socket]);

  const handleProxyCommand = useCallback((action: string, params: Record<string, unknown>) => {
    if (socket) {
      socket.emit('proxy:command', { action, params });
    }
  }, [socket]);

  const toggleProxyMode = useCallback(() => {
    if (socket) {
      if (proxyMode) {
        socket.emit('proxy:disable');
      } else {
        socket.emit('proxy:enable');
      }
      setProxyMode(!proxyMode);
    }
  }, [socket, proxyMode]);

  return (
    <>
      {showWizard && (
        <SetupWizard onComplete={() => setShowWizard(false)} />
      )}
      <div className="app">
      <StatusPanel status={status} connected={connected} reconnecting={reconnecting} />
      <ChatArea
        messages={messages}
        onSend={handleSend}
        messagesEndRef={messagesEndRef}
      />
      <div className="right-panel">
        <PlayerList players={players} status={status} />
        <ProxyControl
          proxyMode={proxyMode}
          onToggle={toggleProxyMode}
          onCommand={handleProxyCommand}
          result={proxyResult}
          status={status}
        />
      </div>
    </div>
    </>
  );
}

export default App;