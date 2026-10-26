import type { Request, Response } from "express";
import type {
  IdParam,
  UserCreateInput,
  UserListQuery,
  UserUpdateInput,
} from "@clinic/shared";
import {
  createUser,
  getUser,
  listUsers,
  softDeleteUser,
  updateUser,
} from "./user.service";

export async function listUsersController(req: Request, res: Response): Promise<void> {
  const result = await listUsers(req.validatedQuery as UserListQuery);
  res.status(200).json(result);
}

export async function getUserController(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as IdParam;
  const user = await getUser(id);
  res.status(200).json({ data: user });
}

export async function createUserController(req: Request, res: Response): Promise<void> {
  const user = await createUser(req.body as UserCreateInput);
  res.status(201).json({ data: user });
}

export async function updateUserController(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as IdParam;
  const actor = req.authUser;
  if (!actor) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }
  const user = await updateUser(id, req.body as UserUpdateInput, actor.id);
  res.status(200).json({ data: user });
}

export async function deleteUserController(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as IdParam;
  const actor = req.authUser;
  if (!actor) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }
  const result = await softDeleteUser(id, actor.id);
  res.status(200).json({ data: result });
}
