/**
 * Core types for the AI Web Agent framework.
 */

// ── Actions ──────────────────────────────────────────────────────────────────

export type ActionType = "goto" | "click" | "type" | "wait" | "extract" | "scroll" | "done";

export interface GotoAction {
  action: "goto";
  url: string;
  reason?: string;
}

export interface ClickAction {
  action: "click";
  selector: string;
  reason?: string;
}

export interface TypeAction {
  action: "type";
  selector: string;
  text: string;
  reason?: string;
}

export interface WaitAction {
  action: "wait";
  ms?: number;
  selector?: string;
  reason?: string;
}

export interface ExtractAction {
  action: "extract";
  selector?: string;
  attribute?: string;
  reason?: string;
}

export interface ScrollAction {
  action: "scroll";
  direction: "up" | "down";
  amount?: number;
  reason?: string;
}

export interface DoneAction {
  action: "done";
  summary: string;
  extractedData?: string;
}

export type AgentAction =
  | GotoAction
  | ClickAction
  | TypeAction
  | WaitAction
  | ExtractAction
  | ScrollAction
  | DoneAction;

// ── LLM Provider ─────────────────────────────────────────────────────────────

export type ProviderType = "openai" | "anthropic";

export interface LLMProvider {
  chat(system: string, user: string, maxTokens: number): Promise<string>;
}

// ── Planner ──────────────────────────────────────────────────────────────────

export interface PlanResponse {
  thinking: string;
  actions: AgentAction[];
}

// ── Observer ─────────────────────────────────────────────────────────────────

export interface PageObservation {
  url: string;
  title: string;
  screenshotBase64: string;
  textContent: string;
  interactiveElements: InteractiveElement[];
}

export interface InteractiveElement {
  tag: string;
  selector: string;
  text: string;
  type?: string;
  href?: string;
  placeholder?: string;
}

// ── Executor ─────────────────────────────────────────────────────────────────

export interface StepResult {
  success: boolean;
  action: AgentAction;
  observation: PageObservation;
  error?: string;
  extractedData?: string;
}

// ── Agent ────────────────────────────────────────────────────────────────────

export interface AgentConfig {
  provider: ProviderType;
  maxSteps: number;
  headless: boolean;
  model: string;
  apiKey: string;
  baseURL: string;
  anthropicApiKey?: string;
  screenshotDir?: string;
  verbose: boolean;
}

export interface AgentRunResult {
  success: boolean;
  steps: StepResult[];
  summary: string;
  extractedData: string[];
  totalSteps: number;
  error?: string;
}

export interface AgentEvents {
  onLog?: (message: string) => void;
  onScreenshot?: (stepNumber: number, base64: string) => void;
  onStep?: (stepNumber: number, result: StepResult) => void;
  onResult?: (result: AgentRunResult) => void;
}
