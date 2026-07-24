# 研究发现

## Mineflayer
- Mineflayer 是 Node.js 的 Minecraft 协议实现
- 支持 Minecraft Java Edition 1.8 - 最新版本
- 核心 API: `bot.chat()`, `bot.pathfinder`, `bot.dig()`, `bot.placeBlock()`
- 插件系统: mineflayer-pathfinder, mineflayer-pvp, mineflayer-collectblock

## AI API 集成方案
- 统一抽象层支持多种 AI 后端
- 对话上下文管理使用滑动窗口 + 摘要
- 角色设定通过 System Prompt 实现
- 工具调用 (Function Calling) 映射 AI 决策到 Bot 动作

## 前端方案
- React + Vite 快速开发
- SVG 矢量图用于状态监控面板
- Socket.io 实现实时通信
- 响应式设计适配移动端

## 服务器探索测试 (2026-07-22)

### API 端点测试
- 所有 11 个端点正常工作，无崩溃
- 健康状态: healthy, 零错误
- 版本: v1.0.4, Node v22.16.0
- AI 后端: Ollama / llama3.2

### 发现的 Bug
- **chatCount 统计**: /api/chat 处理器未递增 chatCount 计数器
- **messageCount**: 发送消息后不递增（可能只统计接收的消息）
- **代理移动**: move 命令疑似使用 /tp 传送而非 WASD 步行（移动 250+ 方块）
- **idleTime**: 始终等于 uptime，空闲检测未工作

### 功能缺失
- 服务器名称/版本/模式在经验记忆中显示为"未知"
- 经验记忆不记录聊天消息（仅记录加入事件）
- 代理移动缺少 back 方向
- AI 聊天响应未触发（aiCallCount 始终为 0）

## 优化修复 (2026-07-22)

### 修复的 Bug
- **chatCount**: 在 safeChat() 起始处调用 health.recordChat()，所有聊天路径统一计数
- **idleTime**: 新增 HealthMonitor.recordActivity()，在 executeProxyCommand 调用
- **代理移动**: 持续时间 500ms → 2000ms，可感知移动距离
- **BotStatus**: 新增 chatCount 字段暴露到前端

### 新增功能
- **服务器元数据**: spawn 时自动检测 version/gameMode/difficulty 并写入经验记忆
- **聊天记录**: 接收到的聊天消息自动记录到经验记忆的"重要事件"
- **出生点地标**: spawn 时自动记录出生点坐标到经验记忆的"重要地标"

## VPT (Video-Pre-Training) 架构研究 (2026-07-24)

### 核心架构
- **VPT 是 OpenAI 提出的 Minecraft 行为克隆模型**，通过在大量 YouTube Minecraft 视频上预训练，再在 contractor 标注数据上微调
- **模型结构**: IMPALA CNN (图像编码) → Transformer (时序记忆, 256 timesteps) → ActionHead + ValueHead
- **参数量**: hidsize=2048, attention_heads=16, n_recurrence_layers=4, impala_chans=[16,32,32]
- **输入**: 128x128 RGB 图像 (INTER_LINEAR 缩放)
- **输出**: 离散化联合动作空间 (buttons 组合 + camera 离散化)

### 动作空间映射 (CameraHierarchicalMapping)
- **Buttons 分组**: hotbar(10选1) × fore_back(3选1) × left_right(3选1) × sprint_sneak(3选1) × use(2选1) × drop(2选1) × attack(2选1) × jump(2选1) × camera(2选1) + inventory
- **总组合数**: 10×3×3×3×2×2×2×2×2 + 1 = 8641 种按钮组合
- **Camera 离散化**: 11 bins (mu-law 量化), 121 种 (11×11) 相机组合
- **动作转换**: CameraHierarchicalMapping.to_factored() → ActionTransformer.policy2env()
- **关键特性**: camera meta action 控制相机是否激活；inventory 与 camera 互斥

### 逆动力学模型 (IDM)
- **用途**: 从视频帧预测玩家动作，用于标注未标注的 YouTube 数据
- **结构**: 3D Conv + IMPALA + Transformer → ActionHead
- **IDMAgent**: 处理视频帧序列，预测连续动作
- **输入**: 视频帧序列 (N, H, W, C)
- **输出**: MineRL 动作字典 (buttons + camera)

### 行为克隆 (BC) 训练
- **梯度累积**: 单步训练，batch_size=8, n_workers=12
- **优化器**: Adam, lr=0.000181, weight_decay=0.039428, max_grad_norm=5.0
- **数据加载**: DataLoader 从 mp4+jsonl 加载轨迹，跳过 null actions
- **隐藏状态管理**: 每个 episode 独立跟踪 hidden state (transformer memory)

### 集成到 CyborgBot 的关键挑战
1. **环境差异**: VPT 使用 MineRL (真实游戏客户端), CyborgBot 使用 Mineflayer (无客户端)
2. **视觉输入**: CyborgBot 需要 prismarine-viewer 提供截图作为 VPT 输入
3. **动作映射**: VPT 的连续/离散动作需要映射到 Mineflayer 的 API 调用
4. **语言障碍**: Python (PyTorch) ↔ TypeScript (Node.js) 跨语言通信
5. **模型权重**: 需要下载 VPT 预训练权重 (~500MB)

### 集成方案设计
1. **Python VPT Bridge**: 独立 Python 进程加载 VPT 模型，通过 HTTP/WebSocket 提供推理服务
2. **TypeScript VPT Client**: Node.js 端发送截图，接收动作预测
3. **动作映射层**: 将 VPT 动作空间映射到 Mineflayer 命令
4. **视觉捕获**: prismarine-viewer headless 模式截图

## MineRL 环境集成 (2026-07-24)

### MineRL 概述
- **MineRL 是 Minecraft AI 研究的标准环境**，提供 gym 接口的 Minecraft 环境
- **VPT 依赖 MineRL**: VPT 的训练和评估都在 MineRL 环境中进行
- **MineRL 提供**: 标准任务 (Treechop/Navigate/ObtainDiamond)、人类示范数据集、统一动作空间

### MineRL 动作空间 (完整)
- **键盘映射** (KEYBOARD_BUTTON_MAPPING): 17 个键位映射 (W/A/S/D/Space/Shift/Ctrl/E/Q/F/1-9/Esc)
- **鼠标映射** (MOUSE_BUTTON_MAPPING): 左键=attack(0), 右键=use(1), 中键=pickItem(2)
- **相机缩放** (CAMERA_SCALER): 360.0/2400.0 ≈ 0.15 (匹配 MineRL Java 灵敏度代码)
- **NOOP_ACTION**: 23 个动作维度的零动作模板

### MineRL → Mineflayer 映射
- 完整映射表 MINERL_TO_MINEFLAYER: 23 个 MineRL 动作 → Mineflayer 操作
- 控制类动作: forward/back/left/right/jump/sprint/sneak → setControlState
- 鼠标类动作: attack → pvp.attack, use → useOn/activateItem/placeBlock
- 物品栏: hotbar.1-9 → setQuickBarSlot
- 特殊: inventory → openChest, drop → tossStack, pickItem → pickBlock

### MineRL 标准任务
| 任务 | 环境名 | 类型 |
|------|--------|------|
| 砍树 | MineRLTreechop-v0 | 基础 |
| 导航 | MineRLNavigate-v0 | 基础 |
| 导航(密集) | MineRLNavigateDense-v0 | 基础 |
| 导航(极限) | MineRLNavigateExtreme-v0 | 基础 |
| 获得钻石 | MineRLObtainDiamond-v0 | 竞赛 |
| 寻找洞穴 | MineRLBasaltFindCave-v0 | BASALT |
| 建造瀑布 | MineRLBasaltMakeWaterfall-v0 | BASALT |
| 建造围栏 | MineRLBasaltCreateVillageAnimalPen-v0 | BASALT |
| 建造房屋 | MineRLBasaltBuildVillageHouse-v0 | BASALT |

### MineRL 工具链
- `minerl_runner.py`: 在 MineRL 环境中离线测试 VPT 模型
- `minerl_data.py`: 下载/检查/列出 MineRL 数据集
- `minerl_actions.py`: 完整 MineRL 动作空间定义 (键盘/鼠标/相机/验证)
- `minerl_benchmark.py`: MineRL 竞赛标准评估 (多任务基准测试、基线对比、JSON 报告)
- Bridge Server 新增端点: `/api/vpt/minerl/actions`, `/api/vpt/minerl/tasks`, `/api/vpt/minerl/validate`, `/api/vpt/minerl/benchmark/baselines`, `/api/vpt/minerl/benchmark/status`, `/api/vpt/minerl/benchmark/validate`

### MineRL 基准测试与评估 (2026-07-24)
- **竞赛标准指标**: avg_reward, std_reward, success_rate, avg_steps, action_rate, steps_per_second
- **任务成功检测**: 每个任务独立检测（treechop=收集木头, navigate=到达目标, diamond=获得钻石）
- **基线对比**: 内置 7 个任务的参考基线 (random, human, vpt_foundation_1x, vpt_rl 等)
- **环境验证**: 自动检测 MineRL/Gym/Java 安装和可用任务
- **JSON 报告**: 可导出结构化 benchmark 报告用于追踪和对比

## 项目结构设计
```
赛博人/
├── src/
│   ├── bot/           # Mineflayer Bot 核心
│   ├── ai/            # AI API 接口
│   ├── server/        # WebSocket 服务
│   ├── config/        # 配置管理
│   └── utils/         # 工具函数
├── frontend/          # React 前端
├── config/            # 配置文件
└── logs/              # 日志文件
```