import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandProps {
  href?: string;
  variant?: "light" | "dark";
  compact?: boolean;
  className?: string;
}

export function Brand({ href = "/dashboard", variant = "light", compact = false, className }: BrandProps) {
  const dark = variant === "dark";
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label="ClinicFlow home"
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-[1.02]",
          dark ? "bg-secondary/20 text-secondary" : "bg-primary text-primary-foreground",
        )}
      >
        <HeartPulse className="h-5 w-5" aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-tight">
          <span className={cn("text-base font-semibold tracking-tight", dark ? "text-sidebar-foreground" : "text-foreground")}>
            ClinicFlow
          </span>
          <span className={cn("text-[11px] font-medium uppercase tracking-[0.14em]", dark ? "text-sidebar-muted" : "text-muted-foreground")}>
            Clinic management
          </span>
        </span>
      ) : null}
    </Link>
  );
}
