"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { RoleBadge } from "@/components/common/status-badge";
import { SidebarContent } from "@/components/layout/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { initials } from "@/lib/format";

function routeTitle(pathname: string): { section: string; detail?: string } {
  if (pathname === "/dashboard") return { section: "Dashboard" };
  if (pathname === "/patients") return { section: "Patients" };
  if (pathname.startsWith("/patients/")) return { section: "Patients", detail: "Patient details" };
  if (pathname === "/appointments") return { section: "Appointments" };
  if (pathname === "/users") return { section: "Team" };
  return { section: "ClinicFlow" };
}

export function Topbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { section, detail } = routeTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border/80 bg-background/85 px-4 backdrop-blur-md md:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 max-w-[86%] border-r-0 bg-sidebar p-0 [&>button]:text-sidebar-foreground"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            ClinicFlow
          </Link>
          <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/60 sm:block" aria-hidden="true" />
          <span
            className={detail ? "text-muted-foreground" : "font-medium text-foreground"}
            aria-current={detail ? undefined : "page"}
          >
            {section}
          </span>
          {detail ? (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              <span className="truncate font-medium text-foreground" aria-current="page">
                {detail}
              </span>
            </>
          ) : null}
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {user ? <RoleBadge role={user.role} className="hidden sm:inline-flex" /> : null}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-transparent p-1 pr-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Open user menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[11px]">{initials(user.fullName)}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-32 truncate text-sm font-medium md:block">
                  {user.fullName}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{user.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={() => void logout()}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
