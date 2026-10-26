"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  userCreateSchema,
  type UserCreateInput,
  type UserPublic,
} from "@clinic/shared";
import { useCreateUser, useUpdateUser } from "@/features/users/hooks";
import { useAuth } from "@/features/auth/auth-provider";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/format";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserPublic | null;
}

const passwordField = userCreateSchema.shape.password;

const userFormSchema = z.object({
  fullName: userCreateSchema.shape.fullName,
  email: userCreateSchema.shape.email,
  role: userCreateSchema.shape.role,
  password: z.union([z.literal(""), passwordField]).optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const EMPTY_VALUES: UserFormValues = {
  fullName: "",
  email: "",
  role: "staff",
  password: "",
};

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = Boolean(user);
  const { user: currentUser } = useAuth();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const isSelf = Boolean(user && currentUser?.id === user.id);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    setGeneralError(null);
    form.reset(
      user
        ? {
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            password: "",
          }
        : EMPTY_VALUES,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const onSubmit = form.handleSubmit(async (values) => {
    setGeneralError(null);

    if (!user && !values.password) {
      form.setError("password", {
        type: "required",
        message: "Password is required for a new team member",
      });
      return;
    }

    try {
      if (user) {
        await updateMutation.mutateAsync({
          id: user.id,
          input: {
            fullName: values.fullName,
            email: values.email,
            ...(values.password ? { password: values.password } : {}),
            ...(!isSelf && values.role !== user.role ? { role: values.role } : {}),
          },
        });
        toast.success("Team member updated");
      } else {
        const input: UserCreateInput = {
          fullName: values.fullName,
          email: values.email,
          password: values.password ?? "",
          role: values.role,
        };
        await createMutation.mutateAsync(input);
        toast.success("Team member added", {
          description: `${values.fullName} can now sign in with their clinic account.`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        let handled = false;
        for (const detail of error.details) {
          const field = detail.path as keyof UserFormValues;
          if (field === "fullName" || field === "email" || field === "role" || field === "password") {
            form.setError(field, { type: "server", message: detail.message });
            handled = true;
          }
        }
        if (handled) return;
      }
      setGeneralError(getErrorMessage(error));
      toast.error("Could not save team member", {
        description: getErrorMessage(error),
      });
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit team member" : "Add a team member"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update account details. Leave the password blank to keep the current one."
              : "Create a clinic account. Team members cannot register themselves."}
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
            <Label htmlFor="user-fullName">Full name</Label>
            <Input
              id="user-fullName"
              autoComplete="name"
              placeholder="e.g. Salma Idrissi"
              aria-invalid={Boolean(form.formState.errors.fullName)}
              {...form.register("fullName")}
            />
            {form.formState.errors.fullName ? (
              <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email address</Label>
            <Input
              id="user-email"
              type="email"
              autoComplete="email"
              placeholder="name@clinicflow.dev"
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSelf}
                  >
                    <SelectTrigger id="user-role" aria-label="Team member role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
                      <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {isSelf ? (
                <p className="text-xs text-muted-foreground">
                  You cannot change your own role.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Administrators can manage the team and deactivate patients.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-password">
                {isEdit ? "New password (optional)" : "Temporary password"}
              </Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                placeholder={isEdit ? "Leave blank to keep" : "At least 8 characters"}
                aria-invalid={Boolean(form.formState.errors.password)}
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Must include a letter and a number.
                </p>
              )}
            </div>
          </div>

          {!isEdit ? (
            <div className="flex items-start gap-2.5 rounded-md border border-border/70 bg-muted/40 px-3.5 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Share the temporary password through a secure channel. The new member can change
                it after signing in once password change support is enabled.
              </p>
            </div>
          ) : null}

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
                "Add team member"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
