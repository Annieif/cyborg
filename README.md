# MineRL VPT — Minecraft AI 视觉智能

基于 [OpenAI Video-Pre-Training (VPT)](https://github.com/openai/Video-Pre-Training) 和 [MineRL](https://minerl.readthedocs.io/) 的 Minecraft AI 视觉智能项目。

提供 VPT 模型推理服务、MineRL 环境测试、数据集工具、基准评估等完整工具链。

## 架构

```
┌──────────────────────────────────────────────────┐
│                  MineRL VPT 工具链                 │
│                                                   │
│  ┌─────────────┐  ┌──────────────┐               │
│  │ bridge_server│  │ minerl_runner│               │
│  │  (FastAPI)   │  │  (离线测试)   │               │
│  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                        │
│  ┌──────┴─────────────────┴───────┐               │
│  │         vpt_agent.py           │               │
│  │   (VPT 模型加载 + 推理)         │               │
│  └──────┬─────────────────────────┘               │
│         │                                          │
│  ┌──────┴──────────────────────────┐              │
│  │       minerl_actions.py         │              │
│  │  (MineRL 动作空间 + 映射)        │              │
│  └─────────────────────────────────┘              │
│                                                   │
│  工具: minerl_data.py (数据集)                     │
│         minerl_benchmark.py (基准评估)              │
└──────────────────────────────────────────────────┘
```

## 快速开始

### 环境要求

- Python 3.8+
- PyTorch 2.0+
- Java 8+ (MineRL 环境需要)
- Minecraft Java Edition 账号 (MineRL 环境需要)

### 安装

```bash
# 克隆仓库
git clone https://github.com/Annieif/cyborg.git
cd cyborg
git checkout test/minerl-only

# 安装 Python 依赖
pip install -r vpt/requirements.txt

# 可选：安装 MineRL 环境
pip install minerl
```

### 启动 VPT Bridge 推理服务

```bash
# 下载 VPT 模型权重后
python vpt/bridge_server.py --model foundation-model-1x.model --weights foundation-model-1x.weights

# Windows 一键启动
scripts\start-vpt-bridge.bat
```

## 工具说明

| 工具 | 用途 | 命令 |
|------|------|------|
| `bridge_server.py` | VPT 推理 HTTP 服务 | `python vpt/bridge_server.py --model ... --weights ...` |
| `minerl_runner.py` | MineRL 环境离线测试 | `python vpt/minerl_runner.py --model ... --weights ... --task treechop` |
| `minerl_data.py` | 数据集下载/检查 | `python vpt/minerl_data.py list / download / inspect` |
| `minerl_benchmark.py` | 竞赛标准基准评估 | `python vpt/minerl_benchmark.py --model ... --weights ... --task treechop` |

## Bridge API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/vpt/health` | GET | 健康检查 |
| `/api/vpt/act` | POST | 图像 → 动作预测 |
| `/api/vpt/reset` | POST | 重置 Agent 状态 |
| `/api/vpt/minerl/actions` | GET | MineRL 动作空间参考 |
| `/api/vpt/minerl/tasks` | GET | 可用任务列表 |
| `/api/vpt/minerl/validate` | POST | 验证 MineRL 动作 |
| `/api/vpt/minerl/benchmark/baselines` | GET | 参考基线数据 |
| `/api/vpt/minerl/benchmark/status` | GET | 环境状态 |
| `/api/vpt/minerl/benchmark/validate` | POST | 环境验证 |

## MineRL 动作空间

完整实现了 MineRL 标准动作空间：

- **17 个键盘映射**: W/A/S/D/Space/Shift/Ctrl/E/Q/F/1-9/Esc
- **3 个鼠标映射**: 左键(attack) / 右键(use) / 中键(pickItem)
- **相机缩放**: CAMERA_SCALER = 360.0/2400.0
- **23 维 NOOP_ACTION**: 零动作模板

## 支持的任务

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

## 基准测试

```bash
# 单任务基准
python vpt/minerl_benchmark.py --model model.model --weights model.weights --task treechop --episodes 10

# 全任务基准
python vpt/minerl_benchmark.py --model model.model --weights model.weights --all-tasks --episodes 5

# 环境验证
python vpt/minerl_benchmark.py --validate

# 导出报告
python vpt/minerl_benchmark.py --model model.model --weights model.weights --task treechop --output report.json
```

## 参考

- [OpenAI Video-Pre-Training](https://github.com/openai/Video-Pre-Training)
- [MineRL 文档](https://minerl.readthedocs.io/)
- [MineRL NeurIPS 竞赛](https://www.aicrowd.com/challenges/neurips-2019-minerl-competition)

## License

MIT