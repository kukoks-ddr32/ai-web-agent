import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import * as fs from "fs";
import { Agent } from "../agent";
import { AgentConfig, ProviderType } from "../types";

let mainWindow: BrowserWindow | null = null;

// ── Settings persistence ───────────────────────────────────────────────────

const settingsPath = path.join(app.getPath("userData"), "settings.json");

function loadSettings(): Record<string, string> {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    }
  } catch {}
  return {};
}

function saveSettings(settings: Record<string, string>): void {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

// ── Window ─────────────────────────────────────────────────────────────────

function getRendererPath() {
  return path.join(app.getAppPath(), "src", "electron", "renderer", "index.html");
}

function getPreloadPath() {
  return path.join(__dirname, "preload.js");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    title: "AI Web Agent",
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(getRendererPath());
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

// ── IPC: Settings ──────────────────────────────────────────────────────────

ipcMain.handle("load-settings", () => loadSettings());

ipcMain.on("save-settings", (_event, settings) => saveSettings(settings));

// ── IPC: Test Connection ───────────────────────────────────────────────────

ipcMain.handle("test-connection", async (_event, config) => {
  try {
    const provider = (config.provider || "openai") as ProviderType;

    if (provider === "anthropic") {
      const Anthropic = require("@anthropic-ai/sdk");
      const client = new Anthropic.default({ apiKey: config.apiKey });
      const resp = await client.messages.create({
        model: config.model || "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say hi" }],
      });
      const text = resp.content.find((b: any) => b.type === "text");
      return { success: true, message: text ? text.text.slice(0, 50) : "OK" };
    } else {
      const OpenAI = require("openai");
      const client = new OpenAI.default({
        apiKey: config.apiKey,
        baseURL: config.baseURL || "https://api.openai.com/v1",
      });
      const resp = await client.chat.completions.create({
        model: config.model || "gpt-4o",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say hi" }],
      });
      return { success: true, message: resp.choices?.[0]?.message?.content?.slice(0, 50) || "OK" };
    }
  } catch (err: any) {
    return { success: false, message: err.message || String(err) };
  }
});

// ── IPC: Run Task ──────────────────────────────────────────────────────────

ipcMain.on("run-task", async (_event, config) => {
  const win = mainWindow;
  if (!win) return;

  const provider = (config.provider || "openai") as ProviderType;

  const agentConfig: AgentConfig = {
    provider,
    apiKey: config.apiKey || "",
    baseURL: config.baseURL || "https://api.openai.com/v1",
    anthropicApiKey: config.anthropicApiKey || undefined,
    model: config.model || (provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o"),
    maxSteps: 15,
    headless: true,
    verbose: false,
  };

  win.webContents.send("start");

  const agent = new Agent(agentConfig, {
    onLog: (msg) => win.webContents.send("log", msg),
    onScreenshot: (step, base64) => win.webContents.send("screenshot", step, base64),
    onResult: (result) => win.webContents.send("result", result),
  });

  await agent.run(config.goal);
});
