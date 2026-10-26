"use client";

import type { UserPublic } from "@clinic/shared";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useDeleteUser } from "@/features/users/hooks";
import { getErrorMessage } from "@/lib/api-client";

interface DeleteUserDialogProps {
  user: UserPublic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onDeleted,
}: DeleteUserDialogProps) {
  const mutation = useDeleteUser();

  async function handleDelete() {
    if (!user) return;
    try {
      await mutation.mutateAsync(user.id);
      toast.success("Team member deactivated", {
        description: `${user.fullName} can no longer sign in.`,
      });
      onOpenChange(false);
      onDeleted?.(user.id);
    } catch (error) {
      toast.error("Could not deactivate team member", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Deactivate this team member?"
      description={
        user
          ? `${user.fullName} will immediately lose access to ClinicFlow. Their historical activity is retained.`
          : "This team member will lose access."
      }
      confirmLabel="Deactivate account"
      isPending={mutation.isPending}
      onConfirm={() => void handleDelete()}
    />
  );
}
