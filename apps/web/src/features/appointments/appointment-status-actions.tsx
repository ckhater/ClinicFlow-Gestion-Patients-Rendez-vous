"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  canTransitionAppointmentStatus,
  type AppointmentStatus,
  type AppointmentWithRelations,
} from "@clinic/shared";
import { useUpdateAppointmentStatus } from "@/features/appointments/hooks";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface AppointmentStatusActionsProps {
  appointment: AppointmentWithRelations;
  onUpdated?: (appointment: AppointmentWithRelations) => void;
  size?: "sm" | "default";
  className?: string;
  compact?: boolean;
}

export function AppointmentStatusActions({
  appointment,
  onUpdated,
  size = "sm",
  className,
  compact = false,
}: AppointmentStatusActionsProps) {
  const mutation = useUpdateAppointmentStatus();
  const [cancelOpen, setCancelOpen] = useState(false);

  const canConfirm = canTransitionAppointmentStatus(appointment.status, "confirmed");
  const canCancel = canTransitionAppointmentStatus(appointment.status, "cancelled");

  if (!canConfirm && !canCancel) return null;

  async function changeStatus(status: AppointmentStatus) {
    try {
      const updated = await mutation.mutateAsync({
        id: appointment.id,
        input: { status },
      });
      toast.success(
        status === "confirmed" ? "Appointment confirmed" : "Appointment cancelled",
        {
          description:
            status === "confirmed"
              ? `${updated.patient.fullName}'s appointment is confirmed.`
              : `${updated.patient.fullName}'s appointment was cancelled.`,
        },
      );
      setCancelOpen(false);
      onUpdated?.(updated);
    } catch (error) {
      toast.error("Could not update appointment", {
        description: getErrorMessage(error),
      });
    }
  }

  const isPending = mutation.isPending;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {canConfirm ? (
        <Button
          type="button"
          size={size}
          variant={compact ? "ghost" : "default"}
          className={compact ? "text-success hover:bg-success/10 hover:text-success" : undefined}
          disabled={isPending}
          onClick={() => void changeStatus("confirmed")}
          aria-label={`Confirm appointment for ${appointment.patient.fullName}`}
        >
          {isPending && mutation.variables?.input.status === "confirmed" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Confirm
        </Button>
      ) : null}

      {canCancel ? (
        <Button
          type="button"
          size={size}
          variant="outline"
          className={cn(
            "text-destructive hover:bg-destructive/5 hover:text-destructive",
            compact && "border-transparent bg-transparent shadow-none",
          )}
          disabled={isPending}
          onClick={() => setCancelOpen(true)}
          aria-label={`Cancel appointment for ${appointment.patient.fullName}`}
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
      ) : null}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this appointment?"
        description={`${appointment.patient.fullName}'s appointment will be marked as cancelled. This cannot be undone.`}
        confirmLabel="Cancel appointment"
        cancelLabel="Keep appointment"
        isPending={isPending}
        onConfirm={() => void changeStatus("cancelled")}
      />
    </div>
  );
}
