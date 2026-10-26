"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import type { Patient } from "@clinic/shared";
import { useAuth } from "@/features/auth/auth-provider";
import { DeletePatientDialog } from "@/features/patients/delete-patient-dialog";
import { PatientFormDialog } from "@/features/patients/patient-form-dialog";
import { usePatients } from "@/features/patients/hooks";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getErrorMessage } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  calculateAge,
  formatClinicDate,
  formatDateOnly,
  initials,
} from "@/lib/format";

type SortValue = "createdAt:desc" | "createdAt:asc" | "fullName:asc" | "fullName:desc";

const SORT_LABELS: Record<SortValue, string> = {
  "createdAt:desc": "Recently added",
  "createdAt:asc": "Oldest first",
  "fullName:asc": "Name A–Z",
  "fullName:desc": "Name Z–A",
};

function PatientRow({
  patient,
  canDelete,
  onEdit,
  onDelete,
}: {
  patient: Patient;
  canDelete: boolean;
  onEdit: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
}) {
  const age = calculateAge(patient.birthDate);

  return (
    <TableRow>
      <TableCell className="min-w-[150px]">
        <Link
          href={`/patients/${patient.id}`}
          className="flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-[11px]">{initials(patient.fullName)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {patient.fullName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {patient.address ?? "No address on file"}
            </span>
          </span>
        </Link>
      </TableCell>
      <TableCell className="font-mono text-xs font-medium tracking-wide text-foreground sm:whitespace-nowrap">
        {patient.cin}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground sm:whitespace-nowrap">
        {patient.phone}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground sm:whitespace-nowrap">
        <span className="block text-foreground">{formatDateOnly(patient.birthDate)}</span>
        {age !== null ? <span className="text-xs">{age} years old</span> : null}
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground xl:table-cell">
        {formatClinicDate(patient.createdAt)}
      </TableCell>
      <TableCell className="w-12 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${patient.fullName}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Patient actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/patients/${patient.id}`}>
                <Eye className="h-4 w-4" />
                View record
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(patient)}>
              <Pencil className="h-4 w-4" />
              Edit details
            </DropdownMenuItem>
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onSelect={() => onDelete(patient)}
                >
                  <Trash2 className="h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function PatientsTableSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="hidden h-3 w-20 sm:block" />
          <Skeleton className="hidden h-3 w-28 md:block" />
        </div>
      ))}
    </div>
  );
}

export function PatientsView() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [sort, setSort] = useState<SortValue>("createdAt:desc");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);

  const [sortBy, sortOrder] = sort.split(":") as [
    "createdAt" | "fullName",
    "asc" | "desc",
  ];
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  const { data, isLoading, isError, error, refetch } = usePatients({
    search: effectiveSearch,
    page,
    limit: 10,
    sortBy,
    sortOrder,
  });

  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, sort]);

  useEffect(() => {
    if (window.location.hash === "#new") {
      setFormOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function openCreate() {
    setEditingPatient(null);
    setFormOpen(true);
  }

  function openEdit(patient: Patient) {
    setEditingPatient(patient);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingPatient(null);
  }

  const canDelete = user?.role === "admin";
  const showSearchHint = search.trim().length === 1;

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="Patients"
        description="Search, review, and maintain the clinic's patient records."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add patient
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or CIN…"
              className="pl-9"
              aria-label="Search patients"
              aria-describedby={showSearchHint ? "patient-search-hint" : undefined}
            />
            {showSearchHint ? (
              <p id="patient-search-hint" className="mt-1.5 text-xs text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
              Sort
            </span>
            <Select value={sort} onValueChange={(value) => setSort(value as SortValue)}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Sort patients">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortValue[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {SORT_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <PatientsTableSkeleton />
        ) : isError ? (
          <ErrorState
            title="Patients could not be loaded"
            message={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={effectiveSearch ? "No matching patients" : "No patients yet"}
            description={
              effectiveSearch
                ? "Try a different name or CIN, or clear the search to see all records."
                : "Create the first patient record to begin scheduling appointments."
            }
            action={
              effectiveSearch ? (
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" />
                  Add patient
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Patient</TableHead>
                  <TableHead>CIN</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date of birth</TableHead>
                  <TableHead className="hidden xl:table-cell">Added</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((patient) => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    canDelete={canDelete}
                    onEdit={openEdit}
                    onDelete={setDeletingPatient}
                  />
                ))}
              </TableBody>
            </Table>
            <Pagination
              pagination={data.pagination}
              onPageChange={setPage}
              itemLabel="patient"
            />
          </>
        )}
      </Card>

      <PatientFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        patient={editingPatient}
      />

      <DeletePatientDialog
        patient={deletingPatient}
        open={Boolean(deletingPatient)}
        onOpenChange={(open) => !open && setDeletingPatient(null)}
        onDeleted={() => {
          if (data?.data.length === 1 && page > 1) {
            setPage(page - 1);
          }
        }}
      />
    </div>
  );
}
