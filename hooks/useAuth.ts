"use client";

import { useCallback } from "react";
import { useApp } from "@/components/Providers";

export function useAuth() {
  const { auth, setAuth, setStep } = useApp();

  const authenticate = useCallback(async (opts?: { skipNavigation?: boolean }) => {
    try {
      const { sdk } = await import("@farcaster/miniapp-sdk");
      const result = await sdk.quickAuth.getToken();

      if (result?.token) {
        const res = await fetch("/api/auth/verify", {
          headers: { Authorization: `Bearer ${result.token}` },
        });
        const data = await res.json();

        if (data.fid) {
          setAuth({ fid: data.fid, token: result.token, authenticated: true });
          if (!opts?.skipNavigation) setStep("setup");
          return data;
        }
      }
    } catch {
      // Not in Farcaster client — use dev mode
      const devFid = 99999;
      setAuth({ fid: devFid, token: "dev-token", authenticated: true });
      if (!opts?.skipNavigation) setStep("setup");
      return { fid: devFid };
    }
    return null;
  }, [setAuth, setStep]);

  const skip = useCallback(() => {
    setAuth({ fid: 0, token: null, authenticated: false });
    setStep("setup");
  }, [setAuth, setStep]);

  return { ...auth, authenticate, skip };
}
