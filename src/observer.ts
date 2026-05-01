import { Page } from "playwright";
import { PageObservation, InteractiveElement } from "./types";

/**
 * Observer: captures page state after each action.
 * Returns URL, title, screenshot, text summary, and interactive elements.
 */
export class Observer {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async observe(): Promise<PageObservation> {
    const [url, title, screenshotBase64, textContent, interactiveElements] =
      await Promise.all([
        this.getUrl(),
        this.getTitle(),
        this.getScreenshot(),
        this.getTextSummary(),
        this.getInteractiveElements(),
      ]);

    return { url, title, screenshotBase64, textContent, interactiveElements };
  }

  private async getUrl(): Promise<string> {
    try {
      return this.page.url();
    } catch {
      return "unknown";
    }
  }

  private async getTitle(): Promise<string> {
    try {
      return await this.page.title();
    } catch {
      return "";
    }
  }

  private async getScreenshot(): Promise<string> {
    const buf = await this.page.screenshot({ type: "png" });
    return buf.toString("base64");
  }

  /** Extract visible text, trimmed to ~3000 chars for LLM context. */
  private async getTextSummary(): Promise<string> {
    try {
      const text = await this.page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              const tag = parent.tagName.toLowerCase();
              if (["script", "style", "noscript"].includes(tag))
                return NodeFilter.FILTER_REJECT;
              const style = window.getComputedStyle(parent);
              if (style.display === "none" || style.visibility === "hidden")
                return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            },
          }
        );
        const parts: string[] = [];
        while (walker.nextNode()) {
          const t = walker.currentNode.textContent?.trim();
          if (t) parts.push(t);
        }
        return parts.join(" ");
      });
      return text.slice(0, 3000);
    } catch {
      return "";
    }
  }

  /** Find clickable / typeable elements with CSS selectors the LLM can reference. */
  private async getInteractiveElements(): Promise<InteractiveElement[]> {
    try {
      return await this.page.evaluate(() => {
        const els = document.querySelectorAll(
          'a, button, input, textarea, select, [role="button"], [onclick]'
        );
        const results: InteractiveElement[] = [];
        const seen = new Set<string>();

        els.forEach((el) => {
          const tag = el.tagName.toLowerCase();
          const text = (el.textContent || "").trim().slice(0, 80);
          const href = el.getAttribute("href") || undefined;
          const placeholder = el.getAttribute("placeholder") || undefined;
          const type = el.getAttribute("type") || undefined;
          const id = el.id;
          const name = el.getAttribute("name");

          // Build a short CSS selector
          let selector = tag;
          if (id) selector = `#${id}`;
          else if (name) selector = `${tag}[name="${name}"]`;

          const key = `${selector}|${text}`;
          if (seen.has(key)) return;
          seen.add(key);

          results.push({ tag, selector, text, type, href, placeholder });
        });

        return results.slice(0, 50); // Cap at 50 elements
      });
    } catch {
      return [];
    }
  }
}
