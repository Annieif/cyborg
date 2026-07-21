import { useState, useRef } from 'react';
import type { ChatMessage } from '../App';

interface ChatAreaProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatArea({ messages, onSend, messagesEndRef }: ChatAreaProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="main-panel">
      <div className="main-header">
        <h2>实时聊天</h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {messages.length} 条消息
        </span>
      </div>

      <div className="chat-area">
        {messages.length === 0 && (
          <div className="chat-msg system">
            <div className="chat-bubble">
              等待 Bot 连接... 连接后这里将显示游戏聊天消息。
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-msg ${
              msg.type === 'bot' ? 'bot' : msg.type === 'system' ? 'system' : 'player'
            }`}
          >
            <span className="chat-sender">
              {msg.username}
              <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10 }}>
                {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
            <div className="chat-bubble">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          ref={inputRef}
          className="chat-input"
          placeholder="输入消息发送到游戏聊天..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="chat-send" onClick={handleSend}>
          发送
        </button>
      </div>
    </div>
  );
}