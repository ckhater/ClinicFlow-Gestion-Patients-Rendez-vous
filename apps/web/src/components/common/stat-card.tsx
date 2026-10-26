import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/60 text-[#3f6373]",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
} as const;

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  tone?: keyof typeof TONES;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = "primary",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card p-5 shadow-card transition-shadow hover:shadow-raised",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            TONES[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
