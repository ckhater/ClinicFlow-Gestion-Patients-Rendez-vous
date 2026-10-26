"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  patientCreateSchema,
  type Patient,
  type PatientCreateInput,
} from "@clinic/shared";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreatePatient, useUpdatePatient } from "@/features/patients/hooks";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import { formatClinicToday } from "@/lib/format";

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  onSuccess?: (patient: Patient) => void;
}

const EMPTY_VALUES: PatientCreateInput = {
  fullName: "",
  cin: "",
  phone: "",
  birthDate: "",
  address: null,
};

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: PatientFormDialogProps) {
  const isEdit = Boolean(patient);
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient(patient?.id ?? "");
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm<PatientCreateInput>({
    resolver: zodResolver(patientCreateSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    setGeneralError(null);
    form.reset(
      patient
        ? {
            fullName: patient.fullName,
            cin: patient.cin,
            phone: patient.phone,
            birthDate: patient.birthDate,
            address: patient.address,
          }
        : EMPTY_VALUES,
    );
  }, [form, open, patient]);

  const onSubmit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    try {
      const saved = patient
        ? await updateMutation.mutateAsync(values)
        : await createMutation.mutateAsync(values);
      toast.success(isEdit ? "Patient updated" : "Patient created");
      onOpenChange(false);
      onSuccess?.(saved);
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        let handled = false;
        for (const detail of error.details) {
          const field = detail.path as keyof PatientCreateInput;
          if (field in form.getValues()) {
            form.setError(field, { type: "server", message: detail.message });
            handled = true;
          }
        }
        if (handled) return;
      }
      setGeneralError(getErrorMessage(error));
      toast.error(getErrorMessage(error));
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit patient" : "Add a new patient"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the patient's contact and identity information."
              : "Create a patient record. The CIN is normalized to uppercase and must be unique."}
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
            <Label htmlFor="patient-fullName">Full name</Label>
            <Input
              id="patient-fullName"
              autoComplete="name"
              placeholder="e.g. Fatima Zahra El Fassi"
              aria-invalid={Boolean(form.formState.errors.fullName)}
              {...form.register("fullName")}
            />
            {form.formState.errors.fullName ? (
              <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="patient-cin">CIN</Label>
              <Input
                id="patient-cin"
                placeholder="AB123456"
                autoComplete="off"
                aria-invalid={Boolean(form.formState.errors.cin)}
                {...form.register("cin")}
              />
              {form.formState.errors.cin ? (
                <p className="text-xs text-destructive">{form.formState.errors.cin.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-phone">Phone number</Label>
              <Input
                id="patient-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+212 6XX XXX XXX"
                aria-invalid={Boolean(form.formState.errors.phone)}
                {...form.register("phone")}
              />
              {form.formState.errors.phone ? (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-birthDate">Date of birth</Label>
              <Input
                id="patient-birthDate"
                type="date"
                max={formatClinicToday()}
                aria-invalid={Boolean(form.formState.errors.birthDate)}
                {...form.register("birthDate")}
              />
              {form.formState.errors.birthDate ? (
                <p className="text-xs text-destructive">{form.formState.errors.birthDate.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-address">Address (optional)</Label>
              <Textarea
                id="patient-address"
                rows={1}
                className="min-h-10 resize-none py-2.5"
                placeholder="Street, city"
                aria-invalid={Boolean(form.formState.errors.address)}
                {...form.register("address")}
              />
              {form.formState.errors.address ? (
                <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
              ) : null}
            </div>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Create patient"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
