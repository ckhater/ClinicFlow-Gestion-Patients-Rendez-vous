"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LoginInput, UserPublic } from "@clinic/shared";
import { authApi } from "@/services/api";
import { resetCsrfToken } from "@/lib/api-client";

interface AuthContextValue {
  user: UserPublic | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<UserPublic>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const handledUnauthorized = useRef(false);

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => {
      handledUnauthorized.current = false;
      queryClient.setQueryData(["auth", "me"], user);
    },
  });

  const login = useCallback(
    async (input: LoginInput) => loginMutation.mutateAsync(input),
    [loginMutation],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Clearing local state is still correct if the server session already expired.
    } finally {
      resetCsrfToken();
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
      router.replace("/login");
    }
  }, [queryClient, router]);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (pathname === "/login" || handledUnauthorized.current) return;
      handledUnauthorized.current = true;
      queryClient.setQueryData(["auth", "me"], null);
      toast.error("Your session has expired. Please sign in again.");
      router.replace("/login");
    };

    window.addEventListener("clinic:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("clinic:unauthorized", handleUnauthorized);
  }, [pathname, queryClient, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data),
      login,
      logout,
    }),
    [login, logout, meQuery.data, meQuery.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
