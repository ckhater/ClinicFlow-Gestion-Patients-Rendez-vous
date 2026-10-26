import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PermissionDenied() {
  return (
    <div className="page-shell">
      <Card>
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Administrator access required</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Team management is restricted to clinic administrators. If you believe you should have
            access, contact an administrator.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
