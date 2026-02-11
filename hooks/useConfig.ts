"use client";

import { useCallback } from "react";
import { useApp } from "@/components/Providers";
import type { UserConfig } from "@/lib/types";

export function useConfig() {
  const { config, setConfig, setStep, setActiveAgentId } = useApp();

  const saveConfig = useCallback(
    (cfg: UserConfig) => {
      setConfig(cfg);
      // Don't create agent yet — user saves from chat via "Save Agent" button
      setActiveAgentId(null);
      setStep("loading");
    },
    [setConfig, setStep, setActiveAgentId]
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
