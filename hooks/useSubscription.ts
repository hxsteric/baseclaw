"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/components/Providers";
import type { UserProfile, UsageInfo, Plan } from "@/lib/types";
import { APP_URL } from "@/lib/constants";

export function useSubscription() {
  const { auth } = useApp();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile + usage
  const fetchProfile = useCallback(async () => {
    if (!auth.fid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${APP_URL}/api/user?fid=${auth.fid}`);
      if (!res.ok) throw new Error("Failed to fetch profile");

      const data = await res.json();
      setProfile(data.user);
      setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [auth.fid]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Subscribe to a plan
  const subscribe = useCallback(
    async (plan: Plan, txHash: string, walletAddress?: string) => {
      if (!auth.fid) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${APP_URL}/api/subscribe/${plan}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid: auth.fid,
            txHash,
            walletAddress,
          }),
        });

        if (!res.ok) throw new Error("Subscription failed");

        const data = await res.json();
        setProfile(data.user);

        // Refresh usage
        await fetchProfile();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Subscription failed");
      } finally {
        setLoading(false);
      }
    },
    [auth.fid, fetchProfile]
  );

  const isPaid = profile?.plan === "starter" || profile?.plan === "pro" || profile?.plan === "business";

  return {
    profile,
    usage,
    loading,
    error,
    subscribe,
    fetchProfile,
    refresh: fetchProfile,
    isPaid,
  };
}
