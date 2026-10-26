import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  type UserCreateInput,
  type UserListQuery,
  type UserUpdateInput,
} from "@clinic/shared";
import { prisma } from "../../lib/prisma";
import { conflict, forbidden, notFound, unprocessable } from "../../utils/errors";
import { buildPaginationMeta, paginationSkip } from "../../utils/pagination";
import { userPublicSelect } from "../../utils/selectors";
import { serializeUser } from "../../utils/serializers";

const BCRYPT_COST = 12;

function userOrderBy(query: UserListQuery): Prisma.UserOrderByWithRelationInput {
  switch (query.sortBy) {
    case "fullName":
      return { fullName: query.sortOrder };
    case "role":
      return { role: query.sortOrder };
    case "createdAt":
    default:
      return { createdAt: query.sortOrder };
  }
}

async function assertEmailAvailable(email: string, excludeId?: string): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: {
      email,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw conflict("A user with this email already exists");
  }
}

async function countActiveAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: "admin", deletedAt: null } });
}

export async function listUsers(query: UserListQuery) {
  const search = query.search?.trim();
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(query.role ? { role: query.role } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: userPublicSelect,
      orderBy: userOrderBy(query),
      skip: paginationSkip(query.page, query.limit),
      take: query.limit,
    }),
  ]);

  return {
    data: users.map(serializeUser),
    pagination: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getUser(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: userPublicSelect,
  });

  if (!user) {
    throw notFound("User not found");
  }

  return serializeUser(user);
}

export async function createUser(input: UserCreateInput) {
  await assertEmailAvailable(input.email);

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: input.role,
    },
    select: userPublicSelect,
  });

  return serializeUser(user);
}

export async function updateUser(
  id: string,
  input: UserUpdateInput,
  actorId: string,
) {
  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, role: true, email: true },
  });

  if (!existing) {
    throw notFound("User not found");
  }

  if (input.role !== undefined && input.role !== existing.role) {
    if (id === actorId) {
      throw forbidden("You cannot change your own role");
    }
    if (existing.role === "admin" && input.role === "staff") {
      const admins = await countActiveAdmins();
      if (admins <= 1) {
        throw unprocessable("The last active administrator cannot be demoted");
      }
    }
  }

  if (input.email && input.email !== existing.email) {
    await assertEmailAvailable(input.email, id);
  }

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, BCRYPT_COST)
    : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: userPublicSelect,
  });

  return serializeUser(user);
}

export async function softDeleteUser(id: string, actorId: string) {
  if (id === actorId) {
    throw unprocessable("You cannot deactivate your own account");
  }

  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, role: true },
  });

  if (!existing) {
    throw notFound("User not found");
  }

  if (existing.role === "admin") {
    const admins = await countActiveAdmins();
    if (admins <= 1) {
      throw unprocessable("The last active administrator cannot be deactivated");
    }
  }

  const deletedAt = new Date();
  await prisma.user.update({
    where: { id },
    data: { deletedAt },
  });

  return { id, deletedAt: deletedAt.toISOString() };
}
