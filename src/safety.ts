import { AgentAction, AgentConfig, StepResult } from "./types";

/**
 * Safety guards: max steps, loop detection, error retry.
 */
export class SafetyGuard {
  private config: AgentConfig;
  private actionHistory: string[] = [];
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 3;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /** Check if we've hit the step limit. */
  isMaxStepsReached(currentStep: number): boolean {
    return currentStep >= this.config.maxSteps;
  }

  /** Record an action for loop detection. */
  recordAction(action: AgentAction): void {
    this.actionHistory.push(JSON.stringify(action));
  }

  /** Detect if agent is stuck in a loop (same 3-action sequence repeated). */
  isLooping(): boolean {
    const history = this.actionHistory;
    if (history.length < 6) return false;

    // Check if the last 6 actions are two repetitions of the same 3-action block
    const recent = history.slice(-6);
    const firstHalf = recent.slice(0, 3).join("|");
    const secondHalf = recent.slice(3, 6).join("|");
    return firstHalf === secondHalf;
  }

  /** Record a step result for error tracking. */
  recordStep(result: StepResult): void {
    if (result.success) {
      this.consecutiveErrors = 0;
    } else {
      this.consecutiveErrors++;
    }
  }

  /** Check if too many consecutive errors occurred. */
  isTooManyErrors(): boolean {
    return this.consecutiveErrors >= this.maxConsecutiveErrors;
  }

  /** Pre-execution safety check. Returns an error message if unsafe, null if OK. */
  check(stepNumber: number): string | null {
    if (this.isMaxStepsReached(stepNumber)) {
      return `Maximum steps (${this.config.maxSteps}) reached. Stopping.`;
    }
    if (this.isLooping()) {
      return "Detected repeated action loop. Stopping to prevent infinite cycle.";
    }
    if (this.isTooManyErrors()) {
      return `${this.maxConsecutiveErrors} consecutive errors. Stopping.`;
    }
    return null;
  }

  getStats() {
    return {
      totalActions: this.actionHistory.length,
      consecutiveErrors: this.consecutiveErrors,
    };
  }
}
