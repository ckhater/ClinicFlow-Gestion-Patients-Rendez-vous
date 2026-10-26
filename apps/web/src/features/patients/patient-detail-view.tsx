"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Cake,
  Clock3,
  Eye,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import type { AppointmentWithRelations } from "@clinic/shared";
import { useAuth } from "@/features/auth/auth-provider";
import { AppointmentDetailsDialog } from "@/features/appointments/appointment-details-dialog";
import { AppointmentFormDialog } from "@/features/appointments/appointment-form-dialog";
import { AppointmentStatusActions } from "@/features/appointments/appointment-status-actions";
import { DeletePatientDialog } from "@/features/patients/delete-patient-dialog";
import { PatientFormDialog } from "@/features/patients/patient-form-dialog";
import { usePatient } from "@/features/patients/hooks";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import {
  calculateAge,
  formatClinicDate,
  formatClinicDateTime,
  formatClinicTime,
  formatDateOnly,
  initials,
  pluralize,
} from "@/lib/format";

function DetailLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: React.ReactNode;
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
        <div className="mt-0.5 break-words text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

function PatientDetailSkeleton() {
  return (
    <div className="page-shell space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export function PatientDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: patient, isLoading, isError, error, refetch } = usePatient(id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [appointmentFormOpen, setAppointmentFormOpen] = useState(false);

  if (isLoading) return <PatientDetailSkeleton />;

  if (isError || !patient) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="page-shell space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/patients">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to patients
          </Link>
        </Button>
        <Card>
          <ErrorState
            title={notFound ? "Patient not found" : "Patient record unavailable"}
            message={
              notFound
                ? "This patient may have been deactivated, or the link is no longer valid."
                : getErrorMessage(error)
            }
            onRetry={notFound ? undefined : () => void refetch()}
          />
        </Card>
      </div>
    );
  }

  const age = calculateAge(patient.birthDate);
  const activeAppointments = patient.appointments.filter(
    (appointment) => appointment.status === "pending" || appointment.status === "confirmed",
  );
  const upcoming = activeAppointments
    .filter((appointment) => new Date(appointment.appointmentDate).getTime() >= Date.now())
    .sort(
      (a, b) =>
        new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime(),
    );
  const nextAppointment = upcoming[0] ?? null;
  const canDelete = user?.role === "admin";

  function openAppointmentCreate() {
    setEditingAppointment(null);
    setAppointmentFormOpen(true);
  }

  function openAppointmentEdit(appointment: AppointmentWithRelations) {
    setSelectedAppointment(null);
    setEditingAppointment(appointment);
    setAppointmentFormOpen(true);
  }

  function handleAppointmentFormOpenChange(open: boolean) {
    setAppointmentFormOpen(open);
    if (!open) setEditingAppointment(null);
  }

  return (
    <div className="page-shell space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
          <Link href="/patients">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to patients
          </Link>
        </Button>
        <PageHeader
          title={patient.fullName}
          description={`Patient record · CIN ${patient.cin} · Added ${formatClinicDate(patient.createdAt)}`}
          actions={
            <>
              <Button variant="outline" onClick={openAppointmentCreate}>
                <CalendarPlus className="h-4 w-4" />
                Schedule
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              {canDelete ? (
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Deactivate
                </Button>
              ) : null}
            </>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Appointments
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {patient.appointments.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeAppointments.length} active{" "}
            {pluralize(activeAppointments.length, "appointment")}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next appointment
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {nextAppointment ? formatClinicDate(nextAppointment.appointmentDate) : "None scheduled"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {nextAppointment
              ? `${formatClinicTime(nextAppointment.appointmentDate)} · ${nextAppointment.reason ?? "General consultation"}`
              : "Schedule a follow-up when ready."}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Patient age
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {age ?? "—"}
            {age !== null ? <span className="ml-1 text-base font-normal text-muted-foreground">yrs</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Born {formatDateOnly(patient.birthDate)}
          </p>
        </Card>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-base">{initials(patient.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <CardTitle className="truncate">{patient.fullName}</CardTitle>
                <CardDescription>Patient since {formatClinicDate(patient.createdAt)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4">
              <DetailLine icon={UserRound} label="CIN" value={patient.cin} />
              <DetailLine icon={Phone} label="Phone" value={patient.phone} />
              <DetailLine
                icon={Cake}
                label="Date of birth"
                value={`${formatDateOnly(patient.birthDate)}${age !== null ? ` (${age} years old)` : ""}`}
              />
              <DetailLine
                icon={MapPin}
                label="Address"
                value={patient.address ?? "No address on file"}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Record information
              </p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                Last updated {formatClinicDateTime(patient.updatedAt)}
              </p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Contact is managed by clinic staff
              </p>
            </div>

            <Button className="w-full" variant="outline" onClick={openAppointmentCreate}>
              <CalendarPlus className="h-4 w-4" />
              Schedule appointment
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Appointment history</CardTitle>
              <CardDescription>All recorded appointments, most recent first.</CardDescription>
            </div>
            <Button size="sm" onClick={openAppointmentCreate}>
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {patient.appointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No appointments yet"
                description="Schedule this patient's first appointment to start their visit history."
                action={
                  <Button size="sm" onClick={openAppointmentCreate}>
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Schedule appointment
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>When</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patient.appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="text-sm text-muted-foreground sm:whitespace-nowrap">
                        <span className="block text-sm font-medium text-foreground">
                          {formatClinicDate(appointment.appointmentDate)}
                        </span>
                        <span className="block text-xs tabular-nums text-muted-foreground">
                          {formatClinicTime(appointment.appointmentDate)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <span className="line-clamp-1 text-sm text-muted-foreground">
                          {appointment.reason ?? "General consultation"}
                        </span>
                        <span className="block text-[11px] text-muted-foreground/80">
                          Booked by {appointment.createdBy.fullName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={appointment.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedAppointment(appointment)}
                            aria-label="View appointment details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {appointment.status !== "cancelled" &&
                          new Date(appointment.appointmentDate).getTime() >= Date.now() ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openAppointmentEdit(appointment)}
                              aria-label="Edit appointment"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <AppointmentStatusActions
                            appointment={appointment}
                            compact
                            onUpdated={(updated) => {
                              if (selectedAppointment?.id === updated.id) {
                                setSelectedAppointment(updated);
                              }
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <PatientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
      />

      <AppointmentFormDialog
        open={appointmentFormOpen}
        onOpenChange={handleAppointmentFormOpenChange}
        initialPatient={patient}
        appointment={editingAppointment}
      />

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={Boolean(selectedAppointment)}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
        onEdit={openAppointmentEdit}
        onDeleted={() => setSelectedAppointment(null)}
      />

      <DeletePatientDialog
        patient={patient}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.replace("/patients")}
      />
    </div>
  );
}
