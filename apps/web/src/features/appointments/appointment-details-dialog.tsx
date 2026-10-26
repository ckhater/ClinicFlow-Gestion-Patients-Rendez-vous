"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  CalendarClock,
  ClipboardList,
  Clock3,
  ExternalLink,
  Pencil,
  Phone,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { AppointmentWithRelations } from "@clinic/shared";
import { AppointmentStatusActions } from "@/features/appointments/appointment-status-actions";
import { useDeleteAppointment } from "@/features/appointments/hooks";
import { useAuth } from "@/features/auth/auth-provider";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getErrorMessage } from "@/lib/api-client";
import {
  formatClinicDate,
  formatClinicDateTime,
  formatClinicTime,
  formatDateOnly,
  initials,
} from "@/lib/format";

interface AppointmentDetailsDialogProps {
  appointment: AppointmentWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (appointment: AppointmentWithRelations) => void;
  onEdit?: (appointment: AppointmentWithRelations) => void;
  onDeleted?: (id: string) => void;
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarClock;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary/40 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onUpdated,
  onEdit,
  onDeleted,
}: AppointmentDetailsDialogProps) {
  const { user } = useAuth();
  const deleteMutation = useDeleteAppointment();
  const [current, setCurrent] = useState<AppointmentWithRelations | null>(appointment);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    setCurrent(appointment);
  }, [appointment]);

  if (!current) return null;

  const isPast = new Date(current.appointmentDate).getTime() < Date.now();
  const canEdit = current.status !== "cancelled" && !isPast;
  const canArchive = user?.role === "admin";

  async function archiveAppointment() {
    if (!current) return;
    try {
      await deleteMutation.mutateAsync(current.id);
      toast.success("Appointment archived", {
        description: `${current.patient.fullName}'s appointment was removed from the schedule.`,
      });
      setArchiveOpen(false);
      onOpenChange(false);
      onDeleted?.(current.id);
    } catch (error) {
      toast.error("Could not archive appointment", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle>Appointment details</DialogTitle>
            <StatusBadge status={current.status} />
          </div>
          <DialogDescription>
            Scheduled for {formatClinicDate(current.appointmentDate)} at{" "}
            {formatClinicTime(current.appointmentDate)}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarFallback>{initials(current.patient.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link
                href={`/patients/${current.patient.id}`}
                className="truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
              >
                {current.patient.fullName}
              </Link>
              <p className="text-xs text-muted-foreground">
                CIN {current.patient.cin} · Born {formatDateOnly(current.patient.birthDate)}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/patients/${current.patient.id}`}>
                Patient
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailRow icon={CalendarClock} label="Date and time">
            {formatClinicDateTime(current.appointmentDate)}
          </DetailRow>
          <DetailRow icon={Phone} label="Phone">
            {current.patient.phone}
          </DetailRow>
          <DetailRow icon={Stethoscope} label="Reason for visit">
            {current.reason ?? "Not specified"}
          </DetailRow>
          <DetailRow icon={UserRound} label="Booked by">
            {current.createdBy.fullName}
          </DetailRow>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
            Notes
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {current.notes ?? "No notes were added for this appointment."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          Created {formatClinicDateTime(current.createdAt)}
        </div>

        <DialogFooter className="flex-col-reverse gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <AppointmentStatusActions
            appointment={current}
            onUpdated={(updated) => {
              setCurrent(updated);
              onUpdated?.(updated);
            }}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canArchive ? (
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            ) : null}
            {canEdit && onEdit ? (
              <Button variant="outline" onClick={() => onEdit(current)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>

        <ConfirmDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          title="Archive this appointment?"
          description={`${current.patient.fullName}'s appointment will be hidden from the schedule and dashboard. The record is retained for audit purposes.`}
          confirmLabel="Archive appointment"
          cancelLabel="Keep appointment"
          isPending={deleteMutation.isPending}
          onConfirm={() => void archiveAppointment()}
        />
      </DialogContent>
    </Dialog>
  );
}
