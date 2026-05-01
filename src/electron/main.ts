import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { Agent } from "../agent";
import { AgentConfig, ProviderType } from "../types";

let mainWindow: BrowserWindow | null = null;

function getRendererPath() {
  // In dev: dist/electron/main.js → src/electron/renderer/
  // In packaged asar: same relative path works via app.getAppPath()
  return path.join(app.getAppPath(), "src", "electron", "renderer", "index.html");
}

function getPreloadPath() {
  // Preload is compiled alongside main.js in dist/electron/
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
