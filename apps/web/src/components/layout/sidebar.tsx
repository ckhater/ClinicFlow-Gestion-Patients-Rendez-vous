"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { Brand } from "@/components/layout/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROLE_LABELS, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: UsersRound },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/users", label: "Team", icon: ShieldCheck, adminOnly: true },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarContent({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <div className={cn("flex h-full flex-col bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Brand variant="dark" />
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted/70">
          Workspace
        </p>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-offset-sidebar",
                active
                  ? "bg-sidebar-active text-white shadow-sm"
                  : "text-sidebar-muted hover:bg-white/[0.06] hover:text-sidebar-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-secondary" : "text-sidebar-muted group-hover:text-sidebar-foreground",
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              {active ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        {user ? (
          <div className="rounded-md bg-white/[0.06] p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-white/15">
                <AvatarFallback className="bg-secondary text-[11px] text-[#2f4a56]">
                  {initials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user.fullName}</p>
                <p className="truncate text-[11px] text-sidebar-muted">{ROLE_LABELS[user.role]}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-md p-2 text-sidebar-muted transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-offset-sidebar"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
        <p className="mt-3 px-2 text-[10px] text-sidebar-muted/60">ClinicFlow · Secure workspace</p>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-black/5 lg:block">
      <SidebarContent />
    </aside>
  );
}
