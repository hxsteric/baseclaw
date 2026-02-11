"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import type { AuthState, UserConfig, AppStep } from "@/lib/types";

interface AppContextType {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  config: UserConfig | null;
  setConfig: (config: UserConfig | null) => void;
  step: AppStep;
  setStep: (step: AppStep) => void;
  prevStep: AppStep | null;
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within Providers");
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [auth, setAuth] = useState<AuthState>({
    fid: null,
    token: null,
    authenticated: false,
  });
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [step, setStepRaw] = useState<AppStep>("loading");
  const [prevStep, setPrevStep] = useState<AppStep | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  function setStep(next: AppStep) {
    setPrevStep(step);
    setStepRaw(next);
  }

  useEffect(() => {
    async function init() {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        sdk.actions.ready();
      } catch {
        // Not in a Farcaster client — continue for dev/testing
      }
      setIsReady(true);
      setStep("onboarding");
    }
    init();
  }, []);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-[var(--rose)] border-t-transparent animate-spin" />
          <p className="text-code text-xs text-[var(--text-muted)]">initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ auth, setAuth, config, setConfig, step, setStep, prevStep, activeAgentId, setActiveAgentId }}>
      {children}
    </AppContext.Provider>
  );
}
