import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { AgentConfig, LLMProvider } from "./types";

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL: string, model: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  async chat(system: string, user: string, maxTokens: number): Promise<string> {
    let response: any;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
    } catch (err: any) {
      throw new Error(`OpenAI API error: ${err.message || err}`);
    }

    if (typeof response === "string") {
      if (response.includes("<!doctype") || response.includes("<html")) {
        throw new Error(
          `API returned HTML page instead of JSON. Your Base URL is likely wrong — it should end with /v1 (e.g. https://api.openai.com/v1). Current base URL: ${this.client.baseURL}`
        );
      }
      try { response = JSON.parse(response); } catch {}
    }

    // Try multiple response formats (some relays differ)
    const text =
      response?.choices?.[0]?.message?.content ??
      response?.choices?.[0]?.text ??
      response?.data?.choices?.[0]?.message?.content ??
      response?.result ??
      "";

    if (!text) {
      const raw = typeof response === "string" ? response : JSON.stringify(response);
      if (raw.includes("<!doctype") || raw.includes("<html")) {
        throw new Error(
          `API returned HTML instead of JSON. Check your Base URL (should end with /v1, e.g. https://api.openai.com/v1)`
        );
      }
      throw new Error(`OpenAI returned empty response. Raw: ${raw.slice(0, 300)}`);
    }
    return text;
  }
}

class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(system: string, user: string, maxTokens: number): Promise<string> {
    let response;
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: [
          { role: "user", content: user },
        ],
      });
    } catch (err: any) {
      throw new Error(`Anthropic API error: ${err.message || err}`);
    }

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock ? textBlock.text : "";
    if (!text) {
      throw new Error("Anthropic returned empty response");
    }
    return text;
  }
}

export function createProvider(config: AgentConfig): LLMProvider {
  switch (config.provider) {
    case "anthropic":
      if (!config.anthropicApiKey) {
        throw new Error("ANTHROPIC_API_KEY is required when PROVIDER=anthropic");
      }
      return new AnthropicProvider(config.anthropicApiKey, config.model);
    case "openai":
    default:
      return new OpenAIProvider(config.apiKey, config.baseURL, config.model);
  }
}
