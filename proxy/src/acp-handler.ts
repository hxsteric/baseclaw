/**
 * ACP Handler — Agent Commerce Protocol integration for BaseClaw
 *
 * Connects BaseClaw to Virtuals Protocol's ACP network so other agents
 * can discover and hire BaseClaw for:
 *   - Crypto research (web search + AI analysis)
 *   - Code generation and review
 *   - Complex AI reasoning
 *
 * Uses the existing AI pipeline (classifyTask → resolveModel → streamCompletion)
 * to process incoming jobs from other agents.
 */

import { streamCompletion } from "./ai-client.js";
import {
  classifyTask,
  resolveModel,
  getProviderKey,
  type SubscriptionPlan,
} from "./ai-router.js";
import { createSession, addMessage, deleteSession, type Message } from "./session-manager.js";
import { nanoid } from "nanoid";

// ── ENV ──────────────────────────────────────────────────────────────
const ACP_WALLET_PRIVATE_KEY = process.env.ACP_WALLET_PRIVATE_KEY || "";
const ACP_ENTITY_KEY_ID = process.env.ACP_ENTITY_KEY_ID || "";
const ACP_AGENT_WALLET_ADDRESS = process.env.ACP_AGENT_WALLET_ADDRESS || "";
const ACP_RPC_URL = process.env.ACP_RPC_URL || "";
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || "";

// Track ACP status
let acpRunning = false;
let acpClient: any = null;
let jobsProcessed = 0;
let jobsFailed = 0;

/**
 * Start the ACP client and begin listening for incoming jobs.
 * Called once from index.ts on server boot.
 */
export async function startAcp(): Promise<void> {
  // Validate required env vars
  if (!ACP_WALLET_PRIVATE_KEY || !ACP_AGENT_WALLET_ADDRESS) {
    console.log("[ACP] Skipping — missing ACP_WALLET_PRIVATE_KEY or ACP_AGENT_WALLET_ADDRESS");
    return;
  }

  try {
    // Dynamic import — the SDK may not be installed in all environments
    const acpModule = await import("@virtuals-protocol/acp-node");
    const AcpClient = acpModule.default || acpModule.AcpClient;
    const AcpContractClientV2 = acpModule.AcpContractClientV2;

    if (!AcpClient || !AcpContractClientV2) {
      console.error("[ACP] SDK import failed — AcpClient or AcpContractClientV2 not found");
      return;
    }

    console.log("[ACP] Initializing ACP client...");

    const contractClient = await AcpContractClientV2.build(
      ACP_WALLET_PRIVATE_KEY,
      ACP_ENTITY_KEY_ID || undefined,
      ACP_AGENT_WALLET_ADDRESS,
      ACP_RPC_URL || undefined,
    );

    acpClient = new AcpClient({
      acpContractClient: contractClient,

      // Called when another agent sends a job to BaseClaw
      onNewTask: async (job: any) => {
        console.log(`[ACP] New job received: ${job.id || "unknown"}`);
        try {
          await handleJob(job);
        } catch (err) {
          console.error("[ACP] Job handler error:", err);
          jobsFailed++;
          try {
            await job.reject("Internal processing error");
          } catch { /* ignore reject failure */ }
        }
      },

      // Called when a job result is being evaluated
      onEvaluate: async (job: any) => {
        console.log(`[ACP] Job evaluation: ${job.id || "unknown"}`);
        // Auto-accept evaluations — BaseClaw trusts its own output
        try {
          await job.accept("Evaluation accepted");
        } catch (err) {
          console.error("[ACP] Evaluation error:", err);
        }
      },
    });

    await acpClient.init();
    acpRunning = true;
    console.log(`[ACP] BaseClaw agent is live on ACP — wallet: ${ACP_AGENT_WALLET_ADDRESS}`);
  } catch (err) {
    console.error("[ACP] Failed to start:", err);
    acpRunning = false;
  }
}

/**
 * Process an incoming ACP job using BaseClaw's AI pipeline.
 */
async function handleJob(job: any): Promise<void> {
  // Extract the prompt from the job
  const prompt = extractPrompt(job);
  if (!prompt) {
    await job.reject("No prompt provided in job requirements");
    return;
  }

  console.log(`[ACP] Processing job: "${prompt.slice(0, 80)}..."`);

  // Accept the job first
  try {
    await job.accept("BaseClaw is processing your request");
  } catch {
    // Job might auto-accept, continue anyway
  }

  // Create a temporary session for this job
  const sessionId = `acp-${nanoid()}`;
  const plan: SubscriptionPlan = "pro"; // ACP jobs use pro-tier models
  const resolved = resolveModel(prompt, plan, 0, 100);
  const providerKey = getProviderKey(resolved.provider);

  if (!providerKey) {
    console.error(`[ACP] No API key for provider: ${resolved.provider}`);
    await job.deliver("Error: AI service temporarily unavailable");
    jobsFailed++;
    return;
  }

  createSession(sessionId, {
    model: resolved.model,
    provider: resolved.provider,
    apiKey: providerKey,
    keyMode: "managed" as const,
  });

  // Add user message
  const userMsg: Message = {
    id: nanoid(),
    role: "user",
    content: prompt,
    timestamp: Date.now(),
  };
  addMessage(sessionId, userMsg);

  // Stream the AI response (collect full text)
  const result = await new Promise<string>((resolve, reject) => {
    let fullText = "";

    streamCompletion(
      resolved.provider,
      resolved.model,
      providerKey,
      [userMsg],
      {
        onDelta: (text) => {
          fullText += text;
        },
        onFinal: (text) => {
          resolve(text);
        },
        onError: (error) => {
          reject(new Error(error));
        },
      },
      BRAVE_API_KEY || undefined,
    );
  });

  // Clean up session
  deleteSession(sessionId);

  // Deliver the result back to the requesting agent
  console.log(`[ACP] Job complete — ${result.length} chars, model: ${resolved.model}`);
  await job.deliver(result);
  jobsProcessed++;
}

/**
 * Extract the prompt/query from an ACP job object.
 * Job structures can vary — try multiple fields.
 */
function extractPrompt(job: any): string | null {
  // Try common field names
  if (typeof job.requirements === "string") return job.requirements;
  if (job.requirements?.prompt) return job.requirements.prompt;
  if (job.requirements?.query) return job.requirements.query;
  if (job.requirements?.message) return job.requirements.message;
  if (job.requirements?.task) return job.requirements.task;
  if (job.requirements?.description) return job.requirements.description;
  if (typeof job.description === "string") return job.description;
  if (typeof job.prompt === "string") return job.prompt;
  if (typeof job.query === "string") return job.query;
  if (typeof job.message === "string") return job.message;

  // If requirements is an object, stringify it as context
  if (job.requirements && typeof job.requirements === "object") {
    return JSON.stringify(job.requirements);
  }

  return null;
}

/**
 * Get ACP status for the health check endpoint.
 */
export function getAcpStatus(): Record<string, unknown> {
  return {
    running: acpRunning,
    wallet: ACP_AGENT_WALLET_ADDRESS || null,
    jobsProcessed,
    jobsFailed,
    configured: !!(ACP_WALLET_PRIVATE_KEY && ACP_AGENT_WALLET_ADDRESS),
  };
}
