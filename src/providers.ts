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
    let response: any = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    if (typeof response === "string") {
      try { response = JSON.parse(response); } catch {}
    }

    return response?.choices?.[0]?.message?.content ?? "";
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
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [
        { role: "user", content: user },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock ? textBlock.text : "";
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
