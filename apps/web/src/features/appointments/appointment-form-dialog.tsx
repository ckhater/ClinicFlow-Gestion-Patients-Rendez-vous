"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarPlus,
  Check,
  ChevronsUpDown,
  Loader2,
  Pencil,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { AppointmentWithRelations, Patient } from "@clinic/shared";
import {
  useCreateAppointment,
  useUpdateAppointment,
} from "@/features/appointments/hooks";
import { usePatients } from "@/features/patients/hooks";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import {
  clinicLocalInputToIso,
  currentClinicInputValue,
  defaultAppointmentInputValue,
  formatDateOnly,
  initials,
  toClinicLocalInputValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface SelectedPatient {
  id: string;
  fullName: string;
  cin: string;
  birthDate?: string;
}

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPatient?: Patient | SelectedPatient | null;
  /** When provided the dialog edits this appointment instead of creating one. */
  appointment?: AppointmentWithRelations | null;
  onCreated?: () => void;
  onUpdated?: (appointment: AppointmentWithRelations) => void;
}

function parseClinicDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  try {
    const parsed = new Date(clinicLocalInputToIso(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

const appointmentFormSchema = z.object({
  patientId: z.string().uuid("Select a patient for this appointment"),
  appointmentAt: z
    .string()
    .min(1, "Choose a date and time")
    .superRefine((value, ctx) => {
      const parsed = parseClinicDateTime(value);
      if (!parsed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid date and time",
        });
        return;
      }
      if (parsed.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Appointment must be in the future",
        });
      }
    }),
  reason: z.string().max(255, "Reason must be at most 255 characters").optional(),
  notes: z.string().max(2000, "Notes must be at most 2000 characters").optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

function PatientPicker({
  selected,
  onSelect,
  onClear,
  open,
}: {
  selected: SelectedPatient | null;
  onSelect: (patient: SelectedPatient) => void;
  onClear: () => void;
  open: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmed = debouncedSearch.trim();
  const canSearch = trimmed.length >= 2;

  const { data, isLoading, isFetching } = usePatients(
    {
      search: canSearch ? trimmed : undefined,
      page: 1,
      limit: 6,
      sortBy: "fullName",
      sortOrder: "asc",
    },
    { enabled: open },
  );

  const results = useMemo(() => data?.data ?? [], [data?.data]);
  const showLoading = isLoading || (canSearch && isFetching && results.length === 0);

  return (
    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={pickerOpen}
          aria-controls="appointment-patient-picker"
          aria-label="Choose patient"
          className={cn(
            "flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-card px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-accent/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">
                  {initials(selected.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {selected.fullName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  CIN {selected.cin}
                </span>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Search for a patient…
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        id="appointment-patient-picker"
        className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0"
        align="start"
      >
        <div className="border-b border-border/70 p-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or CIN…"
              className="h-9 pl-8 text-sm"
              autoFocus
              aria-label="Search patients for appointment"
            />
          </div>
          {trimmed.length === 1 ? (
            <p className="px-1 pt-1.5 text-[11px] text-muted-foreground">
              Type at least 2 characters.
            </p>
          ) : null}
        </div>

        <div className="max-h-64 overflow-y-auto p-1.5">
          {showLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              {canSearch
                ? "No active patients match that search."
                : "No patients available yet. Add a patient first."}
            </p>
          ) : (
            results.map((patient) => {
              const isSelected = selected?.id === patient.id;
              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => {
                    onSelect({
                      id: patient.id,
                      fullName: patient.fullName,
                      cin: patient.cin,
                      birthDate: patient.birthDate,
                    });
                    setPickerOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px]">
                      {initials(patient.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {patient.fullName}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      CIN {patient.cin} · {patient.phone}
                    </span>
                  </span>
                  <Check
                    className={cn(
                      "h-4 w-4 text-primary",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })
          )}
        </div>

        {selected ? (
          <div className="border-t border-border/70 p-1.5">
            <button
              type="button"
              onClick={() => {
                onClear();
                setPickerOpen(false);
              }}
              className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Clear selection
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  initialPatient,
  appointment = null,
  onCreated,
  onUpdated,
}: AppointmentFormDialogProps) {
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const isEdit = Boolean(appointment);
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      appointmentAt: defaultAppointmentInputValue(),
      reason: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    setGeneralError(null);
    const patient = appointment?.patient ?? initialPatient ?? null;
    setSelectedPatient(
      patient
        ? {
            id: patient.id,
            fullName: patient.fullName,
            cin: patient.cin,
            birthDate: patient.birthDate,
          }
        : null,
    );
    form.reset({
      patientId: patient?.id ?? "",
      appointmentAt: appointment
        ? toClinicLocalInputValue(appointment.appointmentDate)
        : defaultAppointmentInputValue(),
      reason: appointment?.reason ?? "",
      notes: appointment?.notes ?? "",
    });
    // The form instance is stable; resetting only when the dialog opens avoids
    // overwriting user input on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPatient?.id, appointment?.id]);

  const onSubmit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    try {
      const appointmentDate = parseClinicDateTime(values.appointmentAt);
      if (!appointmentDate) {
        form.setError("appointmentAt", { message: "Enter a valid date and time" });
        return;
      }

      const payload = {
        patientId: values.patientId,
        appointmentDate: appointmentDate.toISOString(),
        reason: values.reason?.trim() ? values.reason.trim() : null,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      };

      if (appointment) {
        const updated = await updateMutation.mutateAsync({
          id: appointment.id,
          input: payload,
        });
        toast.success("Appointment updated", {
          description: `${updated.patient.fullName}'s appointment has been rescheduled.`,
        });
        onOpenChange(false);
        onUpdated?.(updated);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Appointment scheduled", {
          description: `${selectedPatient?.fullName ?? "The patient"} is now on the schedule.`,
        });
        onOpenChange(false);
        onCreated?.();
      }
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        let handled = false;
        for (const detail of error.details) {
          const field = detail.path as keyof AppointmentFormValues;
          if (field === "patientId" || field === "appointmentAt" || field === "reason" || field === "notes") {
            form.setError(field, { type: "server", message: detail.message });
            handled = true;
          }
        }
        if (handled) return;
      }
      setGeneralError(getErrorMessage(error));
      toast.error(isEdit ? "Could not update appointment" : "Could not schedule appointment", {
        description: getErrorMessage(error),
      });
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isWaitingForInitialPatient = Boolean(initialPatient && !selectedPatient);

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit appointment" : "Schedule an appointment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the patient, date, or visit details. The appointment status is unchanged."
              : "New appointments start as pending. You can confirm or cancel them from the schedule."}
          </DialogDescription>
        </DialogHeader>

        {generalError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
          >
            {generalError}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Patient</Label>
            <PatientPicker
              selected={selectedPatient}
              open={open}
              onSelect={(patient) => {
                setSelectedPatient(patient);
                form.setValue("patientId", patient.id, { shouldValidate: true });
              }}
              onClear={() => {
                setSelectedPatient(null);
                form.setValue("patientId", "", { shouldValidate: true });
              }}
            />
            {selectedPatient?.birthDate ? (
              <p className="text-xs text-muted-foreground">
                Born {formatDateOnly(selectedPatient.birthDate)}
              </p>
            ) : null}
            {form.formState.errors.patientId ? (
              <p className="text-xs text-destructive">{form.formState.errors.patientId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-date">Date and time</Label>
            <Input
              id="appointment-date"
              type="datetime-local"
              min={currentClinicInputValue()}
              aria-invalid={Boolean(form.formState.errors.appointmentAt)}
              {...form.register("appointmentAt")}
            />
            <p className="text-xs text-muted-foreground">
              Times are shown in the clinic&apos;s local timezone.
            </p>
            {form.formState.errors.appointmentAt ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.appointmentAt.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-reason">Reason for visit</Label>
            <Input
              id="appointment-reason"
              placeholder="e.g. Annual check-up"
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register("reason")}
            />
            {form.formState.errors.reason ? (
              <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-notes">Notes (optional)</Label>
            <Textarea
              id="appointment-notes"
              rows={3}
              placeholder="Anything the care team should know before the visit."
              aria-invalid={Boolean(form.formState.errors.notes)}
              {...form.register("notes")}
            />
            {form.formState.errors.notes ? (
              <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>
            ) : null}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isWaitingForInitialPatient}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEdit ? "Saving…" : "Scheduling…"}
                </>
              ) : isEdit ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Save changes
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4" />
                  Schedule appointment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
