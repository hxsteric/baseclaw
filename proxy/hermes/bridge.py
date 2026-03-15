#!/usr/bin/env python3
"""
Hermes Agent Bridge — JSON-RPC interface between Node.js proxy and Hermes Agent.

Reads JSON commands from stdin, runs Hermes Agent conversations, and outputs
JSON responses to stdout. Designed to be spawned as a child process by the
Node.js proxy.

Protocol:
  Input (stdin):  One JSON object per line
    {"id": 1, "method": "chat", "params": {"message": "...", "session_id": "...", "provider": "...", "model": "...", "api_key": "..."}}
    {"id": 2, "method": "configure", "params": {"provider": "...", "model": "...", "api_key": "..."}}
    {"id": 3, "method": "shutdown", "params": {}}

  Output (stdout): One JSON object per line
    {"id": 1, "type": "delta", "text": "partial response..."}
    {"id": 1, "type": "tool_start", "name": "web_search", "input": "query..."}
    {"id": 1, "type": "tool_end", "name": "web_search", "output": "results..."}
    {"id": 1, "type": "thinking", "text": "reasoning..."}
    {"id": 1, "type": "final", "text": "complete response", "api_calls": 3, "completed": true}
    {"id": 1, "type": "error", "error": "error message"}
"""

import sys
import os
import json
import traceback
from pathlib import Path

# Add Hermes Agent to path
HERMES_PATH = os.environ.get("HERMES_PATH", "/opt/hermes")
if os.path.isdir(HERMES_PATH):
    sys.path.insert(0, HERMES_PATH)

# Globals
_agent_cache = {}  # session_id -> AIAgent instance
_session_db = None
_default_config = {
    "model": "anthropic/claude-sonnet-4-20250514",
    "api_key": None,
    "base_url": "https://openrouter.ai/api/v1",
    "provider": "openrouter",
    "toolsets": ["web"],
    "max_iterations": 30,
}


def emit(request_id, msg_type, **kwargs):
    """Write a JSON line to stdout for the Node.js bridge to read."""
    payload = {"id": request_id, "type": msg_type, **kwargs}
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()


def resolve_provider_config(params):
    """Map BaseClaw provider/model/apiKey to Hermes AIAgent constructor args."""
    provider = params.get("provider", "openrouter")
    model = params.get("model", _default_config["model"])
    api_key = params.get("api_key") or params.get("apiKey")

    # Map BaseClaw providers to Hermes base_url/api_mode
    provider_map = {
        "anthropic": {
            "base_url": "https://api.anthropic.com/v1",
            "api_mode": "anthropic_messages",
            "env_key": "ANTHROPIC_API_KEY",
        },
        "openai": {
            "base_url": "https://api.openai.com/v1",
            "api_mode": "chat_completions",
            "env_key": "OPENAI_API_KEY",
        },
        "openrouter": {
            "base_url": "https://openrouter.ai/api/v1",
            "api_mode": "chat_completions",
            "env_key": "OPENROUTER_API_KEY",
        },
        "venice": {
            "base_url": "https://api.venice.ai/api/v1",
            "api_mode": "chat_completions",
            "env_key": "VENICE_API_KEY",
        },
        "kimi": {
            "base_url": "https://api.moonshot.cn/v1",
            "api_mode": "chat_completions",
            "env_key": "KIMI_API_KEY",
        },
    }

    config = provider_map.get(provider, provider_map["openrouter"])
    resolved_key = api_key or os.environ.get(config["env_key"], "")

    return {
        "base_url": config["base_url"],
        "api_key": resolved_key,
        "api_mode": config.get("api_mode", "chat_completions"),
        "model": model,
    }


def get_or_create_agent(session_id, params):
    """Get an existing agent or create a new one for this session."""
    global _session_db

    if session_id in _agent_cache:
        return _agent_cache[session_id]

    try:
        from run_agent import AIAgent
        from hermes_state import SessionDB
    except ImportError as e:
        raise ImportError(
            f"Hermes Agent not found at {HERMES_PATH}. "
            f"Ensure Hermes is installed: {e}"
        )

    if _session_db is None:
        db_path = Path(os.environ.get("HERMES_DB_PATH", os.path.expanduser("~/.hermes/state.db")))
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _session_db = SessionDB(db_path)

    provider_config = resolve_provider_config(params)
    toolsets = params.get("toolsets", _default_config["toolsets"])

    agent = AIAgent(
        base_url=provider_config["base_url"],
        api_key=provider_config["api_key"],
        api_mode=provider_config["api_mode"],
        model=provider_config["model"],
        max_iterations=params.get("max_iterations", _default_config["max_iterations"]),
        enabled_toolsets=toolsets,
        session_id=session_id,
        session_db=_session_db,
        platform="baseclaw",
        quiet_mode=True,
        ephemeral_system_prompt=(
            "You are BaseClaw, an expert crypto and web3 AI agent built on the Base ecosystem. "
            "You have full agent capabilities: web search, code execution, file operations, and more. "
            "Use your tools proactively to research, analyze, and help users with crypto, DeFi, NFTs, "
            "and blockchain topics. Always search for current data — never guess prices or metrics. "
            "Base chain, Virtuals Protocol, and Farcaster are your home ecosystem."
        ),
    )

    _agent_cache[session_id] = agent
    return agent


def handle_chat(request_id, params):
    """Run a conversation with the Hermes Agent."""
    message = params.get("message", "")
    session_id = params.get("session_id", "default")

    if not message:
        emit(request_id, "error", error="Empty message")
        return

    try:
        agent = get_or_create_agent(session_id, params)
    except ImportError as e:
        emit(request_id, "error", error=str(e))
        return
    except Exception as e:
        emit(request_id, "error", error=f"Agent creation failed: {e}")
        return

    # Streaming callbacks
    def on_delta(text_delta):
        emit(request_id, "delta", text=text_delta)

    def on_tool_progress(tool_name, args_preview):
        emit(request_id, "tool_start", name=tool_name, input=args_preview[:500])

    def on_thinking():
        emit(request_id, "thinking", text="")

    def on_step(iteration, tool_names):
        if tool_names:
            emit(request_id, "step", iteration=iteration, tools=tool_names)

    try:
        # Load conversation history from session DB
        history = None
        if _session_db:
            try:
                history = _session_db.get_messages(session_id)
            except Exception:
                pass  # First message — no history yet

        result = agent.run_conversation(
            user_message=message,
            conversation_history=history,
            stream_callback=on_delta,
        )

        final_text = result.get("final_response", "")
        emit(
            request_id,
            "final",
            text=final_text or "(no response)",
            api_calls=result.get("api_calls", 0),
            completed=result.get("completed", False),
        )

    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        emit(request_id, "error", error=f"Agent error: {str(e)}")


def handle_configure(request_id, params):
    """Update default configuration."""
    global _default_config
    for key in ["model", "api_key", "base_url", "provider", "toolsets", "max_iterations"]:
        if key in params:
            _default_config[key] = params[key]
    emit(request_id, "configured", config=_default_config)


def handle_shutdown(request_id, _params):
    """Clean shutdown."""
    emit(request_id, "shutdown", text="Bridge shutting down")
    sys.exit(0)


def main():
    """Main loop: read JSON commands from stdin, dispatch to handlers."""
    emit(0, "ready", text="Hermes bridge ready")

    handlers = {
        "chat": handle_chat,
        "configure": handle_configure,
        "shutdown": handle_shutdown,
    }

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError as e:
            emit(0, "error", error=f"Invalid JSON: {e}")
            continue

        request_id = request.get("id", 0)
        method = request.get("method", "")
        params = request.get("params", {})

        handler = handlers.get(method)
        if handler:
            try:
                handler(request_id, params)
            except Exception as e:
                traceback.print_exc(file=sys.stderr)
                emit(request_id, "error", error=f"Handler error: {str(e)}")
        else:
            emit(request_id, "error", error=f"Unknown method: {method}")


if __name__ == "__main__":
    main()
