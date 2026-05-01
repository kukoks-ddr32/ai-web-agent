const $ = (id) => document.getElementById(id);

const providerEl = $("provider");
const apiKeyEl = $("apiKey");
const apiKeyLabelEl = $("apiKeyLabel");
const baseURLEl = $("baseURL");
const baseURLLabelEl = $("baseURLLabel");
const modelEl = $("model");
const goalInput = $("goalInput");
const runBtn = $("runBtn");
const testBtn = $("testBtn");
const testResult = $("testResult");
const logPanel = $("logPanel");
const screenshotGallery = $("screenshotGallery");
const screenshotPanel = $("screenshotPanel");
const resultBar = $("resultBar");
const resultIcon = $("resultIcon");
const resultText = $("resultText");
const statusEl = $("status");

// ── Settings persistence ─────────────────────────────

function collectSettings() {
  return {
    provider: providerEl.value,
    apiKey: apiKeyEl.value,
    baseURL: baseURLEl.value,
    model: modelEl.value,
  };
}

function applySettings(s) {
  if (s.provider) providerEl.value = s.provider;
  if (s.apiKey) apiKeyEl.value = s.apiKey;
  if (s.baseURL) baseURLEl.value = s.baseURL;
  if (s.model) modelEl.value = s.model;
  // Trigger provider UI update
  providerEl.dispatchEvent(new Event("change"));
}

function autoSave() {
  window.api.saveSettings(collectSettings());
}

// Debounced save on input change
let saveTimer = null;
function debounceSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autoSave, 500);
}

[providerEl, apiKeyEl, baseURLEl, modelEl].forEach((el) => {
  el.addEventListener("input", debounceSave);
  el.addEventListener("change", debounceSave);
});

// Load settings on startup
window.api.loadSettings().then((settings) => {
  if (settings && Object.keys(settings).length > 0) {
    applySettings(settings);
  }
});

// ── Provider switch ──────────────────────────────────

providerEl.addEventListener("change", () => {
  const p = providerEl.value;
  if (p === "anthropic") {
    apiKeyLabelEl.textContent = "Anthropic API Key";
    apiKeyEl.placeholder = "sk-ant-...";
    baseURLEl.style.display = "none";
    baseURLLabelEl.style.display = "none";
    if (!modelEl.value.startsWith("claude")) {
      modelEl.value = "claude-sonnet-4-20250514";
    }
    modelEl.placeholder = "claude-sonnet-4-20250514";
  } else {
    apiKeyLabelEl.textContent = "OpenAI API Key";
    apiKeyEl.placeholder = "sk-...";
    baseURLEl.style.display = "";
    baseURLLabelEl.style.display = "";
    if (modelEl.value.startsWith("claude")) {
      modelEl.value = "gpt-4o";
    }
    modelEl.placeholder = "gpt-4o";
  }
});

// ── Test Connection ──────────────────────────────────

testBtn.addEventListener("click", async () => {
  const apiKey = apiKeyEl.value.trim();
  if (!apiKey) {
    apiKeyEl.focus();
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = "Testing...";
  testResult.className = "test-result hidden";

  const result = await window.api.testConnection({
    provider: providerEl.value,
    apiKey,
    baseURL: baseURLEl.value.trim(),
    model: modelEl.value.trim(),
  });

  testBtn.disabled = false;
  testBtn.textContent = "Test Connection";

  if (result.success) {
    testResult.className = "test-result success";
    testResult.textContent = "Connected: " + result.message;
  } else {
    testResult.className = "test-result fail";
    testResult.textContent = "Failed: " + result.message;
  }
});

// ── Run task ─────────────────────────────────────────

runBtn.addEventListener("click", () => {
  const goal = goalInput.value.trim();
  if (!goal) {
    goalInput.focus();
    return;
  }

  const apiKey = apiKeyEl.value.trim();
  if (!apiKey) {
    apiKeyEl.focus();
    return;
  }

  // Reset UI
  logPanel.innerHTML = "";
  screenshotGallery.innerHTML = "";
  resultBar.classList.add("hidden");
  screenshotPanel.querySelector(".screenshot-empty").style.display = "none";

  runBtn.disabled = true;
  statusEl.textContent = "Running...";
  statusEl.className = "status running";

  window.api.runTask({
    provider: providerEl.value,
    apiKey,
    anthropicApiKey: providerEl.value === "anthropic" ? apiKey : undefined,
    baseURL: baseURLEl.value.trim(),
    model: modelEl.value.trim(),
    goal,
  });
});

// Enter key to run
goalInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runBtn.click();
});

// ── IPC handlers ─────────────────────────────────────

window.api.onStart(() => {
  addLog("Agent started...", "step");
});

window.api.onLog((message) => {
  addLog(message);
});

window.api.onScreenshot((step, base64) => {
  const item = document.createElement("div");
  item.className = "screenshot-item";
  item.innerHTML = `
    <div class="step-label">Step ${step + 1}</div>
    <img src="data:image/png;base64,${base64}" alt="Step ${step + 1}">
  `;
  screenshotGallery.appendChild(item);
  screenshotPanel.scrollTop = screenshotPanel.scrollHeight;
});

window.api.onResult((result) => {
  runBtn.disabled = false;

  if (result.success) {
    statusEl.textContent = "Done";
    statusEl.className = "status done";
    resultIcon.textContent = "✅";
  } else {
    statusEl.textContent = "Error";
    statusEl.className = "status error";
    resultIcon.textContent = "❌";
  }

  let text = result.summary;
  if (result.extractedData && result.extractedData.length > 0) {
    text += " | Data: " + result.extractedData.join("; ");
  }
  resultText.textContent = text;
  resultBar.classList.remove("hidden");

  addLog(`\n=== RESULT ===`, "done");
  addLog(`Success: ${result.success}`, result.success ? "done" : "error");
  addLog(`Steps: ${result.totalSteps}`, "step");
  addLog(`Summary: ${result.summary}`, "done");
});

// ── Helpers ──────────────────────────────────────────

function addLog(message, type) {
  const empty = logPanel.querySelector(".log-empty");
  if (empty) empty.remove();

  const lines = message.split("\n");
  for (const line of lines) {
    const div = document.createElement("div");
    div.className = "log-line";
    if (type) {
      div.classList.add(type);
    } else {
      if (line.includes("[PLAN]")) div.classList.add("plan");
      else if (line.includes("[EXEC]")) div.classList.add("exec");
      else if (line.includes("[DONE]")) div.classList.add("done");
      else if (line.includes("[ERROR]")) div.classList.add("error");
      else if (line.includes("[SAFETY]")) div.classList.add("safety");
      else if (line.includes("── Step")) div.classList.add("step");
    }
    div.textContent = line;
    logPanel.appendChild(div);
  }
  logPanel.scrollTop = logPanel.scrollHeight;
}
