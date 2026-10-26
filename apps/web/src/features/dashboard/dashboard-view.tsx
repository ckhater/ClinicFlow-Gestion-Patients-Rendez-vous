"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Plus,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppointmentWithRelations, WeeklyTrendPoint } from "@clinic/shared";
import { useAuth } from "@/features/auth/auth-provider";
import { useDashboardStats } from "@/features/dashboard/hooks";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api-client";
import {
  formatClinicDate,
  formatClinicLongDate,
  formatClinicTime,
  getGreeting,
  STATUS_LABELS,
} from "@/lib/format";
import { cn } from "@/lib/utils";

function DashboardSkeleton() {
  return (
    <div className="page-shell space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-96 xl:col-span-2" />
        <Skeleton className="h-96" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 xl:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: WeeklyTrendPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-raised">
      <p className="text-xs font-medium text-muted-foreground">
        {formatClinicDate(`${point.date}T12:00:00.000Z`)}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">
        {point.count} {point.count === 1 ? "appointment" : "appointments"}
      </p>
    </div>
  );
}

function TodayRow({ appointment }: { appointment: AppointmentWithRelations }) {
  return (
    <Link
      href={`/patients/${appointment.patient.id}`}
      className="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-secondary/40 py-1.5">
        <span className="text-sm font-semibold tabular-nums text-primary">
          {formatClinicTime(appointment.appointmentDate)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{appointment.patient.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {appointment.reason ?? "General consultation"}
        </p>
      </div>
      <StatusBadge status={appointment.status} />
    </Link>
  );
}

function UpcomingRow({ appointment }: { appointment: AppointmentWithRelations }) {
  return (
    <Link
      href={`/patients/${appointment.patient.id}`}
      className="flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{appointment.patient.fullName}</p>
        <p className="text-xs text-muted-foreground">
          {formatClinicDate(appointment.appointmentDate)} · {formatClinicTime(appointment.appointmentDate)}
        </p>
      </div>
    </Link>
  );
}

export function DashboardView() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useDashboardStats();

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="page-shell">
        <Card>
          <ErrorState
            title="Dashboard unavailable"
            message={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        </Card>
      </div>
    );
  }

  const firstName = user?.fullName.split(" ")[0] ?? "there";
  const statusTotal = data.statusBreakdown.reduce((sum, item) => sum + item.count, 0);
  const weeklyTotal = data.weeklyTrend.reduce((sum, point) => sum + point.count, 0);

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title={`${getGreeting()}, ${firstName}`}
        description={`Here is what is happening at the clinic on ${formatClinicLongDate()}.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/patients#new">
                <Plus className="h-4 w-4" />
                New patient
              </Link>
            </Button>
            <Button asChild>
              <Link href="/appointments#new">
                <CalendarPlus className="h-4 w-4" />
                Schedule appointment
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label="Clinic summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active patients"
          value={data.summary.totalActivePatients}
          icon={UsersRound}
          hint="Current patient records"
          tone="primary"
        />
        <StatCard
          title="Today's appointments"
          value={data.summary.todayAppointments}
          icon={CalendarDays}
          hint="Pending + confirmed today"
          tone="secondary"
        />
        <StatCard
          title="Pending"
          value={data.summary.pendingAppointments}
          icon={Clock3}
          hint="All upcoming requests"
          tone="warning"
        />
        <StatCard
          title="Confirmed"
          value={data.summary.confirmedAppointments}
          icon={CheckCircle2}
          hint="All confirmed appointments"
          tone="success"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Today&apos;s schedule</CardTitle>
              <CardDescription>Active appointments for the clinic day.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/appointments">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.todaySchedule.length > 0 ? (
              <div className="-mx-2 divide-y divide-border/60">
                {data.todaySchedule.map((appointment) => (
                  <TodayRow key={appointment.id} appointment={appointment} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No appointments today"
                description="The schedule is clear. You can create an appointment whenever you are ready."
                action={
                  <Button asChild size="sm">
                    <Link href="/appointments#new">
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Schedule appointment
                    </Link>
                  </Button>
                }
                className="py-10"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment status</CardTitle>
            <CardDescription>All appointments, all time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {statusTotal === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No appointment activity yet.
              </p>
            ) : (
              data.statusBreakdown.map((item) => {
                const percentage = statusTotal === 0 ? 0 : Math.round((item.count / statusTotal) * 100);
                return (
                  <div key={item.status}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{STATUS_LABELS[item.status]}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {item.count} · {percentage}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          item.status === "pending" && "bg-warning",
                          item.status === "confirmed" && "bg-success",
                          item.status === "cancelled" && "bg-muted-foreground/50",
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}

            <div className="rounded-md border border-border/70 bg-muted/40 p-3">
              <p className="text-xs font-medium text-foreground">Quick actions</p>
              <div className="mt-2 flex flex-col gap-1.5">
                <Link
                  href="/patients#new"
                  className="flex items-center justify-between rounded-sm px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  Add a patient
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/appointments#new"
                  className="flex items-center justify-between rounded-sm px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  Schedule an appointment
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Appointments · last 7 days</CardTitle>
              <CardDescription>All scheduled appointments, including cancelled.</CardDescription>
            </div>
            <span className="rounded-full bg-secondary/50 px-2.5 py-1 text-xs font-medium text-primary">
              {weeklyTotal} total
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full" role="img" aria-label="Bar chart of appointments over the last seven days">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyTrend} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgb(214 226 233)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "rgb(91 111 122)", fontSize: 11 }}
                    tickFormatter={(value: string) => format(new Date(`${value}T00:00:00Z`), "EEE")}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                    tick={{ fill: "rgb(91 111 122)", fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(200 217 230 / 0.25)" }} />
                  <Bar dataKey="count" fill="#567C8D" radius={[5, 5, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Upcoming</CardTitle>
              <CardDescription>Next active appointments.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/appointments">
                All
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.upcoming.length > 0 ? (
              <div className="-mx-2 divide-y divide-border/60">
                {data.upcoming.map((appointment) => (
                  <UpcomingRow key={appointment.id} appointment={appointment} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="Nothing upcoming"
                description="New appointments will appear here as they are scheduled."
                className="py-8"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
