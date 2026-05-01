import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  runTask: (config: {
    provider: string;
    apiKey: string;
    anthropicApiKey?: string;
    baseURL: string;
    model: string;
    goal: string;
  }) => ipcRenderer.send("run-task", config),

  onLog: (callback: (message: string) => void) => {
    ipcRenderer.on("log", (_event, message) => callback(message));
  },

  onScreenshot: (callback: (step: number, base64: string) => void) => {
    ipcRenderer.on("screenshot", (_event, step, base64) => callback(step, base64));
  },

  onResult: (callback: (result: any) => void) => {
    ipcRenderer.on("result", (_event, result) => callback(result));
  },

  onStart: (callback: () => void) => {
    ipcRenderer.on("start", () => callback());
  },
});
