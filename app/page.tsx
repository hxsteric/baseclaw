"use client";

import { useApp } from "@/components/Providers";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { MyAgents } from "@/components/MyAgents";
import { ApiKeyForm } from "@/components/ApiKeyForm";
import { ChatInterface } from "@/components/ChatInterface";
import { AgentLoader } from "@/components/AgentLoader";
import { PlanSelector } from "@/components/PlanSelector";
import { PageTransition } from "@/components/PageTransition";

const STEP_ORDER = ["onboarding", "plans", "agents", "setup", "loading", "chat"] as const;

export default function Home() {
  const { step, setStep, prevStep } = useApp();

  const currIdx = STEP_ORDER.indexOf(step as (typeof STEP_ORDER)[number]);
  const prevIdx = STEP_ORDER.indexOf((prevStep || "onboarding") as (typeof STEP_ORDER)[number]);
  const direction = currIdx >= prevIdx ? "forward" : "backward";

  function renderStep() {
    switch (step) {
      case "onboarding":
        return <OnboardingFlow />;
      case "plans":
        return <PlanSelector />;
      case "agents":
        return <MyAgents />;
      case "setup":
        return <ApiKeyForm />;
      case "loading":
        return <AgentLoader onComplete={() => setStep("chat")} onCancel={() => setStep("setup")} />;
      case "chat":
        return <ChatInterface />;
      default:
        return null;
    }
  }

  return (
    <PageTransition pageKey={step} direction={direction}>
      {renderStep()}
    </PageTransition>
  );
}
