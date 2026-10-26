"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatientCreateInput, PatientUpdateInput } from "@clinic/shared";
import { patientsApi, type PatientListParams } from "@/services/api";

export const patientKeys = {
  all: ["patients"] as const,
  list: (params: PatientListParams) => ["patients", "list", params] as const,
  detail: (id: string) => ["patients", "detail", id] as const,
};

export function usePatients(
  params: PatientListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => patientsApi.list(params),
    placeholderData: (previous) => previous,
    enabled: options?.enabled ?? true,
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => patientsApi.get(id),
    enabled: Boolean(id),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientCreateInput) => patientsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: patientKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientUpdateInput) => patientsApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: patientKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patientsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: patientKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
