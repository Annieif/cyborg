import { useState } from 'react';
import './SetupWizard.css';

interface SetupConfig {
  aiProvider: 'openai' | 'claude' | 'custom' | 'ollama' | 'free';
  aiApiKey: string;
  aiModel: string;
  aiBaseUrl: string;
  mcHost: string;
  mcPort: number;
  mcUsername: string;
  mcVersion: string;
}

const STEPS = [
  { key: 'welcome', title: '欢迎', desc: '开始配置你的 Minecraft AI 赛博人' },
  { key: 'ai', title: 'AI 设置', desc: '选择 AI 后端' },
  { key: 'server', title: '服务器', desc: '连接 Minecraft 服务器' },
  { key: 'bot', title: '角色', desc: '设置赛博人身份' },
  { key: 'done', title: '完成', desc: '启动赛博人' },
];

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (推荐)', desc: '需要 API Key，最稳定' },
  { value: 'free', label: 'ChatAnywhere 免费 API', desc: '无需付费，按请求次数限制' },
  { value: 'ollama', label: 'Ollama 本地模型', desc: '完全免费，需要本地部署' },
  { value: 'custom', label: '自定义 API', desc: '兼容 OpenAI 格式的 API' },
  { value: 'claude', label: 'Claude (Anthropic)', desc: '需要 API Key' },
];

const PRESET_SERVERS = [
  { value: 'hypixel', label: 'Hypixel (mc.hypixel.net)', host: 'mc.hypixel.net', port: 25565, version: '1.8.9' },
  { value: '2b2t', label: '2b2t (2b2t.org)', host: '2b2t.org', port: 25565, version: '1.12.2' },
];

export function SetupWizard({ onComplete }: { onComplete: (config: SetupConfig) => void }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<SetupConfig>({
    aiProvider: 'free',
    aiApiKey: '',
    aiModel: 'gpt-4o-mini',
    aiBaseUrl: '',
    mcHost: 'localhost',
    mcPort: 25565,
    mcUsername: 'AI_Cyborg',
    mcVersion: '1.20.1',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const updateConfig = (partial: Partial<SetupConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
    setError('');
  };

  const handleProviderChange = (provider: 'openai' | 'claude' | 'custom' | 'ollama' | 'free') => {
    const defaults: Record<string, Partial<SetupConfig>> = {
      openai: { aiBaseUrl: 'https://api.openai.com/v1', aiModel: 'gpt-4o-mini' },
      free: { aiBaseUrl: 'https://api.chatanywhere.tech/v1', aiModel: 'gpt-4o-mini', aiApiKey: '' },
      ollama: { aiBaseUrl: 'http://localhost:11434/v1', aiModel: 'llama3.2', aiApiKey: '' },
      custom: { aiBaseUrl: '', aiModel: 'gpt-4o-mini' },
      claude: { aiBaseUrl: 'https://api.anthropic.com/v1', aiModel: 'claude-sonnet-4-20250514' },
    };
    updateConfig({ aiProvider: provider, ...defaults[provider] });
  };

  const handleSave = async () => {
    // 校验用户名
    const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
    if (!usernameRegex.test(config.mcUsername)) {
      setUsernameError('用户名需 3-16 位，仅支持英文、数字、下划线');
      setStep(3); // 跳回角色设置步骤
      return;
    }
    setUsernameError('');
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '保存失败');
      onComplete(config);
    } catch (e: any) {
      setError(e.message || '保存配置失败，请检查网络连接');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="wizard-step">
            <h2>欢迎使用 Minecraft AI 赛博人</h2>
            <p className="wizard-desc">只需 3 步，你的 AI 机器人就能在 Minecraft 中自由活动。</p>
            <div className="wizard-features">
              <div className="feature-card">
                <span className="feature-icon">🤖</span>
                <strong>AI 智能对话</strong>
                <p>接入 OpenAI/Claude/本地模型，自然语言交流</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">🌍</span>
                <strong>世界交互</strong>
                <p>挖掘、建造、合成、战斗，20+ 种操作</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">🎮</span>
                <strong>真人代理</strong>
                <p>通过 Web 面板直接操控赛博人</p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="wizard-step">
            <h2>选择 AI 后端</h2>
            <p className="wizard-desc">赛博人需要一个 AI 大脑来思考和对话</p>

            <div className="provider-list">
              {AI_PROVIDERS.map(p => (
                <label key={p.value} className={`provider-card ${config.aiProvider === p.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="aiProvider"
                    value={p.value}
                    checked={config.aiProvider === p.value}
                    onChange={() => handleProviderChange(p.value as any)}
                  />
                  <div className="provider-info">
                    <strong>{p.label}</strong>
                    <span>{p.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {config.aiProvider !== 'free' && config.aiProvider !== 'ollama' && (
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={config.aiApiKey}
                  onChange={e => updateConfig({ aiApiKey: e.target.value })}
                  placeholder={config.aiProvider === 'openai' ? 'sk-...' : '输入你的 API Key'}
                />
              </div>
            )}

            <div className="form-group">
              <label>模型</label>
              <input
                type="text"
                value={config.aiModel}
                onChange={e => updateConfig({ aiModel: e.target.value })}
                placeholder="gpt-4o-mini"
              />
            </div>

            {config.aiProvider === 'custom' && (
              <div className="form-group">
                <label>API 地址</label>
                <input
                  type="text"
                  value={config.aiBaseUrl}
                  onChange={e => updateConfig({ aiBaseUrl: e.target.value })}
                  placeholder="https://your-api.com/v1"
                />
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="wizard-step">
            <h2>连接 Minecraft 服务器</h2>
            <p className="wizard-desc">赛博人需要加入一个 Minecraft 服务器</p>

            <div className="form-group">
              <label>服务器地址</label>
              <select
                value={config.mcHost}
                onChange={e => {
                  const preset = PRESET_SERVERS.find(p => p.host === e.target.value);
                  if (preset) {
                    updateConfig({ mcHost: preset.host, mcPort: preset.port, mcVersion: preset.version });
                  } else {
                    updateConfig({ mcHost: e.target.value });
                  }
                }}
              >
                <option value="localhost">本地服务器 (localhost)</option>
                {PRESET_SERVERS.map(p => (
                  <option key={p.value} value={p.host}>{p.label}</option>
                ))}
                <option value="">自定义...</option>
              </select>
            </div>

            {!PRESET_SERVERS.find(p => p.host === config.mcHost) && config.mcHost !== 'localhost' && (
              <div className="form-group">
                <label>服务器地址</label>
                <input
                  type="text"
                  value={config.mcHost}
                  onChange={e => updateConfig({ mcHost: e.target.value })}
                  placeholder="例如: mc.example.com"
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>端口</label>
                <input
                  type="number"
                  value={config.mcPort}
                  onChange={e => updateConfig({ mcPort: parseInt(e.target.value) || 25565 })}
                />
              </div>
              <div className="form-group">
                <label>版本</label>
                <input
                  type="text"
                  value={config.mcVersion}
                  onChange={e => updateConfig({ mcVersion: e.target.value })}
                  placeholder="1.20.1"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="wizard-step">
            <h2>设置赛博人身份</h2>
            <p className="wizard-desc">给你的 AI 赛博人起个名字</p>

            <div className="form-group">
              <label>游戏内名称</label>
              <input
                type="text"
                value={config.mcUsername}
                onChange={e => { updateConfig({ mcUsername: e.target.value }); setUsernameError(''); }}
                placeholder="AI_Cyborg"
                maxLength={16}
              />
              {usernameError && <span className="wizard-error">{usernameError}</span>}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                3-16 位，仅支持英文、数字、下划线
              </span>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="wizard-step">
            <h2>准备就绪</h2>
            <p className="wizard-desc">检查以下配置，确认无误后启动</p>

            <div className="config-summary">
              <div className="summary-item">
                <span className="summary-label">AI 后端</span>
                <span className="summary-value">{AI_PROVIDERS.find(p => p.value === config.aiProvider)?.label}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">模型</span>
                <span className="summary-value">{config.aiModel}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">服务器</span>
                <span className="summary-value">{config.mcHost}:{config.mcPort}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">名称</span>
                <span className="summary-value">{config.mcUsername}</span>
              </div>
            </div>

            {error && <div className="wizard-error">{error}</div>}
          </div>
        );
    }
  };

  return (
    <div className="setup-wizard-overlay">
      <div className="setup-wizard">
        <div className="wizard-progress">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`progress-step ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
              <div className="step-dot">{i < step ? '✓' : i + 1}</div>
              <span className="step-title">{s.title}</span>
            </div>
          ))}
        </div>

        <div className="wizard-content">
          {renderStep()}
        </div>

        <div className="wizard-actions">
          {step > 0 && (
            <button className="btn-secondary" onClick={() => setStep(step - 1)}>上一步</button>
          )}
          <div className="wizard-actions-right">
            {step < 4 ? (
              <button className="btn-primary" onClick={() => setStep(step + 1)}>
                {step === 0 ? '开始配置' : '下一步'}
              </button>
            ) : (
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '启动赛博人'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}