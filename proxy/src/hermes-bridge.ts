/**
 * Hermes Bridge — Node.js client that communicates with the Hermes Agent
 * Python subprocess via stdin/stdout JSON-RPC.
 *
 * Spawns `python3 proxy/hermes/bridge.py` and manages the lifecycle.
 */

import { ChildProcess, spawn } from "child_process";
import { createInterface, Interface } from "readline";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Stability Constants ─────────────────────────────────────────────

const READY_TIMEOUT_MS = 10_000;          // 10s for Python to send "ready"
const CHAT_TIMEOUT_MS = 120_000;          // 120s default per chat request
const HEARTBEAT_INTERVAL_MS = 15_000;     // 15s between pings
const HEARTBEAT_TIMEOUT_MS = 5_000;       // 5s to receive pong
const MAX_RESTART_ATTEMPTS = 5;
const BASE_RESTART_DELAY_MS = 1_000;      // Exponential backoff: 1s, 2s, 4s, 8s, 16s

// ─── Timeout Utility ─────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[Hermes] Timeout: ${label} exceeded ${ms}ms`));
    }, ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// ─── Types ──────────────────────────────────────────────────────────

export interface HermesConfig {
  provider?: string;
  model?: string;
  apiKey?: string;
  toolsets?: string[];
  maxIterations?: number;
}

export interface HermesCallbacks {
  onDelta?: (text: string) => void;
  onToolStart?: (toolName: string, input: string) => void;
  onToolEnd?: (toolName: string, output: string) => void;
  onThinking?: () => void;
  onStep?: (iteration: number, tools: string[]) => void;
  onFinal?: (text: string, apiCalls: number, completed: boolean) => void;
  onError?: (error: string) => void;
}

interface BridgeMessage {
  id: number;
  type: string;
  text?: string;
  name?: string;
  input?: string;
  output?: string;
  error?: string;
  api_calls?: number;
  completed?: boolean;
  iteration?: number;
  tools?: string[];
  config?: Record<string, unknown>;
  ts?: number;
}

// ─── Bridge Class ───────────────────────────────────────────────────

export class HermesBridge {
  private process: ChildProcess | null = null;
  private readline: Interface | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, HermesCallbacks>();
  private ready = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private hermesPath: string;

  // Stability fields
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastPongTime = 0;
  private restartAttempts = 0;
  private intentionalClose = false;

  constructor() {
    // Hermes is installed at /opt/hermes in Docker, or use env var
    this.hermesPath = process.env.HERMES_PATH || "/opt/hermes";

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this.spawn();
  }

  private spawn(): void {
    const bridgeScript = path.resolve(__dirname, "../hermes/bridge.py");
    const pythonBin = process.env.PYTHON_BIN || "python3";

    console.log(`[Hermes] Spawning bridge: ${pythonBin} ${bridgeScript}`);

    this.process = spawn(pythonBin, [bridgeScript], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        HERMES_PATH: this.hermesPath,
        PYTHONUNBUFFERED: "1",
      },
    });

    // Read stdout line by line
    this.readline = createInterface({
      input: this.process.stdout!,
      crlfDelay: Infinity,
    });

    this.readline.on("line", (line: string) => {
      this.handleLine(line);
    });

    // Log stderr
    this.process.stderr?.on("data", (data: Buffer) => {
      console.error(`[Hermes stderr] ${data.toString().trim()}`);
    });

    // Handle exit — auto-restart with backoff
    this.process.on("exit", (code: number | null) => {
      console.log(`[Hermes] Process exited with code ${code}`);
      this.ready = false;
      this.process = null;
      this.readline = null;
      this.stopHeartbeat();

      // Reject all pending requests
      for (const [_id, callbacks] of this.pendingRequests) {
        callbacks.onError?.(`Hermes process exited unexpectedly (code ${code})`);
      }
      this.pendingRequests.clear();

      // Auto-restart with exponential backoff (unless intentionally closed)
      if (!this.intentionalClose && this.restartAttempts < MAX_RESTART_ATTEMPTS) {
        const delay = BASE_RESTART_DELAY_MS * Math.pow(2, this.restartAttempts);
        this.restartAttempts++;
        console.log(`[Hermes] Auto-restart attempt ${this.restartAttempts}/${MAX_RESTART_ATTEMPTS} in ${delay}ms`);
        setTimeout(() => {
          this.readyPromise = new Promise((resolve) => {
            this.readyResolve = resolve;
          });
          this.spawn();
        }, delay);
      } else if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
        console.error(`[Hermes] Max restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Bridge is down — falling back to basic chat.`);
      }
    });

    this.process.on("error", (err: Error) => {
      console.error(`[Hermes] Process error:`, err.message);
    });
  }

  private handleLine(line: string): void {
    let msg: BridgeMessage;
    try {
      msg = JSON.parse(line);
    } catch {
      console.warn(`[Hermes] Non-JSON output: ${line}`);
      return;
    }

    // Handle ready signal
    if (msg.type === "ready") {
      console.log("[Hermes] Bridge is ready");
      this.ready = true;
      this.restartAttempts = 0; // Reset backoff on successful startup
      this.readyResolve();
      this.startHeartbeat();
      return;
    }

    // Handle heartbeat pong
    if (msg.type === "pong") {
      this.lastPongTime = Date.now();
      return;
    }

    const callbacks = this.pendingRequests.get(msg.id);
    if (!callbacks) return;

    switch (msg.type) {
      case "delta":
        callbacks.onDelta?.(msg.text || "");
        break;

      case "tool_start":
        callbacks.onToolStart?.(msg.name || "unknown", msg.input || "");
        break;

      case "tool_end":
        callbacks.onToolEnd?.(msg.name || "unknown", msg.output || "");
        break;

      case "thinking":
        callbacks.onThinking?.();
        break;

      case "step":
        callbacks.onStep?.(msg.iteration || 0, msg.tools || []);
        break;

      case "final":
        callbacks.onFinal?.(msg.text || "", msg.api_calls || 0, msg.completed || false);
        this.pendingRequests.delete(msg.id);
        break;

      case "error":
        callbacks.onError?.(msg.error || "Unknown error");
        this.pendingRequests.delete(msg.id);
        break;

      case "configured":
        // Config acknowledgment — just clean up
        this.pendingRequests.delete(msg.id);
        break;
    }
  }

  private send(method: string, params: Record<string, unknown>): number {
    const id = ++this.requestId;
    const message = JSON.stringify({ id, method, params }) + "\n";

    if (!this.process?.stdin?.writable) {
      console.error("[Hermes] Cannot write to bridge — process not running");
      return id;
    }

    this.process.stdin.write(message);
    return id;
  }

  // ─── Heartbeat ──────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastPongTime = Date.now();

    this.heartbeatTimer = setInterval(() => {
      if (!this.process?.stdin?.writable) {
        this.stopHeartbeat();
        return;
      }

      this.send("ping", { ts: Date.now() });

      // Check if pong came back within timeout
      setTimeout(() => {
        const elapsed = Date.now() - this.lastPongTime;
        if (elapsed > HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS) {
          console.error(`[Hermes] Heartbeat timeout (${elapsed}ms since last pong). Killing process.`);
          this.stopHeartbeat();
          this.process?.kill();
          // Exit handler will trigger auto-restart
        }
      }, HEARTBEAT_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────

  /**
   * Wait for the bridge process to be ready (with 10s timeout).
   */
  async waitReady(): Promise<void> {
    if (this.ready) return;
    await withTimeout(this.readyPromise, READY_TIMEOUT_MS, "waitReady");
  }

  /**
   * Send a message to the Hermes Agent and receive streaming responses (with 120s timeout).
   */
  async chat(
    sessionId: string,
    message: string,
    config: HermesConfig,
    callbacks: HermesCallbacks
  ): Promise<void> {
    await this.waitReady();

    const id = this.send("chat", {
      message,
      session_id: sessionId,
      provider: config.provider,
      model: config.model,
      api_key: config.apiKey,
      toolsets: config.toolsets || ["web"],
      max_iterations: config.maxIterations || 30,
    });

    // Register callbacks for this request, wrapped with resolve/reject
    const chatPromise = new Promise<void>((resolve, reject) => {
      const wrappedCallbacks: HermesCallbacks = {
        ...callbacks,
        onFinal: (text, apiCalls, completed) => {
          callbacks.onFinal?.(text, apiCalls, completed);
          resolve();
        },
        onError: (error) => {
          callbacks.onError?.(error);
          reject(new Error(error));
        },
      };
      this.pendingRequests.set(id, wrappedCallbacks);
    });

    try {
      await withTimeout(chatPromise, CHAT_TIMEOUT_MS, `chat(id=${id})`);
    } catch (err) {
      // Clean up pending request on timeout
      this.pendingRequests.delete(id);
      throw err;
    }
  }

  /**
   * Update the bridge's default configuration.
   */
  configure(config: HermesConfig): void {
    const id = this.send("configure", {
      provider: config.provider,
      model: config.model,
      api_key: config.apiKey,
      toolsets: config.toolsets,
      max_iterations: config.maxIterations,
    });
    // Register a no-op callback to clean up
    this.pendingRequests.set(id, {});
  }

  /**
   * Check if the bridge process is alive and ready.
   */
  isReady(): boolean {
    return this.ready && this.process !== null;
  }

  /**
   * Get health status for diagnostics.
   */
  getHealthStatus(): { ready: boolean; pid: number | null; restartAttempts: number; lastPongMs: number } {
    return {
      ready: this.ready,
      pid: this.process?.pid ?? null,
      restartAttempts: this.restartAttempts,
      lastPongMs: this.lastPongTime ? Date.now() - this.lastPongTime : -1,
    };
  }

  /**
   * Restart the bridge if it crashed.
   */
  restart(): void {
    this.intentionalClose = true;
    this.close();
    setTimeout(() => {
      this.intentionalClose = false;
      this.restartAttempts = 0; // Manual restart resets the counter
      this.readyPromise = new Promise((resolve) => {
        this.readyResolve = resolve;
      });
      this.spawn();
    }, 500);
  }

  /**
   * Gracefully shut down the bridge.
   */
  close(): void {
    this.intentionalClose = true;
    this.stopHeartbeat();
    if (this.process) {
      try {
        this.send("shutdown", {});
      } catch {
        // Process may already be dead
      }
      setTimeout(() => {
        this.process?.kill();
        this.process = null;
      }, 2000);
    }
    this.readline?.close();
    this.readline = null;
    this.ready = false;
  }
}

// ─── Singleton Manager ──────────────────────────────────────────────

let _bridge: HermesBridge | null = null;

/**
 * Get or create the global Hermes bridge instance.
 * Automatically restarts if the bridge crashed.
 */
export function getHermesBridge(): HermesBridge {
  if (!_bridge || !_bridge.isReady()) {
    if (_bridge) {
      console.log("[Hermes] Bridge not ready — restarting");
      _bridge.restart();
    } else {
      _bridge = new HermesBridge();
    }
  }
  return _bridge;
}

/**
 * Check if Hermes is available (Python + Hermes Agent installed).
 */
export function isHermesAvailable(): boolean {
  const hermesPath = process.env.HERMES_PATH || "/opt/hermes";
  const checkPath = path.join(hermesPath, "run_agent.py");
  try {
    const dirExists = fs.existsSync(hermesPath);
    const fileExists = fs.existsSync(checkPath);
    console.log(`[Hermes] Check: HERMES_PATH=${hermesPath}, dir exists=${dirExists}, run_agent.py exists=${fileExists}`);
    if (dirExists && !fileExists) {
      try {
        const contents = fs.readdirSync(hermesPath).slice(0, 20);
        console.log(`[Hermes] Directory contents: ${contents.join(", ")}`);
      } catch (e: unknown) {
        console.log(`[Hermes] Cannot list dir: ${e}`);
      }
    }
    return fileExists;
  } catch (e) {
    console.error(`[Hermes] Availability check error:`, e);
    return false;
  }
}
