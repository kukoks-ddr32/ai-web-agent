# AI Web Agent

一个基于 Node.js + Playwright + LLM 的 AI 网页自动化框架。

用户输入自然语言指令，AI 自动控制浏览器完成任务。

## 功能

- 自然语言驱动，无需手写选择器
- 支持 7 种动作：goto / click / type / wait / extract / scroll / done
- 自动截图记录每一步操作
- 安全守卫：步数限制、死循环检测、错误熔断
- 多 LLM 提供商支持：OpenAI / Anthropic Claude
- 兼容 OpenAI 格式 API（支持第三方中转站）
- Electron 桌面应用，带 GUI 界面

## 快速开始

### 安装

```bash
npm install
npx playwright install chromium
```

### 配置

```bash
cp .env.example .env
```

编辑 `.env` 填入你的 API 配置：

```bash
# 选择提供商：openai 或 anthropic
PROVIDER=openai

# OpenAI 配置
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4o

# 或 Anthropic 配置
# ANTHROPIC_API_KEY=sk-ant-xxx
# MODEL_NAME=claude-sonnet-4-20250514
```

### 运行模式

#### 1. CLI 模式

```bash
# 默认任务：打开百度搜索AI新闻
npm start

# 自定义指令
npx ts-node src/index.ts "打开GitHub Trending"
npx ts-node src/index.ts "打开知乎搜索Claude"
```

设置 `HEADLESS=false`（默认）可弹出浏览器窗口实时观察 Agent 操作。

#### 2. Electron 桌面应用（开发模式）

```bash
npm run electron:dev
```

打开桌面窗口，可在界面中选择 Provider、输入 API Key、输入任务并查看实时日志和截图。

#### 3. 打包为 exe

```bash
npm run electron:build
```

打包完成后在 `release/` 目录下生成：
- `AI Web Agent Setup x.x.x.exe` — 安装包
- `AI Web Agent x.x.x.exe` — 便携版（免安装）

## 项目结构

```
src/
├── types.ts              ← 类型定义
├── providers.ts          ← LLM 提供商抽象（OpenAI / Anthropic）
├── safety.ts             ← 安全守卫（步数限制、循环检测、错误熔断）
├── planner.ts            ← LLM 规划器（自然语言 → 结构化动作）
├── executor.ts           ← Playwright 执行器
├── observer.ts           ← 页面状态观察器
├── agent.ts              ← 主循环（plan → execute → observe → repeat）
├── index.ts              ← CLI 入口
└── electron/
    ├── main.ts           ← Electron 主进程
    ├── preload.ts        ← IPC 预加载脚本
    └── renderer/
        ├── index.html    ← 界面结构
        ├── styles.css    ← 暗色主题样式
        └── renderer.js   ← 前端交互逻辑
```

## 工作流程

```
用户指令 → Planner(LLM) → Executor(Playwright) → Observer(页面状态)
                ↑                                         │
                └─────────── 循环直到 done ───────────────┘
```

## 支持的动作

| 动作 | 说明 | 示例 |
|------|------|------|
| `goto` | 导航到 URL | `{ "action": "goto", "url": "https://..." }` |
| `click` | 点击元素 | `{ "action": "click", "selector": "#btn" }` |
| `type` | 输入文本 | `{ "action": "type", "selector": "input", "text": "..." }` |
| `wait` | 等待 | `{ "action": "wait", "ms": 2000 }` |
| `extract` | 提取内容 | `{ "action": "extract", "selector": "h1" }` |
| `scroll` | 滚动页面 | `{ "action": "scroll", "direction": "down" }` |
| `done` | 任务完成 | `{ "action": "done", "summary": "..." }` |

## License

MIT
