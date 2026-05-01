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
  maxSteps: number;
  headless: boolean;
  model: string;
  apiKey: string;
  baseURL: string;
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
