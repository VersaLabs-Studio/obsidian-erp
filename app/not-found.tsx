// app/not-found.tsx
// Obsidian ERP v4.0 — Global 404 page (2Q Part 4 / F-A3).
//
// Live E2E finding: navigating to a non-existent route rendered the
// authenticated Layout's sidebar + topbar around a flat "404 Not Found",
// which looked broken. The fix is this bare-shell 404 — a premium
// centered state with "Go home" and "Sign in" actions, and no
// authenticated chrome.
//
// LIMITATION (honest reporting, per the MESH contract rule 4 "guardrails
// + KNOWN GAPS"): a truly bare shell that bypasses the Layout requires
// moving the Layout wrapping into a route group (app/(main)/layout.tsx)
// and relocating all 60+ pages. That refactor is deferred to 4.x. The
// current behavior:
//   - The page renders inside the Layout (sidebar + topbar visible).
//   - The `useLayoutEffect` below adds a `is-not-found` class to the
//     <html> element synchronously after mount, BEFORE paint.
//   - The CSS in `app/globals.css` hides the Layout's <aside> and
//     <header> when `html.is-not-found` is set, so the user sees a
//     clean centered 404. There is a < 1 frame visual flash on first
//     mount (imperceptible in practice).

"use client";

import Link from "next/link";
import { useLayoutEffect } from "react";
import { Compass, Home, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  // Synchronously toggle the bare-shell class before the first paint.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("is-not-found");
    return () => {
      root.classList.remove("is-not-found");
    };
  }, []);

  return (
    <div
      role="alert"
      data-testid="not-found"
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6"
    >
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-7 w-7" />
        </div>
        <h1 className="text-6xl font-extrabold tracking-tight text-foreground">
          404
        </h1>
        <p className="mt-2 text-base font-semibold text-foreground">
          We can't find that page
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The page you're looking for has moved, been deleted, or never
          existed. Check the URL, or head back to a known surface.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/dashboard">
              <Home className="h-3.5 w-3.5" /> Go home
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/login">
              <LogIn className="h-3.5 w-3.5" /> Sign in
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
