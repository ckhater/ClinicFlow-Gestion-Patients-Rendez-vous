"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  Eye,
  FilterX,
  Pencil,
  Search,
  X,
} from "lucide-react";
import type {
  AppointmentStatus,
  AppointmentWithRelations,
} from "@clinic/shared";
import { AppointmentDetailsDialog } from "@/features/appointments/appointment-details-dialog";
import { AppointmentFormDialog } from "@/features/appointments/appointment-form-dialog";
import { AppointmentStatusActions } from "@/features/appointments/appointment-status-actions";
import { useAppointments } from "@/features/appointments/hooks";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getErrorMessage } from "@/lib/api-client";
import {
  formatClinicDate,
  formatClinicTime,
  formatClinicToday,
  pluralize,
} from "@/lib/format";

type StatusFilter = "all" | AppointmentStatus;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

function AppointmentsSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-10 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="hidden h-6 w-20 sm:block" />
          <Skeleton className="hidden h-8 w-28 md:block" />
        </div>
      ))}
    </div>
  );
}

export function AppointmentsView() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentWithRelations | null>(null);
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null);

  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  const { data, isLoading, isError, error, refetch } = useAppointments({
    search: effectiveSearch,
    status: status === "all" ? undefined : status,
    date: date || undefined,
    page,
    limit: 10,
  });

  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, status, date]);

  useEffect(() => {
    if (window.location.hash === "#new") {
      setFormOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const hasFilters = Boolean(effectiveSearch || status !== "all" || date);
  const today = formatClinicToday();

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setDate("");
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(appointment: AppointmentWithRelations) {
    setSelected(null);
    setEditing(appointment);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setEditing(null);
  }

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="Appointments"
        description="Review the clinic schedule, confirm requests, and cancel appointments when needed."
        actions={
          <Button onClick={openCreate}>
            <CalendarPlus className="h-4 w-4" />
            Schedule appointment
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient name or CIN…"
              className="pl-9"
              aria-label="Search appointments by patient"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full sm:w-44"
                aria-label="Filter by appointment date"
              />
              <Button
                type="button"
                variant={date === today ? "secondary" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => setDate(date === today ? "" : today)}
              >
                Today
              </Button>
              {date ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDate("")}
                  aria-label="Clear date filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            {hasFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <FilterX className="h-3.5 w-3.5" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {hasFilters ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/25 px-4 py-2 text-xs text-muted-foreground">
            <span>Filtered schedule</span>
            {effectiveSearch ? (
              <span className="rounded-full bg-card px-2 py-0.5 font-medium text-foreground">
                “{effectiveSearch}”
              </span>
            ) : null}
            {status !== "all" ? (
              <span className="rounded-full bg-card px-2 py-0.5 font-medium text-foreground">
                {STATUS_OPTIONS.find((option) => option.value === status)?.label}
              </span>
            ) : null}
            {date ? (
              <span className="rounded-full bg-card px-2 py-0.5 font-medium text-foreground">
                {formatClinicDate(`${date}T12:00:00.000Z`)}
              </span>
            ) : null}
          </div>
        ) : null}

        {isLoading ? (
          <AppointmentsSkeleton />
        ) : isError ? (
          <ErrorState
            title="Appointments could not be loaded"
            message={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={hasFilters ? "No appointments match these filters" : "No appointments scheduled"}
            description={
              hasFilters
                ? "Try clearing one or more filters to see more of the schedule."
                : "Schedule the first appointment to start building the clinic's day."
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Schedule appointment
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="border-b border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
              {data.pagination.total}{" "}
              {pluralize(data.pagination.total, "appointment")} found
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>When</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Booked by</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="text-sm text-muted-foreground sm:whitespace-nowrap">
                      <span className="block text-sm font-semibold tabular-nums text-foreground">
                        {formatClinicTime(appointment.appointmentDate)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatClinicDate(appointment.appointmentDate)}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <Link
                        href={`/patients/${appointment.patient.id}`}
                        className="block truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {appointment.patient.fullName}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        CIN {appointment.patient.cin}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-[220px] md:table-cell">
                      <span className="line-clamp-1 text-sm text-muted-foreground">
                        {appointment.reason ?? "General consultation"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={appointment.status} />
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground xl:table-cell">
                      {appointment.createdBy.fullName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setSelected(appointment)}
                          aria-label={`View appointment for ${appointment.patient.fullName}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {appointment.status !== "cancelled" &&
                        new Date(appointment.appointmentDate).getTime() >= Date.now() ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(appointment)}
                            aria-label={`Edit appointment for ${appointment.patient.fullName}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <AppointmentStatusActions
                          appointment={appointment}
                          compact
                          onUpdated={(updated) => {
                            if (selected?.id === updated.id) setSelected(updated);
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              pagination={data.pagination}
              onPageChange={setPage}
              itemLabel="appointment"
            />
          </>
        )}
      </Card>

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        appointment={editing}
      />

      <AppointmentDetailsDialog
        appointment={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        onEdit={openEdit}
        onDeleted={() => setSelected(null)}
      />
    </div>
  );
}
