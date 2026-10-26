"use client";

import type { Patient } from "@clinic/shared";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useDeletePatient } from "@/features/patients/hooks";
import { getErrorMessage } from "@/lib/api-client";

interface DeletePatientDialogProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
}

export function DeletePatientDialog({
  patient,
  open,
  onOpenChange,
  onDeleted,
}: DeletePatientDialogProps) {
  const mutation = useDeletePatient();

  async function handleDelete() {
    if (!patient) return;
    try {
      await mutation.mutateAsync(patient.id);
      toast.success("Patient deactivated", {
        description: `${patient.fullName} was removed from the active patient list.`,
      });
      onOpenChange(false);
      onDeleted?.(patient.id);
    } catch (error) {
      toast.error("Could not deactivate patient", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Deactivate this patient?"
      description={
        patient
          ? `${patient.fullName} will be removed from active records. Future pending or confirmed appointments will be cancelled. Historical appointments are retained.`
          : "This patient will be deactivated."
      }
      confirmLabel="Deactivate patient"
      isPending={mutation.isPending}
      onConfirm={() => void handleDelete()}
    />
  );
}
