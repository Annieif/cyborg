# 快速开始（零基础，3 分钟上手）

> 选一种最适合你的方式即可。推荐方式 A（下载双击运行）。

---

## 方式 A：下载可执行文件（推荐，零基础首选）

**不需要安装任何编程环境！** 就像下载一个游戏一样简单。

### 第 1 步：下载

从 [Releases 页面](https://github.com/Annieif/cyborg/releases) 下载最新版本：

| 你的系统 | 下载这个文件 |
|---------|------------|
| Windows | `cyborg-bot.exe` + `cyborg-bot.bat` |
| macOS | `cyborg-bot-mac` |
| Linux | `cyborg-bot-linux` |

### 第 2 步：获取 AI API Key（免费）

赛博人需要 AI 才能思考和对话。推荐使用免费的 ChatAnywhere：

1. 访问 https://github.com/chatanywhere/GPT_API_free 获取免费 API Key
2. 复制你的 Key（格式类似 `sk-xxxxxxxx`）

> 也可以用 OpenAI、DeepSeek、通义千问等付费 API，效果更好。

### 第 3 步：双击运行

**Windows 用户：**
1. 把 `cyborg-bot.exe` 和 `cyborg-bot.bat` 放在同一个文件夹
2. 双击 `cyborg-bot.bat` 启动
3. 浏览器打开 `http://localhost:3000`
4. 在配置向导中填入你的 API Key 和 Minecraft 服务器地址
5. 点击「启动赛博人」

**Mac 用户：**
1. 终端执行 `chmod +x cyborg-bot-mac && ./cyborg-bot-mac`
2. 浏览器打开 `http://localhost:3000`

**Linux 用户：**
1. 终端执行 `chmod +x cyborg-bot-linux && ./cyborg-bot-linux`
2. 浏览器打开 `http://localhost:3000`

### 需要什么？

| 你需要准备 | 说明 |
|-----------|------|
| 一个 Minecraft 服务器 | 自己开服或加入别人的服务器（离线模式） |
| 一个 AI API Key | 免费的 ChatAnywhere 即可（上方第 2 步） |
| 浏览器 | Chrome / Edge / Firefox 都行 |

---

## 方式 B：Docker 一键部署

适合有 Docker 的用户，用 Docker 运行更稳定。

### 第 1 步：安装 Docker

- **Windows/Mac**：下载 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**：`curl -fsSL https://get.docker.com | sh`

### 第 2 步：下载并启动

```bash
git clone https://github.com/Annieif/cyborg.git
cd cyborg
docker-compose up
```

### 第 3 步：打开浏览器

1. 访问 `http://localhost:3000`
2. 按照引导配置 AI 和 Minecraft 服务器
3. 点击启动

---

## 方式 C：Node.js 运行

如果你有 Node.js 18+，也可以直接运行源码：

```bash
git clone https://github.com/Annieif/cyborg.git
cd cyborg
npm install --legacy-peer-deps
cd frontend && npm install && npm run build && cd ..
copy .env.example .env
# 用记事本打开 .env，填入你的配置
npm start
```

---

## 常见问题

### 启动相关

| 问题 | 原因 | 解决 |
|------|------|------|
| 双击 exe 闪一下就没了 | 正常行为 | **双击 cyborg-bot.bat 而不是 exe**，bat 会保持窗口打开 |
| 窗口显示一堆 ECONNREFUSED 错误 | 没有开 Minecraft 服务器 | 打开浏览器访问 `http://localhost:3000` 配置服务器地址即可 |
| 端口被占用 | 3000 端口被其他程序占用 | 修改 `.env` 中 `WEB_PORT=3001` |
| macOS 提示"无法验证开发者" | 未签名应用 | 系统设置 → 安全性与隐私 → 仍要打开 |

### 连接相关

| 问题 | 解决 |
|------|------|
| Bot 连不上服务器 | 检查 MC 服务器地址是否正确，服务器是否开启 `online-mode=false` |
| 免费 API 无响应 | ChatAnywhere 免费 API 有每日次数限制，可能已用完，明天再试 |
| AI 回复很慢 | 免费 API 人多时较慢，建议使用付费 API |
| 前端页面空白 | 确保已构建前端：`cd frontend && npm run build` |

### 配置相关

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 服务器地址 | MC 服务器的 IP 或域名 | `localhost:25565` |
| 服务器版本 | 要匹配你 MC 服务器的版本 | `1.20.1` |
| AI 提供商 | `free`(免费) / `openai` / `custom` / `ollama` | `free` |
| Bot 名字 | 在游戏里显示的名字 | `AI_Cyborg` |

> 完整配置说明见 [README.md](./README.md#配置详解)