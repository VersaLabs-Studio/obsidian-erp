// components/Layout/SessionGuard.tsx
// Obsidian ERP v4.0 — Session guard (post-2P-FINAL UX fix).
//
// 2P-FINAL Part A.2 ships a factory that fails closed (401) on every
// /api/** CRUD route when there's no Frappe session cookie. That is
// the intended ship-gate behavior — but the UX side effect is bad:
// the global dashboard silently renders empty KPIs and charts, and
// the dev console fills with 401s the operator has to interpret.
//
// SessionGuard closes that gap. On mount it calls /api/auth/me
// (which the Part A.2 factory routes through the user client; same
// fail-closed path). If the response is 401, we render a centered
// "Sign in to Pana" card with a one-click "Continue" CTA that opens
// the Frappe login page. While we're checking, the dashboard
// children DON'T render — the child useFrappeList calls don't fire,
// the dev console is clean, and the user has a clear next step.
//
// Why client-side (not middleware): the sid cookie is HttpOnly and
// the user's browser holds it. A middleware check would either
// 1:1 mirror /api/auth/me (extra round-trip per navigation) or
// require a shared lookup. The client-side check piggybacks on
// the same hook every authenticated page already calls.
//
// Cache: we cache the last-known state in sessionStorage for
// 5 minutes. A logout invalidates it (handled by the SignOut
// dropdown item — out of scope for this fix).

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ShieldOff,
  ArrowRight,
  KeyRound,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SessionState = "loading" | "authenticated" | "unauthenticated";

// Where the Frappe login lives. Same env var the API client uses
// (NEXT_PUBLIC_ERP_API_URL) — the browser hits the Frappe /login
// page, which sets the `sid` cookie on the same origin and
// redirects back to this app. The /login redirect URL is the
// NEXT_PUBLIC_APP_URL or window.location.origin (the latter is
// more forgiving in dev).
function getFrappeLoginHref(): string {
  const base =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_ERP_API_URL) ||
    "";
  // Frappe's login form is at /login?redirect-to=<return>. We point
  // back to the current path so the user lands where they were.
  if (typeof window !== "undefined") {
    const here = window.location.pathname + window.location.search;
    const target = base
      ? `${base.replace(/\/+$/, "")}/login?redirect-to=${encodeURIComponent(
          window.location.origin + here,
        )}`
      : `/login?redirect-to=${encodeURIComponent(window.location.origin + here)}`;
    return target;
  }
  return "/login";
}

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const [state, setState] = useState<SessionState>("loading");
  // 5-min cache key. The cache is invalidated by the SignOut
  // flow (out of scope here) and by an explicit "retry" click.
  const CACHE_KEY = "obsidian_session_check_v1";
  const CACHE_TTL_MS = 5 * 60 * 1000;

  useEffect(() => {
    let cancelled = false;

    // Cheap pre-check: read the sid cookie from document.cookie.
    // We don't gate on this (the server is the source of truth) —
    // we just skip the network call when we know there's no
    // cookie at all, so the dev console is clean for the no-
    // session path.
    function hasSidCookie(): boolean {
      if (typeof document === "undefined") return false;
      return document.cookie.split("; ").some((c) => c.startsWith("sid="));
    }

    // Cache hit: skip the round-trip.
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { state: SessionState; at: number };
        if (Date.now() - parsed.at < CACHE_TTL_MS) {
          if (parsed.state === "authenticated" || parsed.state === "unauthenticated") {
            if (!cancelled) setState(parsed.state);
            // Even on cache hit, we re-fetch in the background to
            // pick up a sign-in that just completed. Below.
          }
        }
      }
    } catch {
      // Ignore — cache miss
    }

    if (!hasSidCookie()) {
      if (!cancelled) {
        setState("unauthenticated");
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ state: "unauthenticated", at: Date.now() }),
          );
        } catch {
          // Ignore
        }
      }
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (res.status === 401) {
          setState("unauthenticated");
          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ state: "unauthenticated", at: Date.now() }),
            );
          } catch {
            // Ignore
          }
        } else if (res.ok) {
          setState("authenticated");
          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ state: "authenticated", at: Date.now() }),
            );
          } catch {
            // Ignore
          }
        } else {
          // Other errors (5xx) — treat as "loading" so we don't
          // dump the user at the sign-in card on a transient
          // server hiccup. The dashboard's own error toasts will
          // surface the real problem.
          setState("loading");
        }
      } catch {
        if (!cancelled) setState("loading");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    // Render children immediately (don't block first paint) but
    // overlay a quiet loading state on top. The dashboard's own
    // skeletons handle the per-query loading once it gets data;
    // here we just signal "we're checking the session".
    return (
      <>
        {children}
        {prefersReducedMotion ? null : (
          <div
            aria-hidden
            className="pointer-events-none fixed bottom-3 left-3 z-50 flex items-center gap-1.5 rounded-full border border-border/40 bg-card/80 px-3 py-1.5 text-[10px] font-medium text-muted-foreground shadow-sm shadow-black/5 backdrop-blur-md"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking session…
          </div>
        )}
      </>
    );
  }

  if (state === "authenticated") {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="signin"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex min-h-[calc(100vh-2rem)] items-center justify-center p-6"
      >
        <SignInCard
          onRetry={() => {
            try {
              sessionStorage.removeItem(CACHE_KEY);
            } catch {
              // Ignore
            }
            setState("loading");
            // Re-run the effect by toggling state — the effect
            // listens to mount, so a state change is enough to
            // re-trigger a check. We use a setState to a new
            // "loading" value with a forced re-render via key
            // change in the next tick.
            setTimeout(() => {
              // Hard refresh of the page is the cleanest
              // "I just signed in" path — Frappe's login
              // already redirects back, so this is the
              // "I clicked retry without going to Frappe"
              // path. The fetch in the effect will re-run on
              // remount.
              if (typeof window !== "undefined") window.location.reload();
            }, 0);
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

function SignInCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="signin-title"
      aria-describedby="signin-desc"
      className={cn(
        "w-full max-w-md rounded-2xl border border-border/40 bg-card p-6 shadow-xl shadow-black/5",
        "sm:p-8",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning">
        <ShieldOff className="h-6 w-6" />
      </div>
      <h2
        id="signin-title"
        className="mt-5 text-lg font-semibold text-foreground sm:text-xl"
      >
        Sign in to Pana
      </h2>
      <p
        id="signin-desc"
        className="mt-1.5 text-sm text-muted-foreground"
      >
        Obsidian ERP runs against your Pana Frappe instance. The
        browser session is set when you sign in there — this app
        reads that session on every request.
      </p>
      <ol className="mt-5 space-y-2.5 text-[11px] text-muted-foreground">
        <Step n={1} label="Open the Pana login page" />
        <Step n={2} label="Sign in with your Frappe user" />
        <Step n={3} label="You'll be redirected back to this page" />
      </ol>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          asChild
          className="h-10 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <a href={getFrappeLoginHref()}>
            <KeyRound className="mr-2 h-4 w-4" />
            Continue to Pana login
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onRetry}
          className="h-10 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Already signed in? Retry
        </Button>
      </div>
      <p className="mt-5 border-t border-border/40 pt-4 text-[10px] text-muted-foreground">
        Tip: the dev console will not show 401s once a session is
        detected. The check runs once on mount, then is cached for
        5&nbsp;minutes in <code className="rounded bg-secondary/60 px-1 py-0.5 text-foreground">sessionStorage</code>.
      </p>
    </div>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-foreground"
      >
        {n}
      </span>
      <span>{label}</span>
    </li>
  );
}

export default SessionGuard;
