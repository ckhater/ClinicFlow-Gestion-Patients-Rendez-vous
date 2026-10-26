"use client";

import { useEffect, useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { UserPublic } from "@clinic/shared";
import { useAuth } from "@/features/auth/auth-provider";
import { DeleteUserDialog } from "@/features/users/delete-user-dialog";
import { UserFormDialog } from "@/features/users/user-form-dialog";
import { useUsers } from "@/features/users/hooks";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { PermissionDenied } from "@/components/common/permission-denied";
import { RoleBadge } from "@/components/common/status-badge";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getErrorMessage } from "@/lib/api-client";
import { formatClinicDate, initials } from "@/lib/format";

type RoleFilter = "all" | "admin" | "staff";

function UsersSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

function UsersViewAdmin() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [role, setRole] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPublic | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserPublic | null>(null);

  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  const { data, isLoading, isError, error, refetch } = useUsers({
    search: effectiveSearch,
    role: role === "all" ? undefined : role,
    page,
    limit: 10,
  });

  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, role]);

  function openCreate() {
    setEditingUser(null);
    setFormOpen(true);
  }

  function openEdit(user: UserPublic) {
    setEditingUser(user);
    setFormOpen(true);
  }

  const hasFilters = Boolean(effectiveSearch || role !== "all");

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="Team"
        description="Manage who can access ClinicFlow and what they can do."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add team member
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-start gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Administrators</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Full access, including team management and patient deactivation.
            </p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary/60 text-primary">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Staff</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Day-to-day patient records, scheduling, and appointment status updates.
            </p>
          </div>
        </Card>
      </div>

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
              placeholder="Search by name or email…"
              className="pl-9"
              aria-label="Search team members"
            />
          </div>
          <Select value={role} onValueChange={(value) => setRole(value as RoleFilter)}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Administrators</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <UsersSkeleton />
        ) : isError ? (
          <ErrorState
            title="Team could not be loaded"
            message={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={hasFilters ? "No team members match" : "No team members"}
            description={
              hasFilters
                ? "Try a different search or role filter."
                : "Add the first team member to give someone access to the clinic workspace."
            }
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setRole("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" />
                  Add team member
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Team member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="min-w-[160px]">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-[11px]">
                              {initials(user.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {user.fullName}
                              {isSelf ? (
                                <span className="ml-2 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                  You
                                </span>
                              ) : null}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                        {formatClinicDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${user.fullName}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Account actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => openEdit(user)}>
                              <Pencil className="h-4 w-4" />
                              Edit account
                            </DropdownMenuItem>
                            {!isSelf ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                  onSelect={() => setDeletingUser(user)}
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
                })}
              </TableBody>
            </Table>
            <Pagination
              pagination={data.pagination}
              onPageChange={setPage}
              itemLabel="team member"
            />
          </>
        )}
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingUser(null);
        }}
        user={editingUser}
      />

      <DeleteUserDialog
        user={deletingUser}
        open={Boolean(deletingUser)}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onDeleted={() => {
          if (data?.data.length === 1 && page > 1) setPage(page - 1);
        }}
      />
    </div>
  );
}

export function UsersView() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <PermissionDenied />;
  }

  return <UsersViewAdmin />;
}
