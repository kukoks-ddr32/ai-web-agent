import * as dotenv from "dotenv";
import { Agent } from "./agent";
import { AgentConfig } from "./types";

dotenv.config();

function getConfig(): AgentConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY not set. Copy .env.example → .env and add your key.");
    process.exit(1);
  }

  return {
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.MODEL_NAME || "gpt-4o",
    maxSteps: parseInt(process.env.MAX_STEPS || "15", 10),
    headless: process.env.HEADLESS === "true",
    screenshotDir: process.env.SCREENSHOT_DIR || undefined,
    verbose: true,
  };
}

async function main() {
  const goal = process.argv.slice(2).join(" ") || '打开百度并搜索AI新闻';

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║         AI Web Agent — Starting              ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`Goal: ${goal}\n`);

  const config = getConfig();
  const agent = new Agent(config);
  const result = await agent.run(goal);

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║              RESULT                          ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`Success:  ${result.success}`);
  console.log(`Steps:    ${result.totalSteps}`);
  console.log(`Summary:  ${result.summary}`);
  if (result.extractedData.length > 0) {
    console.log(`\nExtracted Data:`);
    result.extractedData.forEach((d, i) => console.log(`  [${i + 1}] ${d.slice(0, 500)}`));
  }
  if (result.error) {
    console.log(`\nError: ${result.error}`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
