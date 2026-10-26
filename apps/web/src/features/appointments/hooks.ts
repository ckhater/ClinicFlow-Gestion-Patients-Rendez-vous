"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AppointmentStatusUpdateInput,
  AppointmentUpdateInput,
} from "@clinic/shared";
import {
  appointmentsApi,
  type AppointmentCreatePayload,
  type AppointmentListParams,
} from "@/services/api";

export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: AppointmentListParams) => ["appointments", "list", params] as const,
  detail: (id: string) => ["appointments", "detail", id] as const,
};

export function useAppointments(params: AppointmentListParams) {
  return useQuery({
    queryKey: appointmentKeys.list(params),
    queryFn: () => appointmentsApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AppointmentCreatePayload) => appointmentsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AppointmentUpdateInput }) =>
      appointmentsApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AppointmentStatusUpdateInput }) =>
      appointmentsApi.updateStatus(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
