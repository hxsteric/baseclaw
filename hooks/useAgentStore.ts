"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import type { SavedAgent, ChatMessage, UserConfig } from "@/lib/types";
import { useApp } from "@/components/Providers";

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
  // Initialize directly from localStorage to avoid race conditions
  const [agents, setAgents] = useState<SavedAgent[]>(() => loadAgents());
  const initialized = useRef(false);
  const { activeAgentId } = useApp();

  // Persist agents whenever they change, but skip the initial load
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    persistAgents(agents);
  }, [agents]);

  // Poll localStorage to sync across multiple hook instances within same tab
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = loadAgents();
      setAgents((current) => {
        const currentJson = JSON.stringify(current);
        const storedJson = JSON.stringify(stored);
        if (currentJson !== storedJson) {
          return stored;
        }
        return current;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

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
    persistAgents(updated);
    setAgents(updated);
    return newAgent;
  }, []);

  const removeAgent = useCallback((id: string) => {
    const existing = loadAgents();
    const updated = existing.filter((a) => a.id !== id);
    persistAgents(updated);
    setAgents(updated);
    // Also remove messages
    const allMsgs = loadAllMessages();
    delete allMsgs[id];
    persistAllMessages(allMsgs);
  }, []);

  const toggleAgent = useCallback((id: string) => {
    const existing = loadAgents();
    const updated = existing.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    persistAgents(updated);
    setAgents(updated);
  }, []);

  const updateLastUsed = useCallback((id: string) => {
    const existing = loadAgents();
    const updated = existing.map((a) =>
      a.id === id ? { ...a, lastUsedAt: Date.now() } : a
    );
    persistAgents(updated);
    setAgents(updated);
  }, []);

  const renameAgent = useCallback((id: string, newName: string) => {
    const existing = loadAgents();
    const updated = existing.map((a) =>
      a.id === id ? { ...a, name: newName } : a
    );
    persistAgents(updated);
    setAgents(updated);
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

  // Use activeAgentId from Providers context
  const activeAgent = agents.find((a) => a.id === activeAgentId) || null;

  return {
    agents,
    activeAgent,
    addAgent,
    removeAgent,
    toggleAgent,
    updateLastUsed,
    renameAgent,
    getMessages,
    saveMessages,
    hasAgents,
  };
}
