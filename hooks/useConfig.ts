"use client";

import { useCallback } from "react";
import { useApp } from "@/components/Providers";
import { useAgentStore } from "@/hooks/useAgentStore";
import type { UserConfig } from "@/lib/types";

export function useConfig() {
  const { config, setConfig, setStep, setActiveAgentId } = useApp();
  const { addAgent } = useAgentStore();

  const saveConfig = useCallback(
    (cfg: UserConfig) => {
      setConfig(cfg);
      const agent = addAgent(cfg);
      setActiveAgentId(agent.id);
      setStep("loading");
    },
    [setConfig, setStep, addAgent, setActiveAgentId]
  );

  const clearConfig = useCallback(() => {
    setConfig(null);
    setStep("agents");
  }, [setConfig, setStep]);

  const goHome = useCallback(() => {
    setConfig(null);
    setStep("onboarding");
  }, [setConfig, setStep]);

  return { config, saveConfig, clearConfig, goHome };
}
