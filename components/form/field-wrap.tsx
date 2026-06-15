"use client";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

export function FieldWrap({
  auto,
  loading,
  error,
  children,
}: {
  auto?: boolean;
  loading?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative", loading && "animate-pulse")}>
      <div className={cn(error && "[&_*]:border-destructive [&_*]:ring-destructive/20")}>
        {children}
      </div>
      {auto && (
        <span className="pointer-events-none absolute right-2 top-0 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Lock className="h-3 w-3" />
        </span>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-destructive font-medium">{error}</p>
      )}
    </div>
  );
}
