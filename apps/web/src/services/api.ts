import type {
  AppointmentStatusUpdateInput,
  AppointmentUpdateInput,
  AppointmentWithRelations,
  DashboardStats,
  ItemResponse,
  LoginInput,
  PaginatedResponse,
  Patient,
  PatientCreateInput,
  PatientDetail,
  PatientUpdateInput,
  UserCreateInput,
  UserPublic,
  UserUpdateInput,
  DeleteResponse,
} from "@clinic/shared";
import { apiFetch, buildQuery } from "@/lib/api-client";

export const authApi = {
  async login(input: LoginInput): Promise<UserPublic> {
    const response = await apiFetch<ItemResponse<UserPublic>>("/auth/login", {
      method: "POST",
      body: input,
    });
    return response.data;
  },
  async me(): Promise<UserPublic> {
    const response = await apiFetch<ItemResponse<UserPublic>>("/auth/me");
    return response.data;
  },
  async logout(): Promise<void> {
    await apiFetch<null>("/auth/logout", { method: "POST" });
  },
};

export interface PatientListParams {
  search?: string;
  page: number;
  limit: number;
  sortBy?: "fullName" | "createdAt" | "birthDate";
  sortOrder?: "asc" | "desc";
}

export const patientsApi = {
  list(params: PatientListParams): Promise<PaginatedResponse<Patient>> {
    return apiFetch<PaginatedResponse<Patient>>(`/patients${buildQuery({ ...params })}`);
  },
  get(id: string): Promise<PatientDetail> {
    return apiFetch<ItemResponse<PatientDetail>>(`/patients/${id}`).then((response) => response.data);
  },
  create(input: PatientCreateInput): Promise<Patient> {
    return apiFetch<ItemResponse<Patient>>("/patients", { method: "POST", body: input }).then(
      (response) => response.data,
    );
  },
  update(id: string, input: PatientUpdateInput): Promise<Patient> {
    return apiFetch<ItemResponse<Patient>>(`/patients/${id}`, {
      method: "PUT",
      body: input,
    }).then((response) => response.data);
  },
  delete(id: string): Promise<DeleteResponse["data"]> {
    return apiFetch<DeleteResponse>(`/patients/${id}`, { method: "DELETE" }).then(
      (response) => response.data,
    );
  },
};

export interface AppointmentListParams {
  date?: string;
  status?: "pending" | "confirmed" | "cancelled";
  search?: string;
  page: number;
  limit: number;
}

export interface AppointmentCreatePayload {
  patientId: string;
  appointmentDate: string;
  reason?: string | null;
  notes?: string | null;
}

export const appointmentsApi = {
  list(params: AppointmentListParams): Promise<PaginatedResponse<AppointmentWithRelations>> {
    return apiFetch<PaginatedResponse<AppointmentWithRelations>>(
      `/appointments${buildQuery({ ...params })}`,
    );
  },
  get(id: string): Promise<AppointmentWithRelations> {
    return apiFetch<ItemResponse<AppointmentWithRelations>>(`/appointments/${id}`).then(
      (response) => response.data,
    );
  },
  create(input: AppointmentCreatePayload): Promise<AppointmentWithRelations> {
    return apiFetch<ItemResponse<AppointmentWithRelations>>("/appointments", {
      method: "POST",
      body: input,
    }).then((response) => response.data);
  },
  update(
    id: string,
    input: AppointmentUpdateInput,
  ): Promise<AppointmentWithRelations> {
    return apiFetch<ItemResponse<AppointmentWithRelations>>(`/appointments/${id}`, {
      method: "PUT",
      body: input,
    }).then((response) => response.data);
  },
  updateStatus(
    id: string,
    input: AppointmentStatusUpdateInput,
  ): Promise<AppointmentWithRelations> {
    return apiFetch<ItemResponse<AppointmentWithRelations>>(`/appointments/${id}/status`, {
      method: "PATCH",
      body: input,
    }).then((response) => response.data);
  },
  delete(id: string): Promise<DeleteResponse["data"]> {
    return apiFetch<DeleteResponse>(`/appointments/${id}`, { method: "DELETE" }).then(
      (response) => response.data,
    );
  },
};

export const dashboardApi = {
  stats(): Promise<DashboardStats> {
    return apiFetch<ItemResponse<DashboardStats>>("/dashboard/stats").then(
      (response) => response.data,
    );
  },
};

export interface UserListParams {
  search?: string;
  role?: "admin" | "staff";
  page: number;
  limit: number;
}

export const usersApi = {
  list(params: UserListParams): Promise<PaginatedResponse<UserPublic>> {
    return apiFetch<PaginatedResponse<UserPublic>>(`/users${buildQuery({ ...params })}`);
  },
  get(id: string): Promise<UserPublic> {
    return apiFetch<ItemResponse<UserPublic>>(`/users/${id}`).then((response) => response.data);
  },
  create(input: UserCreateInput): Promise<UserPublic> {
    return apiFetch<ItemResponse<UserPublic>>("/users", { method: "POST", body: input }).then(
      (response) => response.data,
    );
  },
  update(id: string, input: UserUpdateInput): Promise<UserPublic> {
    return apiFetch<ItemResponse<UserPublic>>(`/users/${id}`, {
      method: "PATCH",
      body: input,
    }).then((response) => response.data);
  },
  delete(id: string): Promise<DeleteResponse["data"]> {
    return apiFetch<DeleteResponse>(`/users/${id}`, { method: "DELETE" }).then(
      (response) => response.data,
    );
  },
};
