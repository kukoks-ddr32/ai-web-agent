# AI Web Agent

一个基于 Node.js + Playwright + LLM 的 AI 网页自动化框架。

用户输入自然语言指令，AI 自动控制浏览器完成任务。

## 功能

- 自然语言驱动，无需手写选择器
- 支持 7 种动作：goto / click / type / wait / extract / scroll / done
- 自动截图记录每一步操作
- 安全守卫：步数限制、死循环检测、错误熔断
- 兼容 OpenAI 格式 API（支持第三方中转站）

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

```
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4o
```

### 运行

```bash
# 默认任务：打开百度搜索AI新闻
npm start

# 自定义指令
npx ts-node src/index.ts "打开GitHub Trending"
npx ts-node src/index.ts "打开知乎搜索Claude"
```

设置 `HEADLESS=false`（默认）可弹出浏览器窗口实时观察 Agent 操作。

## 项目结构

```
src/
├── types.ts      ← 类型定义
├── safety.ts     ← 安全守卫（步数限制、循环检测、错误熔断）
├── planner.ts    ← LLM 规划器（自然语言 → 结构化动作）
├── executor.ts   ← Playwright 执行器
├── observer.ts   ← 页面状态观察器
├── agent.ts      ← 主循环（plan → execute → observe → repeat）
└── index.ts      ← 入口
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
