import { chromium, Browser, Page } from "playwright";
import { Planner } from "./planner";
import { Executor } from "./executor";
import { Observer } from "./observer";
import { SafetyGuard } from "./safety";
import {
  AgentConfig,
  AgentRunResult,
  PageObservation,
  StepResult,
} from "./types";

/**
 * Agent: the main loop that ties Planner → Executor → Observer together.
 *
 * Flow:
 *   1. Planner observes current state and decides next action(s)
 *   2. Executor runs each action via Playwright
 *   3. Observer captures the resulting page state
 *   4. Repeat until "done" action or safety limit hit
 */
export class Agent {
  private config: AgentConfig;
  private planner: Planner;
  private safety: SafetyGuard;

  constructor(config: AgentConfig) {
    this.config = config;
    this.planner = new Planner(config.apiKey, config.baseURL, config.model);
    this.safety = new SafetyGuard(config);
  }

  async run(goal: string): Promise<AgentRunResult> {
    let browser: Browser | null = null;
    const steps: StepResult[] = [];
    const extractedData: string[] = [];
    const previousSteps: string[] = [];
    let currentObservation: PageObservation | null = null;

    try {
      browser = await chromium.launch({ headless: this.config.headless });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      const page = await context.newPage();
      const executor = new Executor(page);
      const observer = new Observer(page);

      let stepNumber = 0;

      while (true) {
        // ── Safety check ──────────────────────────────────────────────
        const safetyError = this.safety.check(stepNumber);
        if (safetyError) {
          this.log(`[SAFETY] ${safetyError}`);
          return {
            success: false,
            steps,
            summary: safetyError,
            extractedData,
            totalSteps: stepNumber,
            error: safetyError,
          };
        }

        // ── Plan ─────────────────────────────────────────────────────
        this.log(`\n── Step ${stepNumber + 1} ──`);
        const plan = await this.planner.plan(
          goal,
          currentObservation,
          previousSteps,
          stepNumber
        );
        this.log(`[PLAN] ${plan.thinking}`);

        // ── Execute each action in the plan ───────────────────────────
        for (const action of plan.actions) {
          this.log(
            `[EXEC] ${action.action}${
              "selector" in action ? ` → ${(action as any).selector}` : ""
            }${"url" in action ? ` → ${(action as any).url}` : ""}`
          );

          // Check for "done"
          if (action.action === "done") {
            this.log(`[DONE] ${action.summary}`);
            if (action.extractedData) extractedData.push(action.extractedData);
            return {
              success: true,
              steps,
              summary: action.summary,
              extractedData,
              totalSteps: stepNumber,
            };
          }

          // Execute
          const result = await executor.execute(action);
          steps.push(result);
          this.safety.recordAction(action);
          this.safety.recordStep(result);
          currentObservation = result.observation;

          // Record for context
          const status = result.success ? "OK" : `FAIL: ${result.error}`;
          previousSteps.push(
            `${action.action} → ${status}${
              result.extractedData
                ? ` | extracted: ${result.extractedData.slice(0, 200)}`
                : ""
            }`
          );

          if (result.extractedData) {
            extractedData.push(result.extractedData);
          }

          if (!result.success) {
            this.log(`[ERROR] ${result.error}`);
          }

          // Save screenshot if configured
          if (this.config.screenshotDir) {
            const fs = require("fs");
            const path = require("path");
            const dir = this.config.screenshotDir;
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const file = path.join(dir, `step-${stepNumber}.png`);
            fs.writeFileSync(
              file,
              Buffer.from(result.observation.screenshotBase64, "base64")
            );
          }
        }

        stepNumber++;
      }
    } catch (e: any) {
      const errMsg = e.message || String(e);
      this.log(`[FATAL] ${errMsg}`);
      return {
        success: false,
        steps,
        summary: `Agent crashed: ${errMsg}`,
        extractedData,
        totalSteps: steps.length,
        error: errMsg,
      };
    } finally {
      if (browser) await browser.close();
    }
  }

  private log(msg: string): void {
    if (this.config.verbose) {
      console.log(msg);
    }
  }
}
