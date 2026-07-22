# 快速开始（3 步）

## 第 1 步：安装 Docker

- **Windows/Mac**: 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: `curl -fsSL https://get.docker.com | sh`

安装后打开 Docker Desktop，确认右下角图标变绿。

## 第 2 步：下载并启动

```bash
git clone https://github.com/Annieif/cyborg.git
cd cyborg
docker-compose up
```

## 第 3 步：打开浏览器配置

1. 浏览器打开 `http://localhost:3000`
2. 按照引导配置 AI 和 Minecraft 服务器
3. 点击「启动赛博人」

就这么简单！赛博人会自动加入 Minecraft 服务器并开始工作。

## 没有 Docker？

### 方式 A：下载可执行文件（推荐）

从 [GitHub Releases](https://github.com/Annieif/cyborg/releases) 下载对应系统的可执行文件：

| 系统 | 文件 |
|------|------|
| Windows | `cyborg-bot.exe` |
| macOS | `cyborg-bot-mac` |
| Linux | `cyborg-bot-linux` |

下载后双击运行（或终端执行），然后打开 `http://localhost:3000`。

### 方式 B：Node.js 直接运行

如果你有 Node.js 18+：

```bash
npm install
npm run build
cp .env.example .env
# 编辑 .env 填入你的配置
npm start
```

## 常见问题

| 问题 | 解决 |
|------|------|
| 端口被占用 | 修改 docker-compose.yml 中的 `3000:3000` 为 `3001:3000` |
| 连接不上服务器 | 检查 MC_HOST 是否正确，服务器是否开启了正版验证 |
| 没有 AI 响应 | 检查 API Key 是否正确，网络能否访问 AI API |
| 免费 API 用不了 | ChatAnywhere 免费 API 有每日请求次数限制，可能已用完 |