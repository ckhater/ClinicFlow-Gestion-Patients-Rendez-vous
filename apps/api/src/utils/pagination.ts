import type { PaginationMeta } from "@clinic/shared";

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export function paginationSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
