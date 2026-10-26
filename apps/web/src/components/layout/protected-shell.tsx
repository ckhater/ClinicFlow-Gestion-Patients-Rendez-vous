"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { DesktopSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Skeleton } from "@/components/ui/skeleton";

function AppSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-64 bg-sidebar p-5 lg:block">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 bg-white/10" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 bg-white/10" />
            <Skeleton className="h-2 w-16 bg-white/10" />
          </div>
        </div>
        <div className="mt-10 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full bg-white/10" />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex h-16 items-center justify-between border-b border-border bg-card/60 px-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProtectedShell({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return <AppSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <HeartPulse className="h-5 w-5 animate-pulse text-primary" />
          Redirecting to sign in…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
