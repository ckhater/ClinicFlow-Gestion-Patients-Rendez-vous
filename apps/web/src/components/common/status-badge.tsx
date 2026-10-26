import type { AppointmentStatus, Role } from "@clinic/shared";
import { CheckCircle2, Clock3, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  AppointmentStatus,
  { variant: BadgeProps["variant"]; Icon: typeof Clock3 }
> = {
  pending: { variant: "warning", Icon: Clock3 },
  confirmed: { variant: "success", Icon: CheckCircle2 },
  cancelled: { variant: "muted", Icon: XCircle },
};

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const { variant, Icon } = STATUS_STYLES[status];
  return (
    <Badge variant={variant} className={cn("gap-1.5", className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Badge variant={role === "admin" ? "default" : "secondary"} className={cn("gap-1.5", className)}>
      {role === "admin" ? (
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      ) : (
        <UserRound className="h-3 w-3" aria-hidden="true" />
      )}
      {ROLE_LABELS[role]}
    </Badge>
  );
}
