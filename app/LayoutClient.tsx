"use client";

import "@/app/globals.css";
import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Layout from "@/components/Layout/Layout";
import { SessionGuard } from "@/components/Layout/SessionGuard";
import { Toaster } from "sonner";
import { getQueryClient } from "@/lib/query-client";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/lib/theme-context";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-pulse space-y-4 w-full max-w-3xl px-4">
        <div className="h-12 bg-secondary/50 rounded-full" />
        <div className="h-64 bg-secondary/30 rounded-3xl" />
      </div>
    </div>
  );
}

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Suspense fallback={<LoadingFallback />}>
            {/* SessionGuard (post-2P-FINAL UX fix) — when there's no
                Frappe sid cookie, every CRUD route 401s (correct
                ship-gate behavior). Without this guard, the global
                dashboard silently renders empty KPIs and the dev
                console fills with 401s. The guard runs /api/auth/me
                on mount, shows a sign-in card on 401, and only then
                renders the children. Cached 5 min in sessionStorage. */}
            <SessionGuard>
              <Layout>{children}</Layout>
            </SessionGuard>
          </Suspense>
        </ToastProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
      <Toaster
        position="top-right"
        richColors
        closeButton
        theme="system"
        toastOptions={{
          style: {
            fontSize: "13px",
          },
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton:
              "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton:
              "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          },
        }}
      />
    </ThemeProvider>
  );
}
