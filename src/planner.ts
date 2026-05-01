import {
  LLMProvider,
  PageObservation,
  PlanResponse,
} from "./types";

/**
 * Planner: uses an LLM provider to decide the next actions
 * given the user's goal and the current page observation.
 */
export class Planner {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  async plan(
    userGoal: string,
    observation: PageObservation | null,
    previousSteps: string[],
    stepNumber: number
  ): Promise<PlanResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      userGoal,
      observation,
      previousSteps,
      stepNumber
    );

    let text: string;
    try {
      text = await this.provider.chat(systemPrompt, userPrompt, 2048);
    } catch (err: any) {
      console.error("[PLANNER] API call failed:", err.message || err);
      return {
        thinking: `API error: ${err.message}`,
        actions: [{ action: "wait", ms: 2000 }],
      };
    }

    if (!text) {
      console.error("[PLANNER] Empty response from provider");
    }
    return this.parseResponse(text);
  }

  private buildSystemPrompt(): string {
    return `You are an AI web automation planner. Given a user's goal and the current browser state, decide the next action(s) to take.

You MUST respond with valid JSON in this exact format:
{
  "thinking": "Brief reasoning about what to do next",
  "actions": [
    {
      "action": "<action_type>",
      ...action-specific fields...
    }
  ]
}

Available actions:
1. goto — Navigate to a URL
   { "action": "goto", "url": "https://...", "reason": "..." }

2. click — Click an element by CSS selector
   { "action": "click", "selector": "css-selector", "reason": "..." }

3. type — Type text into an input field
   { "action": "type", "selector": "css-selector", "text": "text to type", "reason": "..." }

4. wait — Wait for an element or time
   { "action": "wait", "ms": 2000 } or { "action": "wait", "selector": "css" }

5. extract — Extract text from page or elements
   { "action": "extract", "selector": "css-selector" } or { "action": "extract" } for full page

6. scroll — Scroll the page
   { "action": "scroll", "direction": "down" | "up" }

7. done — Task is complete
   { "action": "done", "summary": "What was accomplished", "extractedData": "any data found" }

Rules:
- Return ONE action at a time unless actions are truly independent.
- Use the EXACT CSS selectors from the interactive elements list.
- For search: type into the input, then click submit or press Enter (use click on the search button).
- After typing in a search box, the next step should be to submit the search.
- When the task goal is achieved, immediately return "done".
- Do NOT repeat the same action if it already succeeded.
- Be precise with selectors — prefer #id > name= > tag[attribute].
- IMPORTANT: Respond ONLY with valid JSON. No extra text outside the JSON.`;
  }

  private buildUserPrompt(
    userGoal: string,
    observation: PageObservation | null,
    previousSteps: string[],
    stepNumber: number
  ): string {
    let prompt = `## User Goal\n${userGoal}\n\n## Step Number\n${stepNumber}\n\n`;

    if (previousSteps.length > 0) {
      prompt += `## Previous Steps\n${previousSteps.join("\n")}\n\n`;
    }

    if (observation) {
      prompt += `## Current Page State\n`;
      prompt += `- URL: ${observation.url}\n`;
      prompt += `- Title: ${observation.title}\n\n`;

      if (observation.textContent) {
        prompt += `## Page Text (truncated)\n${observation.textContent.slice(0, 2000)}\n\n`;
      }

      if (observation.interactiveElements.length > 0) {
        prompt += `## Interactive Elements (use these selectors)\n`;
        for (const el of observation.interactiveElements) {
          let desc = `<${el.tag}> selector="${el.selector}"`;
          if (el.text) desc += ` text="${el.text}"`;
          if (el.type) desc += ` type="${el.type}"`;
          if (el.placeholder) desc += ` placeholder="${el.placeholder}"`;
          if (el.href) desc += ` href="${el.href}"`;
          prompt += desc + "\n";
        }
        prompt += "\n";
      }
    } else {
      prompt += `## No page loaded yet. Start with a goto action.\n\n`;
    }

    prompt += `Respond with the next action(s) as JSON:`;
    return prompt;
  }

  private parseResponse(text: string): PlanResponse {
    let jsonStr = text.trim();
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        thinking: parsed.thinking || "",
        actions: Array.isArray(parsed.actions)
          ? parsed.actions
          : [parsed.actions],
      };
    } catch {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        const parsed = JSON.parse(objMatch[0]);
        return {
          thinking: parsed.thinking || "",
          actions: Array.isArray(parsed.actions)
            ? parsed.actions
            : [parsed.actions],
        };
      }
      return {
        thinking: `Failed to parse LLM response: ${text.slice(0, 200)}`,
        actions: [{ action: "wait", ms: 1000 }],
      };
    }
  }
}
