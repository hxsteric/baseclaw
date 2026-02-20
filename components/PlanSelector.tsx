"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "./Providers";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS, getBudgetPercent, getRemainingBudget, getTotalBudget, type PlanConfig } from "@/lib/subscription";
import type { Plan } from "@/lib/types";
import { BackButton } from "./BackButton";

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-code text-[9px] text-[var(--text-ghost)]">{label}</span>
        <span className="text-code text-[9px] text-[var(--text-muted)]">{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            background: percent > 90 ? "var(--rose)" : percent > 70 ? "#f59e0b" : "var(--success)",
          }}
        />
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  currentPlan,
  onSelect,
  loading,
}: {
  plan: PlanConfig;
  currentPlan: Plan | undefined;
  onSelect: (plan: Plan) => void;
  loading: boolean;
}) {
  const isCurrent = currentPlan === plan.id;
  const isFree = plan.id === "free";
  const currentTier = currentPlan ? (PLANS[currentPlan]?.tier ?? 0) : 0;
  const isUpgrade = plan.tier > currentTier && currentTier > 0;

  return (
    <div
      className={`relative rounded-2xl p-5 sm:p-6 transition-all duration-300 ${
        plan.popular
          ? "glass border-[rgba(224,137,137,0.3)] border"
          : "glass"
      } ${isCurrent ? "ring-2 ring-[var(--success)]" : ""}`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-code text-[9px] px-3 py-1 rounded-full bg-[var(--rose)] text-white font-semibold tracking-wider">
            POPULAR
          </span>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-heading text-base sm:text-lg">{plan.name}</h3>
          <span className="text-code text-[10px] px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
            {plan.badge}
          </span>
        </div>
        <p className="text-body text-xs text-[var(--text-secondary)]">{plan.description}</p>
      </div>

      <div className="mb-5">
        <span className="text-display text-3xl sm:text-4xl">
          {plan.price === 0 ? "Free" : `$${plan.price}`}
        </span>
        {plan.price > 0 && (
          <span className="text-body text-xs text-[var(--text-muted)] ml-1">/month</span>
        )}
      </div>

      <ul className="space-y-2 mb-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 mt-0.5 text-[var(--success)]"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-body text-xs text-[var(--text-secondary)]">{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="w-full py-3 text-center text-code text-xs text-[var(--success)] rounded-xl glass">
          Current Plan
        </div>
      ) : isFree ? (
        <button
          onClick={() => onSelect("free")}
          className="btn-cute w-full py-3 text-heading text-sm"
        >
          Continue with BYOK
        </button>
      ) : (
        <button
          onClick={() => onSelect(plan.id)}
          disabled={loading}
          className="btn-cute-primary w-full py-3 text-heading text-sm"
        >
          <span className="relative z-10">
            {loading ? "Processing..." : isUpgrade ? `Upgrade — ${plan.price} USDC/mo` : `Subscribe — ${plan.price} USDC/mo`}
          </span>
        </button>
      )}
    </div>
  );
}

function TopUpSlider({
  fid,
  onSuccess,
}: {
  fid: number;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(5);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTopUp() {
    if (!fid || fid === 0) {
      setError("Please sign in first");
      return;
    }

    setPurchasing(true);
    setError(null);

    try {
      const { pay } = await import("@base-org/account");
      const payTo = process.env.NEXT_PUBLIC_REVENUE_WALLET || "";

      if (!payTo) {
        setError("Revenue wallet not configured");
        setPurchasing(false);
        return;
      }

      const payment = await pay({
        amount: amount.toString(),
        to: payTo,
        testnet: process.env.NEXT_PUBLIC_TESTNET === "true",
      });

      const res = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          amount,
          txHash: payment.id,
        }),
      });

      if (!res.ok) throw new Error("Top-up failed");

      onSuccess();
    } catch (err) {
      console.error("Top-up error:", err);
      setError(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <p className="text-label tracking-[0.2em]">Top Up Budget</p>
      <p className="text-body text-xs text-[var(--text-secondary)]">
        Need more Claude Opus usage? Add extra budget instantly.
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-code text-[10px] text-[var(--text-ghost)]">$5</span>
          <span className="text-display text-lg">${amount}</span>
          <span className="text-code text-[10px] text-[var(--text-ghost)]">$20</span>
        </div>

        <input
          type="range"
          min={5}
          max={20}
          step={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--rose) 0%, var(--rose) ${((amount - 5) / 15) * 100}%, var(--bg-tertiary) ${((amount - 5) / 15) * 100}%, var(--bg-tertiary) 100%)`,
          }}
        />

        <button
          onClick={handleTopUp}
          disabled={purchasing}
          className="btn-cute-primary w-full py-3 text-heading text-sm"
        >
          <span className="relative z-10">
            {purchasing ? "Processing..." : `Add $${amount} USDC`}
          </span>
        </button>

        {error && (
          <p className="text-code text-[10px] text-[var(--rose)] text-center">{error}</p>
        )}
      </div>
    </div>
  );
}

export function PlanSelector() {
  const { setStep } = useApp();
  const { profile, usage, loading, refresh } = useSubscription();
  const [subscribing, setSubscribing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState<string | null>(null);

  async function handleSelect(plan: Plan) {
    if (plan === "free") {
      setStep("setup");
      return;
    }

    // Check auth before accepting payment
    if (!profile?.fid) {
      setPaymentError("Please sign in first to subscribe");
      return;
    }

    setSubscribing(true);
    setPaymentError(null);

    try {
      const { pay } = await import("@base-org/account");

      const planConfig = PLANS[plan];
      const payTo = process.env.NEXT_PUBLIC_REVENUE_WALLET || "";

      if (!payTo) {
        setPaymentError("Revenue wallet not configured");
        setSubscribing(false);
        return;
      }

      const payment = await pay({
        amount: planConfig.price.toString(),
        to: payTo,
        testnet: process.env.NEXT_PUBLIC_TESTNET === "true",
      });

      const res = await fetch(`/api/subscribe/${plan}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: profile.fid,
          txHash: payment.id,
          walletAddress: profile.wallet_address,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to activate subscription");
      }

      // Refresh profile so isPaid updates everywhere
      await refresh();

      // Show success popup
      setActivatedPlan(PLANS[plan].name);
      setPaymentSuccess(true);
    } catch (err) {
      console.error("Payment error:", err);
      setPaymentError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSubscribing(false);
    }
  }

  // Calculate budget with extra top-ups
  const costUsd = usage?.cost_usd ?? 0;
  const extraBudget = usage?.extra_budget ?? 0;
  const budgetPercent = profile ? getBudgetPercent(profile.plan, costUsd, extraBudget) : 0;
  const budgetRemaining = profile ? getRemainingBudget(profile.plan, costUsd, extraBudget) : 0;
  const totalBudget = profile ? getTotalBudget(profile.plan, extraBudget) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)]">
      <BackButton onClick={() => setStep("onboarding")} label="Home" />

      <div className="pt-16 sm:pt-20 px-5 sm:px-8 pb-2">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-label tracking-[0.2em] mb-1">Plans</p>
          <h1 className="text-display text-xl sm:text-2xl mb-2">Choose your plan</h1>
          <p className="text-body text-sm text-[var(--text-secondary)]">
            Bring your own key for free, or subscribe for managed AI access
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 sm:px-8 py-6 sm:py-8 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto space-y-4">
          {(Object.values(PLANS) as PlanConfig[]).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={profile?.plan}
              onSelect={handleSelect}
              loading={subscribing || loading}
            />
          ))}
        </div>

        {/* Payment error */}
        {paymentError && (
          <div className="w-full max-w-lg mx-auto mt-4">
            <div className="glass rounded-xl p-3 border border-[rgba(224,137,137,0.3)]">
              <p className="text-code text-[11px] text-[var(--rose)] text-center">{paymentError}</p>
            </div>
          </div>
        )}

        {/* Usage dashboard for paid users */}
        {profile && profile.plan !== "free" && usage && (
          <div className="w-full max-w-lg mx-auto mt-6 space-y-4">
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-label tracking-[0.2em]">Current Usage</p>
                <span className="text-code text-[10px] px-2 py-0.5 rounded bg-[rgba(224,137,137,0.15)] text-[var(--rose)]">
                  {profile.plan}
                </span>
              </div>

              <ProgressBar
                percent={budgetPercent}
                label={`Premium budget: $${costUsd.toFixed(2)} / $${totalBudget.toFixed(0)}${extraBudget > 0 ? ` (incl. $${extraBudget.toFixed(0)} top-up)` : ""}`}
              />

              <div className="flex items-center justify-between text-code text-[9px] text-[var(--text-ghost)]">
                <span>{usage.request_count} requests this month</span>
                <span>${budgetRemaining.toFixed(2)} remaining</span>
              </div>

              {budgetPercent >= 100 && (
                <p className="text-code text-[10px] text-center text-[#f59e0b]">
                  Premium budget used — using free fallback models
                </p>
              )}

              {profile.plan_expires_at && (
                <p className="text-code text-[10px] text-[var(--text-ghost)] text-center">
                  Renews {new Date(profile.plan_expires_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Top-up slider — always visible for paid users */}
            <TopUpSlider
              fid={profile.fid}
              onSuccess={() => refresh()}
            />
          </div>
        )}

        {/* Launch Agent button for paid users */}
        {profile && profile.plan !== "free" && (
          <div className="w-full max-w-lg mx-auto mt-6">
            <button
              onClick={() => setStep("setup")}
              className="btn-cute-primary w-full py-3.5 text-heading text-[15px] tracking-tight"
            >
              <span className="relative z-10">Launch Agent →</span>
            </button>
          </div>
        )}

        {/* Footer note */}
        <div className="w-full max-w-lg mx-auto mt-6 text-center">
          <p className="text-code text-[10px] text-[var(--text-ghost)]">
            Pay in USDC on Base chain via Base Account
          </p>
        </div>
      </div>

      {/* Payment success popup */}
      <AnimatePresence>
        {paymentSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            style={{ background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm glass rounded-2xl p-6 text-center space-y-5"
            >
              {/* Success icon */}
              <div className="flex items-center justify-center mx-auto w-14 h-14 rounded-full bg-[rgba(74,222,128,0.15)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              <div>
                <h3 className="text-heading text-lg mb-1">Payment Successful!</h3>
                <p className="text-body text-sm text-[var(--text-secondary)]">
                  Your <span className="text-[var(--rose)] font-semibold">{activatedPlan}</span> plan is now active.
                </p>
              </div>

              <p className="text-code text-[10px] text-[var(--text-muted)]">
                You can now use managed keys — no API key needed.
              </p>

              <button
                onClick={() => {
                  setPaymentSuccess(false);
                  setStep("setup");
                }}
                className="btn-cute-primary w-full py-3.5 text-heading text-[15px] tracking-tight"
              >
                <span className="relative z-10">Launch Agent →</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
