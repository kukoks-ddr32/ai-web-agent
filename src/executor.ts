import { Page } from "playwright";
import { AgentAction, StepResult } from "./types";
import { Observer } from "./observer";

/**
 * Executor: runs a single AgentAction via Playwright and returns the result.
 */
export class Executor {
  private page: Page;
  private observer: Observer;

  constructor(page: Page) {
    this.page = page;
    this.observer = new Observer(page);
  }

  async execute(action: AgentAction): Promise<StepResult> {
    let error: string | undefined;
    let extractedData: string | undefined;

    try {
      switch (action.action) {
        case "goto":
          await this.page.goto(action.url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          break;

        case "click":
          await this.page.waitForSelector(action.selector, { timeout: 10000 });
          await this.page.click(action.selector);
          break;

        case "type":
          await this.page.waitForSelector(action.selector, { timeout: 10000 });
          await this.page.fill(action.selector, action.text);
          break;

        case "wait":
          if (action.selector) {
            await this.page.waitForSelector(action.selector, {
              timeout: action.ms || 10000,
            });
          } else {
            await this.page.waitForTimeout(action.ms || 1000);
          }
          break;

        case "extract": {
          if (action.selector) {
            const elements = await this.page.$$(action.selector);
            const texts: string[] = [];
            for (const el of elements) {
              const val = action.attribute
                ? await el.getAttribute(action.attribute)
                : await el.textContent();
              if (val) texts.push(val.trim());
            }
            extractedData = texts.join("\n");
          } else {
            extractedData = await this.page.evaluate(() =>
              document.body.innerText.slice(0, 5000)
            );
          }
          break;
        }

        case "scroll":
          await this.page.evaluate((dir) => {
            window.scrollBy(0, dir === "down" ? 500 : -500);
          }, action.direction);
          break;

        case "done":
          extractedData = action.extractedData;
          break;

        default:
          error = `Unknown action: ${(action as any).action}`;
      }
    } catch (e: any) {
      error = e.message?.slice(0, 300) || String(e);
    }

    const observation = await this.observer.observe();

    return {
      success: !error,
      action,
      observation,
      error,
      extractedData,
    };
  }
}
