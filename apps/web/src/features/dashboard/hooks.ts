"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/services/api";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardApi.stats,
    staleTime: 15_000,
  });
}
