"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@clinic/shared";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-provider";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/api-client";

const FEATURES = [
  {
    icon: UsersRound,
    title: "Patient records",
    description: "A clear, searchable source of truth for every patient.",
  },
  {
    icon: CalendarCheck2,
    title: "Daily scheduling",
    description: "See today's appointments and manage status in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Role-aware access",
    description: "Administrators and staff each get exactly what they need.",
  },
];

export function LoginScreen() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [router, user]);

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values);
      toast.success("Welcome back");
      router.replace("/dashboard");
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  });

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.06fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full border border-secondary/15"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-24 right-10 h-40 w-40 rounded-full border border-secondary/10"
          aria-hidden="true"
        />

        <Brand href="/login" variant="dark" className="relative z-10" />

        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
            A calmer clinic workspace
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.12] tracking-tight xl:text-5xl">
            Care, organized.
            <br />
            Every single day.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-secondary/90">
            ClinicFlow brings patient records, appointments, and your team together in one
            focused, secure workspace — so you can spend less time searching and more time caring.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-secondary">
                  <feature.icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-secondary/80">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-secondary/60">
          Built for small clinics that value clarity, privacy, and continuity of care.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand href="/login" />
          </div>

          <div className="rounded-lg border border-border/80 bg-card p-6 shadow-card sm:p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Sign in to your clinic workspace to continue.
              </p>
            </div>

            {serverError ? (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@clinic.example"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  aria-describedby={form.formState.errors.email ? "email-error" : undefined}
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p id="email-error" className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="pr-11"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    aria-describedby={form.formState.errors.password ? "password-error" : undefined}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password ? (
                  <p id="password-error" className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>

            {process.env.NODE_ENV !== "production" ? (
              <div className="mt-6 rounded-md border border-border/70 bg-muted/50 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Development access
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Admin: <span className="font-medium text-foreground">admin@clinicflow.dev</span> /{" "}
                  <span className="font-medium text-foreground">Admin123!</span>
                  <br />
                  Staff: <span className="font-medium text-foreground">staff@clinicflow.dev</span> /{" "}
                  <span className="font-medium text-foreground">Staff123!</span>
                </p>
              </div>
            ) : null}
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Protected by secure, HttpOnly session cookies.
          </p>
        </div>
      </section>
    </div>
  );
}
