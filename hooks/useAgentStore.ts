"use client";

import { useState, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import type { SavedAgent, ChatMessage, UserConfig } from "@/lib/types";

const AGENTS_KEY = "baseclaw_agents";
const MESSAGES_KEY = "baseclaw_messages";

function loadAgents(): SavedAgent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AGENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistAgents(agents: SavedAgent[]) {
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
}

function loadAllMessages(): Record<string, ChatMessage[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistAllMessages(msgs: Record<string, ChatMessage[]>) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
}

export function useAgentStore() {
  const [agents, setAgents] = useState<SavedAgent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setAgents(loadAgents());
  }, []);

  // Persist agents whenever they change
  useEffect(() => {
    if (agents.length > 0 || loadAgents().length > 0) {
      persistAgents(agents);
    }
  }, [agents]);

  const addAgent = useCallback((config: UserConfig): SavedAgent => {
    const existing = loadAgents();
    const agentNumber = existing.length + 1;
    const newAgent: SavedAgent = {
      id: nanoid(),
      name: `Agent #${agentNumber}`,
      config,
      enabled: true,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };
    const updated = [...existing, newAgent];
    setAgents(updated);
    setActiveAgentId(newAgent.id);
    return newAgent;
  }, []);

  const removeAgent = useCallback((id: string) => {
    setAgents((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      return updated;
    });
    // Also remove messages
    const allMsgs = loadAllMessages();
    delete allMsgs[id];
    persistAllMessages(allMsgs);
  }, []);

  const toggleAgent = useCallback((id: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }, []);

  const updateLastUsed = useCallback((id: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, lastUsedAt: Date.now() } : a))
    );
  }, []);

  const getMessages = useCallback((agentId: string): ChatMessage[] => {
    const all = loadAllMessages();
    return all[agentId] || [];
  }, []);

  const saveMessages = useCallback((agentId: string, messages: ChatMessage[]) => {
    const all = loadAllMessages();
    all[agentId] = messages.filter((m) => !m.streaming);
    persistAllMessages(all);
  }, []);

  const hasAgents = useCallback((): boolean => {
    return loadAgents().length > 0;
  }, []);

  const activeAgent = agents.find((a) => a.id === activeAgentId) || null;

  return {
    agents,
    activeAgentId,
    activeAgent,
    setActiveAgentId,
    addAgent,
    removeAgent,
    toggleAgent,
    updateLastUsed,
    getMessages,
    saveMessages,
    hasAgents,
  };
}
